import { NextRequest, NextResponse } from "next/server";
import { PosService } from "@/modules/pos/pos.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { saleId, items, reason, refundMethod, userId } = body;

    if (!saleId || !items || items.length === 0) {
      return NextResponse.json({ success: false, error: "Data retur tidak lengkap" }, { status: 400 });
    }

    const result = await PosService.returnSale({
      saleId,
      items,
      reason: reason || "Retur pelanggan",
      refundMethod: refundMethod || "cash",
      createdBy: userId || "usr_kasir1",
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
