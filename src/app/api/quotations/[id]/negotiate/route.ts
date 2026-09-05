import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { QuoteStatus, Role } from "@prisma/client";
import { z } from "zod";

const negotiationSchema = z.object({
  counterPct: z.number().min(0).max(100),
  message: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const parsed = negotiationSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Valid counterPct (0-100) required" }, { status: 400 });
    }

    const { id } = await params;
    const { counterPct, message } = parsed.data;
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        lines: { include: { product: true } },
      },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    if (session.user.role === Role.CUSTOMER && quotation.customer.userId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized for this quotation" }, { status: 403 });
    }

    const limits = await prisma.categoryDiscountLimit.findMany();
    const limitMap = new Map(limits.map((limit) => [limit.category, limit.maxDiscountPct]));
    let blendedRiskScore = 0;
    let newTotal = 0;

    for (const line of quotation.lines) {
      const limit = limitMap.get(line.product.category) ?? 0;
      const over = counterPct - limit;
      if (over > 0) blendedRiskScore += over;
      newTotal += line.unitPrice * line.qty * (1 - counterPct / 100);
    }

    const newStatus = blendedRiskScore > 0 ? QuoteStatus.PENDING_MANAGER : QuoteStatus.CONFIRMED;
    const updated = await prisma.$transaction(async (transaction) => {
      for (const line of quotation.lines) {
        await transaction.quotationLine.update({
          where: { id: line.id },
          data: {
            discountPct: counterPct,
            lineTotal: Number((line.unitPrice * line.qty * (1 - counterPct / 100)).toFixed(2)),
          },
        });
      }

      const updatedQuotation = await transaction.quotation.update({
        where: { id },
        data: {
          status: newStatus,
          blendedRiskScore: Number(blendedRiskScore.toFixed(2)),
          totalAmount: Number(newTotal.toFixed(2)),
        },
      });

      await transaction.negotiationComment.create({
        data: {
          quotationId: id,
          authorRole: session.user.role as Role,
          message: message || `Countered with ${counterPct}% discount`,
          counterPct,
        },
      });

      return updatedQuotation;
    });

    return NextResponse.json({
      message: newStatus === QuoteStatus.PENDING_MANAGER
        ? "Counter-offer exceeds limits - automatically sent back for manager approval"
        : "Counter-offer accepted",
      quotation: updated,
    });
  } catch (error) {
    console.error("Negotiate error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
