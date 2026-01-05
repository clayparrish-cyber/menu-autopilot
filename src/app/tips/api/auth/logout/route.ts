// POST /tips/api/auth/logout
import { NextRequest, NextResponse } from "next/server";
import { logoutUser, getTipAuthContext } from "@/lib/tips/auth";
import { audit } from "@/lib/tips/audit";

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTipAuthContext();

    if (ctx) {
      await audit.logout(ctx.user.id, {
        ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
        userAgent: req.headers.get("user-agent") ?? undefined,
      });
    }

    await logoutUser();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}
