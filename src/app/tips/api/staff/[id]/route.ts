// PATCH /tips/api/staff/[id] - Update staff member
// DELETE /tips/api/staff/[id] - Deactivate staff member
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTipAuth, requireRole } from "@/lib/tips/auth";
import { audit } from "@/lib/tips/audit";
import { z } from "zod";
import { StaffRoleType } from "@prisma/client";

const updateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  roleType: z.nativeEnum(StaffRoleType).optional(),
  isActive: z.boolean().optional(),
  locationIds: z.array(z.string()).optional(), // Update all locations
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTipAuth();
    requireRole(ctx, ["ADMIN"]);

    const { id } = await params;
    const body = await req.json();
    const data = updateStaffSchema.parse(body);

    // Verify staff belongs to org
    const existing = await prisma.tipStaff.findFirst({
      where: {
        id,
        location: { organizationId: ctx.organization.id },
      },
      include: {
        locations: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // If updating locations, verify they all belong to org
    if (data.locationIds && data.locationIds.length > 0) {
      const locations = await prisma.tipLocation.findMany({
        where: {
          id: { in: data.locationIds },
          organizationId: ctx.organization.id,
        },
      });

      if (locations.length !== data.locationIds.length) {
        return NextResponse.json({ error: "One or more locations not found" }, { status: 404 });
      }

      // Update primary location to first in array, manage additional via StaffLocation
      const [primaryLocationId, ...additionalLocationIds] = data.locationIds;

      // Delete existing additional locations and recreate
      await prisma.staffLocation.deleteMany({
        where: { staffId: id },
      });

      // Create new additional locations
      if (additionalLocationIds.length > 0) {
        await prisma.staffLocation.createMany({
          data: additionalLocationIds.map((locId) => ({
            staffId: id,
            locationId: locId,
          })),
        });
      }

      // Update staff with new primary location
      await prisma.tipStaff.update({
        where: { id },
        data: { locationId: primaryLocationId },
      });
    }

    const staff = await prisma.tipStaff.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.roleType !== undefined && { roleType: data.roleType }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
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
      ].filter((loc, idx, arr) => arr.findIndex((l) => l.id === loc.id) === idx),
    };

    await audit.update("TipStaff", staff.id, {
      changes: data,
      previous: {
        name: existing.name,
        roleType: existing.roleType,
        isActive: existing.isActive,
      },
    }, { userId: ctx.user.id });

    return NextResponse.json({ staff: staffWithLocations });
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
    console.error("Update staff error:", error);
    return NextResponse.json({ error: "Failed to update staff" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTipAuth();
    requireRole(ctx, ["ADMIN"]);

    const { id } = await params;

    // Verify staff belongs to org
    const existing = await prisma.tipStaff.findFirst({
      where: {
        id,
        location: { organizationId: ctx.organization.id },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // Soft delete by setting isActive = false
    await prisma.tipStaff.update({
      where: { id },
      data: { isActive: false },
    });

    await audit.update("TipStaff", id, {
      action: "deactivated",
      name: existing.name,
    }, { userId: ctx.user.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    console.error("Delete staff error:", error);
    return NextResponse.json({ error: "Failed to delete staff" }, { status: 500 });
  }
}
