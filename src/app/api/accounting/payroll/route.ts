import { NextRequest, NextResponse } from "next/server";
import { PayrollService } from "@/modules/payroll/payroll.service";
import { db } from "@/shared/database";
import * as s from "@/shared/database/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const runs = await db
      .select()
      .from(s.payrollRuns)
      .orderBy(desc(s.payrollRuns.createdAt));

    return NextResponse.json({ success: true, data: runs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create_run") {
      const res = await PayrollService.createPayrollRun({
        periodName: body.periodName,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        createdBy: body.userId || "usr_admin",
      });
      return NextResponse.json({ success: true, data: res });
    }

    if (action === "approve_post") {
      const res = await PayrollService.approveAndPostPayroll(body.payrollRunId, body.userId || "usr_admin");
      return NextResponse.json({ success: true, data: res });
    }

    if (action === "pay") {
      const res = await PayrollService.payPayrollRun(body.payrollRunId, body.userId || "usr_admin");
      return NextResponse.json({ success: true, data: res });
    }

    return NextResponse.json({ success: false, error: "Aksi payroll tidak dikenali" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
