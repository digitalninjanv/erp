import { pgTable, text, timestamp, boolean, numeric } from "drizzle-orm/pg-core";

export const employees = pgTable("employees", {
  id: text("id").primaryKey(),
  employeeCode: text("employee_code").notNull().unique(),
  fullName: text("full_name").notNull(),
  idCardNumber: text("id_card_number"),
  position: text("position").notNull(), // "Kasir", "Kepala Toko", "Petugas Gudang", "Akuntan"
  department: text("department").notNull(), // "Operasional", "Logistik", "Keuangan"
  baseSalary: numeric("base_salary", { precision: 14, scale: 2 }).notNull(),
  allowances: numeric("allowances", { precision: 14, scale: 2 }).default("0").notNull(),
  joinDate: timestamp("join_date", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const payrollRuns = pgTable("payroll_runs", {
  id: text("id").primaryKey(),
  periodName: text("period_name").notNull(), // e.g. "Oktober 2026"
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  status: text("status").notNull(), // "draft", "calculated", "approved", "posted", "paid"
  totalGross: numeric("total_gross", { precision: 14, scale: 2 }).default("0").notNull(),
  totalDeductions: numeric("total_deductions", { precision: 14, scale: 2 }).default("0").notNull(),
  totalNet: numeric("total_net", { precision: 14, scale: 2 }).default("0").notNull(),
  createdBy: text("created_by"),
  approvedBy: text("approved_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const payslips = pgTable("payslips", {
  id: text("id").primaryKey(),
  payrollRunId: text("payroll_run_id").notNull().references(() => payrollRuns.id, { onDelete: "cascade" }),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  baseSalary: numeric("base_salary", { precision: 14, scale: 2 }).notNull(),
  allowances: numeric("allowances", { precision: 14, scale: 2 }).default("0").notNull(),
  deductions: numeric("deductions", { precision: 14, scale: 2 }).default("0").notNull(),
  netSalary: numeric("net_salary", { precision: 14, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
