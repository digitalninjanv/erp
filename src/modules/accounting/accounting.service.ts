import { db, withTransaction } from "../../shared/database";
import * as s from "../../shared/database/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export interface JournalLineInput {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface CreateJournalParams {
  refType: string;
  refId: string;
  description: string;
  entryDate?: Date;
  lines: JournalLineInput[];
  createdBy?: string;
  tx?: Parameters<Parameters<typeof db.transaction>[0]>[0];
}

export class AccountingService {
  /**
   * Creates and posts a balanced double-entry journal entry.
   * Throws an error if sum(debit) !== sum(credit).
   */
  static async postJournalEntry(params: CreateJournalParams) {
    const totalDebit = params.lines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0);
    const totalCredit = params.lines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0);

    // Invariant: Debit must equal Credit (allow 0.01 tolerance for tiny floating precision)
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Jurnal tidak seimbang! Total Debit: ${totalDebit.toFixed(2)}, Total Kredit: ${totalCredit.toFixed(2)}`
      );
    }

    const runner = params.tx || db;
    const entryId = `je_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const entryNumber = `JE-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const [createdEntry] = await runner
      .insert(s.journalEntries)
      .values({
        id: entryId,
        entryNumber,
        entryDate: params.entryDate || new Date(),
        postingDate: new Date(),
        refType: params.refType,
        refId: params.refId,
        description: params.description,
        status: "posted",
        totalDebit: totalDebit.toFixed(2),
        totalCredit: totalCredit.toFixed(2),
        createdBy: params.createdBy || null,
        postedBy: params.createdBy || null,
      })
      .returning();

    for (const line of params.lines) {
      await runner.insert(s.journalLines).values({
        id: `jl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        journalEntryId: entryId,
        accountId: line.accountId,
        debit: Number(line.debit).toFixed(2),
        credit: Number(line.credit).toFixed(2),
        description: line.description || params.description,
      });
    }

    return createdEntry;
  }

  /**
   * Reverses a posted journal entry by creating an opposite journal.
   */
  static async reverseJournalEntry(journalEntryId: string, reason: string, createdBy: string) {
    return await withTransaction(async (tx) => {
      const [entry] = await tx.select().from(s.journalEntries).where(eq(s.journalEntries.id, journalEntryId)).limit(1);
      if (!entry) throw new Error("Jurnal tidak ditemukan");
      if (entry.status === "reversed") throw new Error("Jurnal sudah pernah dibalik (reversed)");

      const lines = await tx.select().from(s.journalLines).where(eq(s.journalLines.journalEntryId, journalEntryId));

      // Create reversing lines: swap debit and credit
      const reversingLines: JournalLineInput[] = lines.map((l) => ({
        accountId: l.accountId,
        debit: parseFloat(l.credit),
        credit: parseFloat(l.debit),
        description: `Pembalik: ${reason} (Ref: ${entry.entryNumber})`,
      }));

      const reversal = await this.postJournalEntry({
        refType: "journal_reversal",
        refId: entry.id,
        description: `Reversal Jurnal ${entry.entryNumber}: ${reason}`,
        lines: reversingLines,
        createdBy,
        tx,
      });

      // Mark original entry as reversed
      await tx
        .update(s.journalEntries)
        .set({ status: "reversed" })
        .where(eq(s.journalEntries.id, journalEntryId));

      return reversal;
    });
  }

  /**
   * General Ledger (Buku Besar) per Account
   */
  static async getGeneralLedger(accountId: string, startDate?: Date, endDate?: Date) {
    const conditions = [eq(s.journalLines.accountId, accountId)];
    if (startDate) conditions.push(gte(s.journalEntries.entryDate, startDate));
    if (endDate) conditions.push(lte(s.journalEntries.entryDate, endDate));

    const rows = await db
      .select({
        entryId: s.journalEntries.id,
        entryNumber: s.journalEntries.entryNumber,
        entryDate: s.journalEntries.entryDate,
        description: s.journalLines.description,
        debit: s.journalLines.debit,
        credit: s.journalLines.credit,
        refType: s.journalEntries.refType,
        refId: s.journalEntries.refId,
      })
      .from(s.journalLines)
      .innerJoin(s.journalEntries, eq(s.journalLines.journalEntryId, s.journalEntries.id))
      .where(and(...conditions))
      .orderBy(s.journalEntries.entryDate);

    const [account] = await db.select().from(s.accounts).where(eq(s.accounts.id, accountId)).limit(1);

    let runningBalance = 0;
    const ledgerEntries = rows.map((r) => {
      const debit = parseFloat(r.debit);
      const credit = parseFloat(r.credit);
      if (account?.normalBalance === "debit") {
        runningBalance += debit - credit;
      } else {
        runningBalance += credit - debit;
      }
      return {
        ...r,
        debit,
        credit,
        runningBalance,
      };
    });

    return {
      account,
      endingBalance: runningBalance,
      entries: ledgerEntries,
    };
  }

  /**
   * Trial Balance (Neraca Saldo)
   */
  static async getTrialBalance() {
    const allAccounts = await db.select().from(s.accounts).where(eq(s.accounts.isActive, true));

    const sums = await db
      .select({
        accountId: s.journalLines.accountId,
        totalDebit: sql<string>`coalesce(sum(${s.journalLines.debit}), 0)`,
        totalCredit: sql<string>`coalesce(sum(${s.journalLines.credit}), 0)`,
      })
      .from(s.journalLines)
      .groupBy(s.journalLines.accountId);

    const sumMap = new Map<string, { debit: number; credit: number }>();
    sums.forEach((s) => {
      sumMap.set(s.accountId, {
        debit: parseFloat(s.totalDebit),
        credit: parseFloat(s.totalCredit),
      });
    });

    let grandTotalDebit = 0;
    let grandTotalCredit = 0;

    const rows = allAccounts.map((acc) => {
      const values = sumMap.get(acc.id) || { debit: 0, credit: 0 };
      const net = values.debit - values.credit;

      let endingDebit = 0;
      let endingCredit = 0;

      if (acc.normalBalance === "debit") {
        if (net >= 0) endingDebit = net;
        else endingCredit = Math.abs(net);
      } else {
        if (net <= 0) endingCredit = Math.abs(net);
        else endingDebit = net;
      }

      grandTotalDebit += endingDebit;
      grandTotalCredit += endingCredit;

      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        normalBalance: acc.normalBalance,
        totalDebit: values.debit,
        totalCredit: values.credit,
        endingDebit,
        endingCredit,
      };
    });

    return {
      rows,
      grandTotalDebit,
      grandTotalCredit,
      isBalanced: Math.abs(grandTotalDebit - grandTotalCredit) < 0.01,
    };
  }

  /**
   * Profit & Loss (Laporan Laba Rugi)
   */
  static async getProfitAndLoss(startDate?: Date, endDate?: Date) {
    const tb = await this.getTrialBalance();
    const revenues = tb.rows.filter((r) => r.type === "revenue");
    const expenses = tb.rows.filter((r) => r.type === "expense");

    const totalRevenue = revenues.reduce((sum, r) => sum + (r.endingCredit - r.endingDebit), 0);
    const totalExpense = expenses.reduce((sum, r) => sum + (r.endingDebit - r.endingCredit), 0);
    const netIncome = totalRevenue - totalExpense;

    return {
      revenues,
      expenses,
      totalRevenue,
      totalExpense,
      netIncome,
    };
  }

  /**
   * Balance Sheet (Laporan Posisi Keuangan / Neraca)
   */
  static async getBalanceSheet() {
    const tb = await this.getTrialBalance();
    const pnl = await this.getProfitAndLoss();

    const assets = tb.rows.filter((r) => r.type === "asset");
    const liabilities = tb.rows.filter((r) => r.type === "liability");
    const equities = tb.rows.filter((r) => r.type === "equity");

    const totalAssets = assets.reduce((sum, r) => sum + (r.endingDebit - r.endingCredit), 0);
    const totalLiabilities = liabilities.reduce((sum, r) => sum + (r.endingCredit - r.endingDebit), 0);
    const totalEquityWithoutIncome = equities.reduce((sum, r) => sum + (r.endingCredit - r.endingDebit), 0);
    const totalEquity = totalEquityWithoutIncome + pnl.netIncome;

    return {
      assets,
      liabilities,
      equities,
      totalAssets,
      totalLiabilities,
      totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    };
  }

  /**
   * Bank Transfer between two bank accounts with administrative fee
   */
  static async transferBank(params: {
    fromBankAccountId: string;
    toBankAccountId: string;
    amount: number;
    adminFee?: number;
    referenceNo?: string;
    notes?: string;
    createdBy?: string;
  }) {
    return await withTransaction(async (tx) => {
      const [fromBank] = await tx.select().from(s.bankAccounts).where(eq(s.bankAccounts.id, params.fromBankAccountId)).limit(1);
      const [toBank] = await tx.select().from(s.bankAccounts).where(eq(s.bankAccounts.id, params.toBankAccountId)).limit(1);
      if (!fromBank || !toBank) throw new Error("Rekening bank tidak valid");

      const fee = params.adminFee || 0;
      const netAmount = params.amount - fee;
      const transferId = `bt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const transferNumber = `BT-${Date.now().toString().slice(-6)}`;

      await tx.insert(s.bankTransfers).values({
        id: transferId,
        transferNumber,
        fromBankAccountId: params.fromBankAccountId,
        toBankAccountId: params.toBankAccountId,
        amount: params.amount.toFixed(2),
        adminFee: fee.toFixed(2),
        netAmount: netAmount.toFixed(2),
        transferDate: new Date(),
        referenceNo: params.referenceNo || null,
        notes: params.notes || null,
        createdBy: params.createdBy || null,
      });

      // Post Balanced Journal
      // Dr. Bank Tujuan (net amount)
      // Dr. Beban Administrasi Bank (fee, if > 0)
      // Cr. Bank Asal (total amount)
      const lines: JournalLineInput[] = [
        {
          accountId: toBank.glAccountId,
          debit: netAmount,
          credit: 0,
          description: `Transfer masuk dari ${fromBank.bankName}`,
        },
        {
          accountId: fromBank.glAccountId,
          debit: 0,
          credit: params.amount,
          description: `Transfer keluar ke ${toBank.bankName}`,
        },
      ];

      if (fee > 0) {
        lines.push({
          accountId: "acc_6300", // Beban Administrasi Bank
          debit: fee,
          credit: 0,
          description: "Biaya administrasi transfer bank",
        });
      }

      await this.postJournalEntry({
        refType: "bank_transfer",
        refId: transferId,
        description: `Transfer Antarbank: ${fromBank.bankName} -> ${toBank.bankName} (${transferNumber})`,
        lines,
        createdBy: params.createdBy,
        tx,
      });

      return { transferId, transferNumber };
    });
  }

  /**
   * Record operational expense
   */
  static async recordExpense(params: {
    expenseAccountId: string;
    paidFromAccountId: string;
    amount: number;
    payee: string;
    description: string;
    createdBy?: string;
  }) {
    return await withTransaction(async (tx) => {
      const expenseId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const expenseNumber = `EXP-${Date.now().toString().slice(-6)}`;

      await tx.insert(s.expenses).values({
        id: expenseId,
        expenseNumber,
        expenseDate: new Date(),
        expenseAccountId: params.expenseAccountId,
        paidFromAccountId: params.paidFromAccountId,
        amount: params.amount.toFixed(2),
        payee: params.payee,
        description: params.description,
        createdBy: params.createdBy || null,
      });

      // Balanced Double-Entry Journal:
      // Dr. Akun Beban
      // Cr. Akun Kas / Bank
      await this.postJournalEntry({
        refType: "expense",
        refId: expenseId,
        description: `Beban Operasional: ${params.description} (${params.payee})`,
        lines: [
          { accountId: params.expenseAccountId, debit: params.amount, credit: 0 },
          { accountId: params.paidFromAccountId, debit: 0, credit: params.amount },
        ],
        createdBy: params.createdBy,
        tx,
      });

      return { expenseId, expenseNumber };
    });
  }
}
