import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const productId = new URL(req.url).searchParams.get("productId");
    if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

    const rules = await prisma.upsellRule.findMany({
      where: { baseProductId: productId },
      include: { suggestedProduct: true },
      orderBy: { promoted: "desc" },
    });

    const suggestions = rules.map((rule) => {
      const product = rule.suggestedProduct;
      const margin = ((product.price - product.cost) / product.price) * 100;
      return {
        productId: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
        margin: Number(margin.toFixed(1)),
        promoted: rule.promoted,
        minMargin: rule.minMargin,
      };
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Upsell error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
