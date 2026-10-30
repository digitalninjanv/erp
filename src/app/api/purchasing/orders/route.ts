import { NextRequest, NextResponse } from "next/server";
import { PurchasingService } from "@/modules/purchasing/purchasing.service";
import { db } from "@/shared/database";
import * as s from "@/shared/database/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const orders = await db
      .select({
        id: s.purchaseOrders.id,
        poNumber: s.purchaseOrders.poNumber,
        supplierId: s.purchaseOrders.supplierId,
        supplierName: s.suppliers.name,
        orderDate: s.purchaseOrders.orderDate,
        status: s.purchaseOrders.status,
        totalAmount: s.purchaseOrders.totalAmount,
        notes: s.purchaseOrders.notes,
      })
      .from(s.purchaseOrders)
      .innerJoin(s.suppliers, eq(s.purchaseOrders.supplierId, s.suppliers.id))
      .orderBy(desc(s.purchaseOrders.orderDate))
      .limit(50);

    return NextResponse.json({ success: true, data: orders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { supplierId, items, notes, userId } = body;

    if (!supplierId || !items || items.length === 0) {
      return NextResponse.json({ success: false, error: "Supplier dan barang PO wajib diisi" }, { status: 400 });
    }

    const result = await PurchasingService.createPurchaseOrder({
      supplierId,
      items,
      notes,
      createdBy: userId || "usr_admin",
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

import { eq } from "drizzle-orm";
