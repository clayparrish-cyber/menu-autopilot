import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuth, handleApiError, errorResponse } from "@/lib/api";

export async function GET() {
  try {
    const auth = await getAuth();
    if (auth instanceof NextResponse) return auth;

    const account = await prisma.account.findUnique({
      where: { id: auth.accountId },
      select: {
        subscriptionTier: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        stripeCurrentPeriodEnd: true,
      },
    });

    if (!account) {
      return errorResponse("Account not found", 404);
    }

    return NextResponse.json({
      subscriptionTier: account.subscriptionTier,
      stripeCustomerId: account.stripeCustomerId,
      stripeSubscriptionId: account.stripeSubscriptionId,
      currentPeriodEnd: account.stripeCurrentPeriodEnd?.toISOString() || null,
    });
  } catch (error) {
    return handleApiError(error, "Billing fetch error");
  }
}
