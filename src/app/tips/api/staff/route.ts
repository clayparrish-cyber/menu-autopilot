// GET /tips/api/staff - List staff (optionally by location)
// POST /tips/api/staff - Create staff member
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTipAuth, requireRole } from "@/lib/tips/auth";
import { audit } from "@/lib/tips/audit";
import { z } from "zod";
import { StaffRoleType } from "@prisma/client";

const createStaffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  locationId: z.string().min(1, "Location is required"),
  roleType: z.nativeEnum(StaffRoleType).default("SERVER"),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTipAuth();

    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId");

    const staff = await prisma.tipStaff.findMany({
      where: {
        location: { organizationId: ctx.organization.id },
        ...(locationId ? { locationId } : {}),
      },
      include: {
        location: { select: { id: true, name: true } },
        user: { select: { id: true, email: true } },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    return NextResponse.json({ staff });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("List staff error:", error);
    return NextResponse.json({ error: "Failed to list staff" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTipAuth();
    requireRole(ctx, ["ADMIN"]);

    const body = await req.json();
    const data = createStaffSchema.parse(body);

    // Verify location belongs to org
    const location = await prisma.tipLocation.findFirst({
      where: {
        id: data.locationId,
        organizationId: ctx.organization.id,
      },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const staff = await prisma.tipStaff.create({
      data: {
        name: data.name,
        roleType: data.roleType,
        locationId: data.locationId,
      },
      include: {
        location: { select: { id: true, name: true } },
      },
    });

    await audit.create("TipStaff", staff.id, {
      name: staff.name,
      roleType: staff.roleType,
      locationId: staff.locationId,
    }, { userId: ctx.user.id });

    return NextResponse.json({ staff }, { status: 201 });
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
    // Handle duplicate name
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Staff member with this name already exists at this location" }, { status: 409 });
    }
    console.error("Create staff error:", error);
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 });
  }
}
