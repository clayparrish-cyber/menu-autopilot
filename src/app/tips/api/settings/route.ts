// GET /tips/api/settings - Get organization settings
// PATCH /tips/api/settings - Update organization settings
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTipAuth, requireRole } from "@/lib/tips/auth";
import { z } from "zod";

const updateSettingsSchema = z.object({
  usesCashTips: z.boolean().optional(),
});

export async function GET() {
  try {
    const ctx = await requireTipAuth();

    const org = await prisma.tipOrganization.findUnique({
      where: { id: ctx.organization.id },
      select: {
        id: true,
        name: true,
        usesCashTips: true,
      },
    });

    return NextResponse.json({ settings: org });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Get settings error:", error);
    return NextResponse.json({ error: "Failed to get settings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireTipAuth();
    requireRole(ctx, ["ADMIN"]);

    const body = await req.json();
    const data = updateSettingsSchema.parse(body);

    const org = await prisma.tipOrganization.update({
      where: { id: ctx.organization.id },
      data: {
        ...(data.usesCashTips !== undefined && { usesCashTips: data.usesCashTips }),
      },
      select: {
        id: true,
        name: true,
        usesCashTips: true,
      },
    });

    return NextResponse.json({ settings: org });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.issues }, { status: 400 });
    }
    console.error("Update settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
