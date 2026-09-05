import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { lines: { include: { product: true } } },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const warehouses = await prisma.warehouse.findMany({
      include: { stocks: true },
      orderBy: { name: "asc" },
    });

    const splitResult = quotation.lines.map((line) => {
      let remaining = line.qty;
      const allocations: { warehouseName: string; qty: number }[] = [];

      for (const warehouse of warehouses) {
        if (remaining <= 0) break;
        const stock = warehouse.stocks.find((s) => s.productId === line.productId);
        const available = stock?.quantity ?? 0;
        if (available <= 0) continue;

        const takeQty = Math.min(available, remaining);
        allocations.push({ warehouseName: warehouse.name, qty: takeQty });
        remaining -= takeQty;
      }

      return {
        productName: line.product.name,
        requestedQty: line.qty,
        allocations,
        backorderQty: remaining > 0 ? remaining : 0,
      };
    });

    return NextResponse.json({ split: splitResult });
  } catch (error) {
    console.error("Warehouse split error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}