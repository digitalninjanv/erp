import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/database";
import * as s from "@/shared/database/schema";
import { eq, and, sql } from "drizzle-orm";
import { InventoryService } from "@/modules/inventory/inventory.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const locationId = searchParams.get("locationId");

    if (productId && searchParams.get("view") === "card") {
      const card = await InventoryService.getStockCard(productId, locationId || undefined);
      return NextResponse.json({ success: true, data: card });
    }

    // List stock balances with product details
    const conditions = [];
    if (locationId) conditions.push(eq(s.stockBalances.locationId, locationId));
    if (productId) conditions.push(eq(s.stockBalances.productId, productId));

    const rows = await db
      .select({
        balanceId: s.stockBalances.id,
        productId: s.stockBalances.productId,
        sku: s.products.sku,
        productName: s.products.name,
        costPrice: s.products.costPrice,
        sellingPrice: s.products.sellingPrice,
        locationId: s.stockBalances.locationId,
        locationName: s.locations.name,
        qty: s.stockBalances.qty,
        totalValuation: sql<string>`(${s.stockBalances.qty} * ${s.products.costPrice})::numeric(14,2)`,
      })
      .from(s.stockBalances)
      .innerJoin(s.products, eq(s.stockBalances.productId, s.products.id))
      .innerJoin(s.locations, eq(s.stockBalances.locationId, s.locations.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(100);

    return NextResponse.json({ success: true, data: rows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
