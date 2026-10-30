import { NextRequest, NextResponse } from "next/server";
import { AccountingService } from "@/modules/accounting/accounting.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fromBankAccountId, toBankAccountId, amount, adminFee, referenceNo, notes, userId } = body;

    if (!fromBankAccountId || !toBankAccountId || !amount) {
      return NextResponse.json({ success: false, error: "Rekening asal, tujuan, dan nominal wajib diisi" }, { status: 400 });
    }

    const res = await AccountingService.transferBank({
      fromBankAccountId,
      toBankAccountId,
      amount: parseFloat(amount),
      adminFee: adminFee ? parseFloat(adminFee) : 0,
      referenceNo,
      notes,
      createdBy: userId || "usr_akuntan1",
    });

    return NextResponse.json({ success: true, data: res });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
