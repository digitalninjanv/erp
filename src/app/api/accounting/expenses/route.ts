import { NextRequest, NextResponse } from "next/server";
import { AccountingService } from "@/modules/accounting/accounting.service";
import { db } from "@/shared/database";
import * as s from "@/shared/database/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const list = await db
      .select({
        id: s.expenses.id,
        expenseNumber: s.expenses.expenseNumber,
        expenseDate: s.expenses.expenseDate,
        amount: s.expenses.amount,
        payee: s.expenses.payee,
        description: s.expenses.description,
      })
      .from(s.expenses)
      .orderBy(desc(s.expenses.expenseDate));

    return NextResponse.json({ success: true, data: list });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { expenseAccountId, paidFromAccountId, amount, payee, description, userId } = body;

    if (!expenseAccountId || !paidFromAccountId || !amount || !payee || !description) {
      return NextResponse.json({ success: false, error: "Data beban operasional tidak lengkap" }, { status: 400 });
    }

    const res = await AccountingService.recordExpense({
      expenseAccountId,
      paidFromAccountId,
      amount: parseFloat(amount),
      payee,
      description,
      createdBy: userId || "usr_akuntan1",
    });

    return NextResponse.json({ success: true, data: res });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
