import { NextRequest, NextResponse } from "next/server";
import { IdentityService } from "@/modules/identity/identity.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ success: false, error: "Username dan password wajib diisi" }, { status: 400 });
    }

    const session = await IdentityService.login(username, password);
    if (!session) {
      return NextResponse.json({ success: false, error: "Username atau password salah" }, { status: 401 });
    }

    await IdentityService.recordAuditLog({
      userId: session.userId,
      action: "auth.login",
      module: "identity",
      resourceType: "user",
      resourceId: session.userId,
      details: { username: session.username, roles: session.roles },
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
    });

    const response = NextResponse.json({ success: true, data: session });

    // Set HTTP-only session cookie
    response.cookies.set("erp_session", JSON.stringify({ userId: session.userId }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: "Logged out" });
  response.cookies.delete("erp_session");
  return response;
}
