import { NextRequest, NextResponse } from "next/server";
import { AccountingService } from "@/modules/accounting/accounting.service";
import { db } from "@/shared/database";
import * as s from "@/shared/database/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const entries = await db
      .select({
        id: s.journalEntries.id,
        entryNumber: s.journalEntries.entryNumber,
        entryDate: s.journalEntries.entryDate,
        refType: s.journalEntries.refType,
        refId: s.journalEntries.refId,
        description: s.journalEntries.description,
        status: s.journalEntries.status,
        totalDebit: s.journalEntries.totalDebit,
        totalCredit: s.journalEntries.totalCredit,
      })
      .from(s.journalEntries)
      .orderBy(desc(s.journalEntries.entryDate))
      .limit(100);

    return NextResponse.json({ success: true, data: entries });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refType, refId, description, lines, userId } = body;

    if (!description || !lines || lines.length === 0) {
      return NextResponse.json({ success: false, error: "Deskripsi dan baris jurnal wajib diisi" }, { status: 400 });
    }

    const entry = await AccountingService.postJournalEntry({
      refType: refType || "manual",
      refId: refId || `manual_${Date.now()}`,
      description,
      lines,
      createdBy: userId || "usr_akuntan1",
    });

    return NextResponse.json({ success: true, data: entry });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
