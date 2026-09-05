import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PrismaClient, QuoteStatus, ApprovalAction } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const actionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "RETURN"]),
  reason: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !["MANAGER", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = actionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { action, reason } = parsed.data;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    if (quotation.status !== QuoteStatus.PENDING_MANAGER) {
      return NextResponse.json(
        { error: "Quotation is not pending approval" },
        { status: 400 }
      );
    }

    let newStatus: QuoteStatus;
    if (action === "APPROVE") newStatus = QuoteStatus.APPROVED;
    else if (action === "REJECT") newStatus = QuoteStatus.REJECTED;
    else newStatus = QuoteStatus.DRAFT; // RETURN

    // Update quotation + create approval log
    const updated = await prisma.$transaction([
      prisma.quotation.update({
        where: { id },
        data: { status: newStatus },
      }),
      prisma.approvalLog.create({
        data: {
          quotationId: id,
          approverId: session.user.id,
          action: action as ApprovalAction,
          reason: reason || null,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      status: newStatus,
      message: `Quotation ${action.toLowerCase()}d successfully`,
    });
  } catch (error) {
    console.error("Approval error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
