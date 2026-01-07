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
  locationIds: z.array(z.string()).optional(), // Additional locations
  roleType: z.nativeEnum(StaffRoleType).default("SERVER"),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTipAuth();

    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId");

    // Find staff that either have the location as primary OR in their locations list
    const staff = await prisma.tipStaff.findMany({
      where: {
        location: { organizationId: ctx.organization.id },
        ...(locationId
          ? {
              OR: [
                { locationId },
                { locations: { some: { locationId } } },
              ],
            }
          : {}),
      },
      include: {
        location: { select: { id: true, name: true } },
        locations: {
          include: { location: { select: { id: true, name: true } } },
        },
        user: { select: { id: true, email: true } },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    // Transform to flatten locations array
    const staffWithLocations = staff.map((s) => ({
      ...s,
      allLocations: [
        s.location,
        ...s.locations.map((sl) => sl.location),
      ].filter((loc, idx, arr) => arr.findIndex((l) => l.id === loc.id) === idx),
    }));

    return NextResponse.json({ staff: staffWithLocations });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("List staff error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to list staff", details: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTipAuth();
    requireRole(ctx, ["ADMIN"]);

    const body = await req.json();
    const data = createStaffSchema.parse(body);

    // Verify all locations belong to org
    const allLocationIds = [data.locationId, ...(data.locationIds || [])];
    const uniqueLocationIds = [...new Set(allLocationIds)];

    const locations = await prisma.tipLocation.findMany({
      where: {
        id: { in: uniqueLocationIds },
        organizationId: ctx.organization.id,
      },
    });

    if (locations.length !== uniqueLocationIds.length) {
      return NextResponse.json({ error: "One or more locations not found" }, { status: 404 });
    }

    // Create staff with primary location and additional locations
    const additionalLocationIds = uniqueLocationIds.filter((id) => id !== data.locationId);

    const staff = await prisma.tipStaff.create({
      data: {
        name: data.name,
        roleType: data.roleType,
        locationId: data.locationId,
        ...(additionalLocationIds.length > 0 && {
          locations: {
            create: additionalLocationIds.map((locId) => ({
              locationId: locId,
            })),
          },
        }),
      },
      include: {
        location: { select: { id: true, name: true } },
        locations: {
          include: { location: { select: { id: true, name: true } } },
        },
      },
    });

    // Transform to include allLocations
    const staffWithLocations = {
      ...staff,
      allLocations: [
        staff.location,
        ...staff.locations.map((sl) => sl.location),
      ],
    };

    await audit.create("TipStaff", staff.id, {
      name: staff.name,
      roleType: staff.roleType,
      locationIds: uniqueLocationIds,
    }, { userId: ctx.user.id });

    return NextResponse.json({ staff: staffWithLocations }, { status: 201 });
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
