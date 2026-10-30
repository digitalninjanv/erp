import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/modules/inventory/inventory.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fromLocationId, toLocationId, items, notes, userId } = body;

    if (!fromLocationId || !toLocationId || !items || items.length === 0) {
      return NextResponse.json({ success: false, error: "Lokasi asal, tujuan, dan barang wajib diisi" }, { status: 400 });
    }

    const result = await InventoryService.transferStock({
      fromLocationId,
      toLocationId,
      items,
      notes,
      createdBy: userId || "usr_gudang1",
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
