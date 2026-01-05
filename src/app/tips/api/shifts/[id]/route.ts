// GET /tips/api/shifts/[id] - Get shift detail
// PATCH /tips/api/shifts/[id] - Update shift
// DELETE /tips/api/shifts/[id] - Delete shift
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTipAuth, requireRole } from "@/lib/tips/auth";
import { audit } from "@/lib/tips/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTipAuth();
    const { id } = await params;

    const shift = await prisma.shift.findFirst({
      where: {
        id,
        location: { organizationId: ctx.organization.id },
      },
      include: {
        location: { select: { id: true, name: true } },
        entries: {
          include: {
            allocations: {
              select: {
                id: true,
                recipientName: true,
                amount: true,
                notes: true,
              },
            },
          },
          orderBy: { serverName: "asc" },
        },
      },
    });

    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    return NextResponse.json({ shift });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Get shift error:", error);
    return NextResponse.json({ error: "Failed to get shift" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTipAuth();
    requireRole(ctx, ["ADMIN", "MANAGER"]);
    const { id } = await params;

    const body = await req.json();

    // Verify shift belongs to org
    const existing = await prisma.shift.findFirst({
      where: {
        id,
        location: { organizationId: ctx.organization.id },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    const shift = await prisma.shift.update({
      where: { id },
      data: {
        shiftType: body.shiftType,
        toastTotalCCTips: body.toastTotalCCTips,
        toastTotalSales: body.toastTotalSales,
        toastTotalChecks: body.toastTotalChecks,
      },
    });

    await audit.update("Shift", shift.id, body, { userId: ctx.user.id });

    return NextResponse.json({ shift });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Manager access required" }, { status: 403 });
    }
    console.error("Update shift error:", error);
    return NextResponse.json({ error: "Failed to update shift" }, { status: 500 });
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

    // Verify shift belongs to org and is not closed
    const existing = await prisma.shift.findFirst({
      where: {
        id,
        location: { organizationId: ctx.organization.id },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    if (existing.status === "CLOSED") {
      return NextResponse.json(
        { error: "Cannot delete closed shift" },
        { status: 400 }
      );
    }

    // Delete allocations, entries, then shift
    await prisma.$transaction([
      prisma.tipAllocation.deleteMany({
        where: { entry: { shiftId: id } },
      }),
      prisma.shiftEntry.deleteMany({
        where: { shiftId: id },
      }),
      prisma.shift.delete({
        where: { id },
      }),
    ]);

    await audit.delete("Shift", id, { date: existing.shiftDate }, { userId: ctx.user.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    console.error("Delete shift error:", error);
    return NextResponse.json({ error: "Failed to delete shift" }, { status: 500 });
  }
}
