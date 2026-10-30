import { NextRequest, NextResponse } from "next/server";
import { InventoryService } from "@/modules/inventory/inventory.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const barcode = searchParams.get("barcode");
    const query = searchParams.get("query") || "";
    const locationId = searchParams.get("locationId") || "loc_store";

    if (barcode) {
      const product = await InventoryService.getProductByBarcode(barcode, locationId);
      return NextResponse.json({ success: true, data: product });
    }

    const result = await InventoryService.searchProducts({
      query,
      isActive: true,
      limit: 25,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
