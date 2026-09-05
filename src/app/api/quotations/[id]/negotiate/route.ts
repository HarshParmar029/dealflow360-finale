import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PrismaClient, QuoteStatus, Role } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const schema = z.object({
  message: z.string().min(1),
  counterPct: z.number().min(1).max(50),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!quotation) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    if (quotation.customer.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { message, counterPct } = parsed.data;
    await prisma.$transaction([
      prisma.negotiationComment.create({
        data: { quotationId: id, authorRole: Role.CUSTOMER, message, counterPct },
      }),
      prisma.quotation.update({
        where: { id },
        data: { status: QuoteStatus.UNDER_NEGOTIATION },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Counter offer submitted. Sales team will review." });
  } catch (error) {
    console.error("Negotiate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
