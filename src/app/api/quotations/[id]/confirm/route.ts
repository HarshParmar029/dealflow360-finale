import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { QuoteStatus } from "@prisma/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const quotation = await prisma.quotation.findUnique({ where: { id }, include: { customer: true } });
    if (!quotation) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (quotation.customer.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (quotation.status !== QuoteStatus.APPROVED) {
      return NextResponse.json({ error: "Only approved quotations can be confirmed" }, { status: 400 });
    }
    const updated = await prisma.quotation.update({ where: { id }, data: { status: QuoteStatus.CONFIRMED } });
    return NextResponse.json({ success: true, message: "Quotation confirmed", quotation: updated });
  } catch (error) {
    console.error("Confirm quotation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
