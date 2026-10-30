import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/modules/inventory/inventory.service";
import { db } from "@/shared/database";
import * as s from "@/shared/database/schema";
import { normalizeBarcode } from "@/shared/kernel/formatting";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    const categoryId = searchParams.get("categoryId") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await InventoryService.searchProducts({
      query,
      categoryId,
      page,
      limit,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sku, name, categoryId, baseUnitId, purchasePrice, sellingPrice, minStock, brand, barcodes } = body;

    if (!sku || !name) {
      return NextResponse.json({ success: false, error: "SKU dan Nama barang wajib diisi" }, { status: 400 });
    }

    const productId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const costPrice = parseFloat(purchasePrice) || 0;

    await db.insert(s.products).values({
      id: productId,
      sku: sku.trim(),
      name: name.trim(),
      categoryId: categoryId || "cat_grocery",
      baseUnitId: baseUnitId || "unit_pcs",
      purchasePrice: costPrice.toFixed(2),
      costPrice: costPrice.toFixed(2),
      sellingPrice: (parseFloat(sellingPrice) || 0).toFixed(2),
      minStock: (parseFloat(minStock) || 0).toFixed(2),
      brand: brand || null,
      isActive: true,
    });

    if (barcodes && Array.isArray(barcodes)) {
      for (let i = 0; i < barcodes.length; i++) {
        const raw = barcodes[i];
        const normalized = normalizeBarcode(raw);
        if (normalized) {
          await db.insert(s.productBarcodes).values({
            id: `bc_${Date.now()}_${i}`,
            productId,
            barcode: normalized,
            isPrimary: i === 0,
          }).onConflictDoNothing();
        }
      }
    }

    return NextResponse.json({ success: true, data: { productId, sku, name } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
