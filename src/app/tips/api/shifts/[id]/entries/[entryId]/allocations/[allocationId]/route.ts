// DELETE /tips/api/shifts/[id]/entries/[entryId]/allocations/[allocationId]
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTipAuth } from "@/lib/tips/auth";
import { audit } from "@/lib/tips/audit";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string; allocationId: string }> }
) {
  try {
    const ctx = await requireTipAuth();
    const { id: shiftId, entryId, allocationId } = await params;

    // Verify allocation exists and entry is still pending
    const allocation = await prisma.tipAllocation.findFirst({
      where: {
        id: allocationId,
        entryId,
        entry: {
          shiftId,
          shift: {
            location: { organizationId: ctx.organization.id },
            status: { not: "CLOSED" },
          },
        },
      },
      include: { entry: true },
    });

    if (!allocation) {
      return NextResponse.json(
        { error: "Allocation not found or shift is closed" },
        { status: 404 }
      );
    }

    if (allocation.entry.status !== "PENDING") {
      return NextResponse.json(
        { error: "Cannot modify submitted entry" },
        { status: 400 }
      );
    }

    // Delete allocation and update entry totals
    await prisma.$transaction([
      prisma.tipAllocation.delete({ where: { id: allocationId } }),
      prisma.shiftEntry.update({
        where: { id: entryId },
        data: {
          actualTipOut: allocation.entry.actualTipOut - allocation.amount,
          netTips: allocation.entry.netTips + allocation.amount,
        },
      }),
    ]);

    await audit.delete(
      "TipAllocation",
      allocationId,
      {
        recipientName: allocation.recipientName,
        amount: allocation.amount,
      },
      { userId: ctx.user.id }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Delete allocation error:", error);
    return NextResponse.json(
      { error: "Failed to delete allocation" },
      { status: 500 }
    );
  }
}
