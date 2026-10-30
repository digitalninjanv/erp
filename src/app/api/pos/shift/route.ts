import { NextRequest, NextResponse } from "next/server";
import { PosService } from "@/modules/pos/pos.service";
import { db } from "@/shared/database";
import * as s from "@/shared/database/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "usr_kasir1";

    const [activeShift] = await db
      .select()
      .from(s.posShifts)
      .where(and(eq(s.posShifts.userId, userId), eq(s.posShifts.status, "open")))
      .limit(1);

    return NextResponse.json({ success: true, data: activeShift || null });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "open") {
      const shift = await PosService.openShift({
        userId: body.userId || "usr_kasir1",
        locationId: body.locationId || "loc_store",
        openingCash: parseFloat(body.openingCash) || 0,
        notes: body.notes,
      });
      return NextResponse.json({ success: true, data: shift });
    }

    if (action === "close") {
      const result = await PosService.closeShift({
        shiftId: body.shiftId,
        closingCashActual: parseFloat(body.closingCashActual) || 0,
        notes: body.notes,
      });
      return NextResponse.json({ success: true, data: result });
    }

    if (action === "cash_movement") {
      const movement = await PosService.recordCashMovement({
        shiftId: body.shiftId,
        movementType: body.movementType,
        amount: parseFloat(body.amount),
        reason: body.reason,
        createdBy: body.userId || "usr_kasir1",
      });
      return NextResponse.json({ success: true, data: movement });
    }

    return NextResponse.json({ success: false, error: "Aksi tidak dikenali" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
