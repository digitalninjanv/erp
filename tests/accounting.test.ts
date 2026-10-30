import { describe, it, expect } from "vitest";
import { AccountingService } from "../src/modules/accounting/accounting.service";

describe("Accounting & Double-Entry Invariant Tests", () => {
  it("rejects unbalanced journal entries", async () => {
    await expect(
      AccountingService.postJournalEntry({
        refType: "manual",
        refId: "TEST-UNBALANCED",
        description: "Test unbalance",
        lines: [
          { accountId: "acc_1110", debit: 50000, credit: 0 },
          { accountId: "acc_4100", debit: 0, credit: 40000 }, // diff 10.000!
        ],
      })
    ).rejects.toThrow(/Jurnal tidak seimbang/);
  });

  it("accepts and posts balanced journal entry", async () => {
    const entry = await AccountingService.postJournalEntry({
      refType: "manual",
      refId: "TEST-BALANCED",
      description: "Penyesuaian Modal Awal",
      lines: [
        { accountId: "acc_1110", debit: 100000, credit: 0 },
        { accountId: "acc_3100", debit: 0, credit: 100000 },
      ],
    });
    expect(entry).toBeDefined();
    expect(entry.status).toBe("posted");
  });

  it("verifies trial balance is balanced (grandTotalDebit === grandTotalCredit)", async () => {
    const tb = await AccountingService.getTrialBalance();
    expect(tb.isBalanced).toBe(true);
    expect(Math.abs(tb.grandTotalDebit - tb.grandTotalCredit)).toBeLessThanOrEqual(0.01);
  });

  it("executes bank transfer with admin fee correctly", async () => {
    const result = await AccountingService.transferBank({
      fromBankAccountId: "bank_bca",
      toBankAccountId: "bank_mandiri",
      amount: 500000,
      adminFee: 2500,
      notes: "Transfer dana operasional",
    });
    expect(result.transferNumber).toContain("BT-");

    // Check that trial balance remains balanced after transfer
    const tb = await AccountingService.getTrialBalance();
    expect(tb.isBalanced).toBe(true);
  });
});
