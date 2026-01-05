import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.accountId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await prisma.account.findUnique({
      where: { id: session.user.accountId },
      include: { locations: true },
    });

    if (!account || account.locations.length === 0) {
      return NextResponse.json({ reports: [] });
    }

    const locationIds = account.locations.map((l) => l.id);

    const reports = await prisma.report.findMany({
      where: {
        week: {
          locationId: { in: locationIds },
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
    console.error("Reports fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
