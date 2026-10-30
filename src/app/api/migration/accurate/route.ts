import { NextRequest, NextResponse } from "next/server";
import { AccurateMigrationService } from "@/modules/migration/accurate-migration.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, rows, mapping, jobName, fileName, userId } = body;

    if (!rows || !Array.isArray(rows) || !mapping) {
      return NextResponse.json({ success: false, error: "Data baris dan mapping wajib disertakan" }, { status: 400 });
    }

    if (action === "dry_run") {
      const result = await AccurateMigrationService.runDryRun(rows, mapping);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === "execute") {
      const result = await AccurateMigrationService.executeBatchImport({
        jobName: jobName || "Import Accurate",
        fileName: fileName || "data.xlsx",
        rows,
        mapping,
        createdBy: userId || "usr_admin",
      });
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, error: "Aksi tidak dikenali" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
