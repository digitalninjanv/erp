import { NextRequest, NextResponse } from "next/server";
import { PosService } from "@/modules/pos/pos.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, paymentMethod, shiftId, customerId, locationId, cashTendered, qrisReferenceNumber, idempotencyKey, userId } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, error: "Keranjang belanja tidak boleh kosong" }, { status: 400 });
    }

    const result = await PosService.checkoutSale({
      shiftId,
      customerId,
      locationId: locationId || "loc_store",
      items,
      paymentMethod: paymentMethod || "cash",
      cashTendered: cashTendered ? parseFloat(cashTendered) : undefined,
      qrisReferenceNumber,
      idempotencyKey,
      createdBy: userId || "usr_kasir1",
    });

    return NextResponse.json({
      success: true,
      isDuplicate: result.isDuplicate,
      data: result.data,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
