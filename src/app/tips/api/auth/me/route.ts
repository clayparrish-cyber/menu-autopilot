// GET /tips/api/auth/me
// Returns current authenticated user
import { NextResponse } from "next/server";
import { getTipAuthContext } from "@/lib/tips/auth";

export async function GET() {
  try {
    const ctx = await getTipAuthContext();

    if (!ctx) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
        role: ctx.user.role,
      },
      organization: {
        id: ctx.organization.id,
        name: ctx.organization.name,
      },
      locationIds: ctx.locationIds,
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      { error: "Auth check failed" },
      { status: 500 }
    );
  }
}
