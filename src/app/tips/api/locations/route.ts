// GET /tips/api/locations - List locations
// POST /tips/api/locations - Create location
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTipAuth, requireRole } from "@/lib/tips/auth";
import { audit } from "@/lib/tips/audit";
import { z } from "zod";

const createLocationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  timezone: z.string().default("America/New_York"),
});

export async function GET() {
  try {
    const ctx = await requireTipAuth();

    const locations = await prisma.tipLocation.findMany({
      where: { organizationId: ctx.organization.id },
      include: {
        staff: {
          where: { isActive: true },
          select: { id: true, name: true, roleType: true },
        },
        _count: {
          select: { coverPageScans: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ locations });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("List locations error:", error);
    return NextResponse.json({ error: "Failed to list locations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTipAuth();
    requireRole(ctx, ["ADMIN"]);

    const body = await req.json();
    const data = createLocationSchema.parse(body);

    const location = await prisma.tipLocation.create({
      data: {
        name: data.name,
        address: data.address,
        timezone: data.timezone,
        organizationId: ctx.organization.id,
      },
    });

    await audit.create("TipLocation", location.id, {
      name: location.name,
    }, { userId: ctx.user.id });

    return NextResponse.json({ location }, { status: 201 });
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
    console.error("Create location error:", error);
    return NextResponse.json({ error: "Failed to create location" }, { status: 500 });
  }
}
