import { pgTable, text, timestamp, boolean, numeric } from "drizzle-orm/pg-core";

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(), // e.g. "1110", "1120", "1130", "1140", "2110", "2120", "4100", "5100", "6100"
  name: text("name").notNull(),
  type: text("type").notNull(), // "asset", "liability", "equity", "revenue", "expense"
  normalBalance: text("normal_balance").notNull(), // "debit", "credit"
  isSystem: boolean("is_system").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const journalEntries = pgTable("journal_entries", {
  id: text("id").primaryKey(),
  entryNumber: text("entry_number").notNull().unique(),
  entryDate: timestamp("entry_date", { withTimezone: true }).notNull(),
  postingDate: timestamp("posting_date", { withTimezone: true }).defaultNow().notNull(),
  refType: text("ref_type").notNull(), // "pos_sale", "goods_receipt", "supplier_invoice", "supplier_payment", "sales_return", "stock_adjustment", "bank_transfer", "expense", "payroll", "manual"
  refId: text("ref_id").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull(), // "draft", "posted", "reversed"
  totalDebit: numeric("total_debit", { precision: 14, scale: 2 }).notNull(),
  totalCredit: numeric("total_credit", { precision: 14, scale: 2 }).notNull(),
  createdBy: text("created_by"),
  postedBy: text("posted_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const journalLines = pgTable("journal_lines", {
  id: text("id").primaryKey(),
  journalEntryId: text("journal_entry_id").notNull().references(() => journalEntries.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull().references(() => accounts.id),
  debit: numeric("debit", { precision: 14, scale: 2 }).default("0").notNull(),
  credit: numeric("credit", { precision: 14, scale: 2 }).default("0").notNull(),
  description: text("description"),
});

export const bankAccounts = pgTable("bank_accounts", {
  id: text("id").primaryKey(),
  accountNumber: text("account_number").notNull(),
  bankName: text("bank_name").notNull(),
  accountHolder: text("account_holder").notNull(),
  glAccountId: text("gl_account_id").notNull().references(() => accounts.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bankTransfers = pgTable("bank_transfers", {
  id: text("id").primaryKey(),
  transferNumber: text("transfer_number").notNull().unique(),
  fromBankAccountId: text("from_bank_account_id").notNull().references(() => bankAccounts.id),
  toBankAccountId: text("to_bank_account_id").notNull().references(() => bankAccounts.id),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  adminFee: numeric("admin_fee", { precision: 14, scale: 2 }).default("0").notNull(),
  netAmount: numeric("net_amount", { precision: 14, scale: 2 }).notNull(),
  transferDate: timestamp("transfer_date", { withTimezone: true }).notNull(),
  referenceNo: text("reference_no"),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: text("id").primaryKey(),
  expenseNumber: text("expense_number").notNull().unique(),
  expenseDate: timestamp("expense_date", { withTimezone: true }).notNull(),
  expenseAccountId: text("expense_account_id").notNull().references(() => accounts.id),
  paidFromAccountId: text("paid_from_account_id").notNull().references(() => accounts.id),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  payee: text("payee").notNull(),
  description: text("description").notNull(),
  receiptAttachmentUrl: text("receipt_attachment_url"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const taxRules = pgTable("tax_rules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ratePercent: numeric("rate_percent", { precision: 5, scale: 2 }).notNull(), // e.g. 11.00 for PPN 11%
  isInclusive: boolean("is_inclusive").default(false).notNull(),
  glAccountId: text("gl_account_id").references(() => accounts.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const postingRulesConfig = pgTable("posting_rules_config", {
  id: text("id").primaryKey(),
  eventKey: text("event_key").notNull().unique(), // "pos_cash_sale", "pos_qris_sale", "pos_credit_sale", "cogs_inventory", "goods_receipt_grni", "supplier_invoice_ap", "supplier_payment", "bank_fee"
  description: text("description").notNull(),
  defaultDebitAccountId: text("default_debit_account_id").notNull().references(() => accounts.id),
  defaultCreditAccountId: text("default_credit_account_id").notNull().references(() => accounts.id),
});
