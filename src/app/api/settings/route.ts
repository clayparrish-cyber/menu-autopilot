import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuth, handleApiError, errorResponse } from "@/lib/api";
import { z } from "zod";

export async function GET() {
  try {
    const auth = await getAuth();
    if (auth instanceof NextResponse) return auth;

    const account = await prisma.account.findUnique({
      where: { id: auth.accountId },
      select: {
        targetFoodCostPct: true,
        minQtyThreshold: true,
        popularityThreshold: true,
        marginThreshold: true,
        allowPremiumPricing: true,
        emailScheduleEnabled: true,
        emailScheduleDay: true,
        emailScheduleHour: true,
      },
    });

    if (!account) {
      return errorResponse("Account not found", 404);
    }

    return NextResponse.json(account);
  } catch (error) {
    return handleApiError(error, "Settings fetch error");
  }
}

const settingsSchema = z.object({
  targetFoodCostPct: z.number().min(1).max(100),
  minQtyThreshold: z.number().min(1),
  popularityThreshold: z.number().min(1).max(99),
  marginThreshold: z.number().min(1).max(99),
  allowPremiumPricing: z.boolean(),
  emailScheduleEnabled: z.boolean(),
  emailScheduleDay: z.number().min(1).max(7),
  emailScheduleHour: z.number().min(0).max(23),
});

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const data = settingsSchema.parse(body);

    await prisma.account.update({
      where: { id: auth.accountId },
      data,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    return handleApiError(error, "Settings update error");
  }
}
