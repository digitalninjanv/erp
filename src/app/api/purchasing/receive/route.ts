import { NextRequest, NextResponse } from "next/server";
import { PurchasingService } from "@/modules/purchasing/purchasing.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { poId, supplierId, locationId, items, notes, userId } = body;

    if (!supplierId || !items || items.length === 0) {
      return NextResponse.json({ success: false, error: "Supplier dan barang masuk wajib diisi" }, { status: 400 });
    }

    const result = await PurchasingService.receiveGoods({
      poId,
      supplierId,
      locationId: locationId || "loc_wh",
      items,
      notes,
      receivedBy: userId || "usr_gudang1",
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
