import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getAuth, handleApiError, errorResponse } from "@/lib/api";

export async function POST() {
  try {
    const auth = await getAuth();
    if (auth instanceof NextResponse) return auth;

    const account = await prisma.account.findUnique({
      where: { id: auth.accountId },
    });

    if (!account?.stripeCustomerId) {
      return errorResponse("No billing account found", 400);
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: account.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    return handleApiError(error, "Portal error");
  }
}
