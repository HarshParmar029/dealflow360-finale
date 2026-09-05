import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        rep: { select: { id: true, name: true, email: true } },
        lines: { include: { product: true } },
        comments: { orderBy: { createdAt: "desc" } },
        approvals: {
          include: { approver: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!quotation) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    if (session.user.role === "CUSTOMER" && quotation.customer.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (session.user.role === "SALES_REP" && quotation.repId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ quotation });
  } catch (error) {
    console.error("Get single quotation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
