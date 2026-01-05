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
    });

    if (!existing) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
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
      },
    });

    await audit.update("TipStaff", staff.id, {
      changes: data,
      previous: {
        name: existing.name,
        roleType: existing.roleType,
        isActive: existing.isActive,
      },
    }, { userId: ctx.user.id });

    return NextResponse.json({ staff });
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
