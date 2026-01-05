// GET /api/account/members - Get all members of the current account
import { NextResponse } from "next/server";
import { getAuthContext, handleApiError } from "@/lib/api";
import { getAccountMembers } from "@/lib/email/service";

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (ctx instanceof NextResponse) return ctx;

    const members = await getAccountMembers(ctx.accountId);

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        name: m.name || m.email.split("@")[0],
        email: m.email,
      })),
    });
  } catch (error) {
    return handleApiError(error, "Account members fetch error");
  }
}
