import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PrismaClient, QuoteStatus, ProductCategory } from "@prisma/client";
import { calculateBlendedRiskScore } from "@/lib/risk-score";
import { z } from "zod";

const prisma = new PrismaClient();

const createQuotationSchema = z.object({
  customerId: z.string().min(1),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().min(1),
        discountPct: z.number().min(0).max(100),
      })
    )
    .min(1, "At least one product is required"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["SALES_REP", "MANAGER", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createQuotationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { customerId, lines } = parsed.data;

    // Fetch customer
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Fetch products
    const productIds = lines.map((l) => l.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json({ error: "One or more products not found" }, { status: 400 });
    }

    // Build line data + calculate totals
    const lineData = lines.map((line) => {
      const product = products.find((p) => p.id === line.productId)!;
      const unitPrice = product.price;
      const lineTotal = unitPrice * line.qty * (1 - line.discountPct / 100);

      return {
        productId: line.productId,
        qty: line.qty,
        unitPrice,
        discountPct: line.discountPct,
        lineTotal: Number(lineTotal.toFixed(2)),
        category: product.category as ProductCategory,
      };
    });

    const totalAmount = lineData.reduce((sum, l) => sum + l.lineTotal, 0);

    // Calculate Blended Risk Score
    const risk = calculateBlendedRiskScore(
      lineData.map((l) => ({
        category: l.category,
        discountPct: l.discountPct,
        lineTotal: l.lineTotal,
      })),
      customer.tier
    );

    // Decide status based on risk
    let status: QuoteStatus = QuoteStatus.DRAFT;
    if (risk.needsFinanceApproval) {
      status = QuoteStatus.PENDING_MANAGER; // later can extend to finance
    } else if (risk.needsManagerApproval) {
      status = QuoteStatus.PENDING_MANAGER;
    } else {
      status = QuoteStatus.APPROVED; // auto-approved
    }

    // Create Quotation + Lines in transaction
    const quotation = await prisma.quotation.create({
      data: {
        customerId,
        repId: session.user.id,
        status,
        blendedRiskScore: risk.blendedRiskScore,
        totalAmount: Number(totalAmount.toFixed(2)),
        lines: {
          create: lineData.map((l) => ({
            productId: l.productId,
            qty: l.qty,
            unitPrice: l.unitPrice,
            discountPct: l.discountPct,
            lineTotal: l.lineTotal,
          })),
        },
      },
      include: {
        lines: {
          include: { product: true },
        },
        customer: true,
        rep: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      quotation,
      risk: {
        blendedRiskScore: risk.blendedRiskScore,
        needsManagerApproval: risk.needsManagerApproval,
        needsFinanceApproval: risk.needsFinanceApproval,
        reasons: risk.reasons,
      },
    });
  } catch (error) {
    console.error("Create quotation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET all quotations (for workspace list)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customer = session.user.role === "CUSTOMER"
      ? await prisma.customer.findUnique({ where: { userId: session.user.id } })
      : null;

    if (session.user.role === "CUSTOMER" && !customer) {
      return NextResponse.json({ quotations: [] });
    }

    const quotations = await prisma.quotation.findMany({
      where:
        session.user.role === "SALES_REP"
          ? { repId: session.user.id }
          : session.user.role === "CUSTOMER"
            ? { customerId: customer!.id }
            : {}, // Manager/Admin see all
      include: {
        customer: true,
        rep: { select: { name: true, email: true } },
        lines: { include: { product: true } },
        comments: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ quotations });
  } catch (error) {
    console.error("Get quotations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
