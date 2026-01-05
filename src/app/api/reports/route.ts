import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (ctx instanceof NextResponse) return ctx;

    if (ctx.locationIds.length === 0) {
      return NextResponse.json({ reports: [] });
    }

    const reports = await prisma.report.findMany({
      where: {
        week: {
          locationId: { in: ctx.locationIds },
        },
      },
      include: {
        week: true,
      },
      orderBy: {
        week: {
          weekEnd: "desc",
        },
      },
    });

    const formattedReports = reports.map((report) => ({
      id: report.id,
      weekId: report.weekId,
      weekStart: report.week.weekStart.toISOString(),
      weekEnd: report.week.weekEnd.toISOString(),
      generatedAt: report.generatedAt.toISOString(),
      summary: report.summary as {
        totalItems: number;
        stars: number;
        plowhorses: number;
        puzzles: number;
        dogs: number;
        totalRevenue: number;
        totalMargin: number;
      },
    }));

    return NextResponse.json({ reports: formattedReports });
  } catch (error) {
    return handleApiError(error, "Reports fetch error");
  }
}
