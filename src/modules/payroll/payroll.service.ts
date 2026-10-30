import { db, withTransaction } from "../../shared/database";
import * as s from "../../shared/database/schema";
import { eq } from "drizzle-orm";
import { AccountingService } from "../accounting/accounting.service";

export class PayrollService {
  /**
   * Create a new monthly payroll run and generate payslips for all active employees
   */
  static async createPayrollRun(params: {
    periodName: string;
    startDate: Date;
    endDate: Date;
    createdBy?: string;
  }) {
    return await withTransaction(async (tx) => {
      const runId = `pr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const activeEmployees = await tx
        .select()
        .from(s.employees)
        .where(eq(s.employees.isActive, true));

      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;

      const payslipRecords = activeEmployees.map((emp) => {
        const base = parseFloat(emp.baseSalary);
        const allowances = parseFloat(emp.allowances);
        const deductions = 0; // Default deductions (e.g. BPJS/PPh21 if applicable)
        const net = base + allowances - deductions;

        totalGross += base + allowances;
        totalDeductions += deductions;
        totalNet += net;

        return {
          id: `ps_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          payrollRunId: runId,
          employeeId: emp.id,
          baseSalary: base.toFixed(2),
          allowances: allowances.toFixed(2),
          deductions: deductions.toFixed(2),
          netSalary: net.toFixed(2),
        };
      });

      await tx.insert(s.payrollRuns).values({
        id: runId,
        periodName: params.periodName,
        startDate: params.startDate,
        endDate: params.endDate,
        status: "draft",
        totalGross: totalGross.toFixed(2),
        totalDeductions: totalDeductions.toFixed(2),
        totalNet: totalNet.toFixed(2),
        createdBy: params.createdBy || null,
      });

      for (const slip of payslipRecords) {
        await tx.insert(s.payslips).values(slip);
      }

      return {
        runId,
        periodName: params.periodName,
        employeeCount: activeEmployees.length,
        totalGross,
        totalNet,
      };
    });
  }

  /**
   * Approve & Post Payroll (creates expense & liability journal):
   * Dr. Beban Gaji & Upah (acc_6100)
   * Cr. Utang Gaji Karyawan (acc_2130)
   */
  static async approveAndPostPayroll(payrollRunId: string, approvedBy: string) {
    return await withTransaction(async (tx) => {
      const [run] = await tx.select().from(s.payrollRuns).where(eq(s.payrollRuns.id, payrollRunId)).limit(1);
      if (!run) throw new Error("Payroll run tidak ditemukan");
      if (run.status !== "draft") throw new Error("Payroll sudah pernah diposting");

      const totalNet = parseFloat(run.totalNet);

      await tx
        .update(s.payrollRuns)
        .set({
          status: "posted",
          approvedBy,
        })
        .where(eq(s.payrollRuns.id, payrollRunId));

      await AccountingService.postJournalEntry({
        refType: "payroll",
        refId: run.id,
        description: `Beban Penggajian Periode ${run.periodName}`,
        lines: [
          { accountId: "acc_6100", debit: totalNet, credit: 0 },
          { accountId: "acc_2130", debit: 0, credit: totalNet },
        ],
        createdBy: approvedBy,
        tx,
      });

      return { payrollRunId, status: "posted" };
    });
  }

  /**
   * Disburse/Pay Payroll from Bank Account:
   * Dr. Utang Gaji Karyawan (acc_2130)
   * Cr. Bank BCA (acc_1120)
   */
  static async payPayrollRun(payrollRunId: string, paidBy: string) {
    return await withTransaction(async (tx) => {
      const [run] = await tx.select().from(s.payrollRuns).where(eq(s.payrollRuns.id, payrollRunId)).limit(1);
      if (!run) throw new Error("Payroll run tidak ditemukan");
      if (run.status !== "posted") throw new Error("Payroll harus berstatus 'posted' sebelum dibayarkan");

      const totalNet = parseFloat(run.totalNet);

      await tx
        .update(s.payrollRuns)
        .set({ status: "paid" })
        .where(eq(s.payrollRuns.id, payrollRunId));

      await AccountingService.postJournalEntry({
        refType: "payroll_payment",
        refId: run.id,
        description: `Pembayaran Gaji Karyawan Periode ${run.periodName}`,
        lines: [
          { accountId: "acc_2130", debit: totalNet, credit: 0 },
          { accountId: "acc_1120", debit: 0, credit: totalNet },
        ],
        createdBy: paidBy,
        tx,
      });

      return { payrollRunId, status: "paid" };
    });
  }
}
