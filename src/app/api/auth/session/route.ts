import { NextRequest, NextResponse } from "next/server";
import { IdentityService } from "@/modules/identity/identity.service";

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("erp_session");
    let userId = "usr_admin"; // default fallback for fast development/testing

    if (sessionCookie?.value) {
      try {
        const parsed = JSON.parse(sessionCookie.value);
        if (parsed.userId) userId = parsed.userId;
      } catch {
        // ignore parse error, fallback
      }
    }

    const session = await IdentityService.buildSession(userId);
    return NextResponse.json({ success: true, data: session });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
