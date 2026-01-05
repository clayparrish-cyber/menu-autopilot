// GET /tips/api/shifts - List shifts
// POST /tips/api/shifts - Create shift with entries
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTipAuth, requireRole, isManager } from "@/lib/tips/auth";
import { audit } from "@/lib/tips/audit";
import { z } from "zod";
import { ShiftType } from "@prisma/client";

const shiftEntrySchema = z.object({
  serverName: z.string().min(1),
  grossSales: z.number().default(0),
  ccTips: z.number().default(0),
  cashTips: z.number().default(0),
  checkCount: z.number().optional(),
});

const createShiftSchema = z.object({
  locationId: z.string().min(1),
  shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shiftType: z.nativeEnum(ShiftType).default("DINNER"),
  toastTotalCCTips: z.number().optional(),
  toastTotalSales: z.number().optional(),
  toastTotalChecks: z.number().optional(),
  entries: z.array(shiftEntrySchema).min(1, "At least one server entry required"),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTipAuth();

    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId");
    const status = searchParams.get("status");

    // Build where clause based on user role
    const where: Record<string, unknown> = {
      location: { organizationId: ctx.organization.id },
    };

    if (locationId) where.locationId = locationId;
    if (status) where.status = status;

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        location: { select: { id: true, name: true } },
        entries: {
          select: {
            id: true,
            serverName: true,
            totalTips: true,
            actualTipOut: true,
            netTips: true,
            status: true,
          },
        },
      },
      orderBy: { shiftDate: "desc" },
      take: 50,
    });

    return NextResponse.json({ shifts });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("List shifts error:", error);
    return NextResponse.json({ error: "Failed to list shifts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTipAuth();
    requireRole(ctx, ["ADMIN", "MANAGER"]);

    const body = await req.json();
    const data = createShiftSchema.parse(body);

    // Verify location belongs to org
    const location = await prisma.tipLocation.findFirst({
      where: {
        id: data.locationId,
        organizationId: ctx.organization.id,
      },
      include: {
        staff: { where: { isActive: true } },
      },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // Create staff lookup for matching
    const staffLookup = new Map(
      location.staff.map((s) => [s.name.toLowerCase(), s.id])
    );

    // Calculate totals from entries
    let totalCCTips = 0;
    let totalCashTips = 0;
    let totalSales = 0;

    for (const entry of data.entries) {
      totalCCTips += entry.ccTips;
      totalCashTips += entry.cashTips;
      totalSales += entry.grossSales;
    }

    // Create shift with entries
    const shift = await prisma.shift.create({
      data: {
        shiftDate: new Date(data.shiftDate),
        shiftType: data.shiftType,
        locationId: data.locationId,
        toastTotalCCTips: data.toastTotalCCTips,
        toastTotalSales: data.toastTotalSales,
        toastTotalChecks: data.toastTotalChecks,
        totalCCTips,
        totalCashTips,
        totalSales,
        entries: {
          create: data.entries.map((entry) => ({
            serverName: entry.serverName,
            grossSales: entry.grossSales,
            ccTips: entry.ccTips,
            cashTips: entry.cashTips,
            checkCount: entry.checkCount,
            totalTips: entry.ccTips + entry.cashTips,
            // Try to link to existing staff
            staffId: staffLookup.get(entry.serverName.toLowerCase()),
          })),
        },
      },
      include: {
        location: { select: { id: true, name: true } },
        entries: true,
      },
    });

    await audit.create("Shift", shift.id, {
      date: data.shiftDate,
      type: data.shiftType,
      locationId: data.locationId,
      entryCount: data.entries.length,
    }, { userId: ctx.user.id });

    return NextResponse.json({ shift }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Manager access required" }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.issues }, { status: 400 });
    }
    // Handle duplicate shift
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "A shift already exists for this date and type" }, { status: 409 });
    }
    console.error("Create shift error:", error);
    return NextResponse.json({ error: "Failed to create shift" }, { status: 500 });
  }
}
