import { NextResponse } from "next/server";
import { AccountingService } from "@/modules/accounting/accounting.service";

export async function GET() {
  try {
    const data = await AccountingService.getBalanceSheet();
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
