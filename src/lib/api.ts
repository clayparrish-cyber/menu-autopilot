/**
 * API utilities for route handlers
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./db";

/**
 * Authenticated session with required fields
 */
export interface AuthSession {
  userId: string;
  accountId: string;
  email: string;
}

/**
 * Auth context with account and locations
 */
export interface AuthContext extends AuthSession {
  account: {
    id: string;
    subscriptionTier: string;
    targetFoodCostPct: number | null;
  };
  locationIds: string[];
}

/**
 * Get authenticated session or return error response
 */
export async function getAuth(): Promise<AuthSession | NextResponse> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.accountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return {
    userId: session.user.id,
    accountId: session.user.accountId,
    email: session.user.email,
  };
}

/**
 * Get full auth context with account and locations
 */
export async function getAuthContext(): Promise<AuthContext | NextResponse> {
  const auth = await getAuth();
  if (auth instanceof NextResponse) return auth;

  const account = await prisma.account.findUnique({
    where: { id: auth.accountId },
    select: {
      id: true,
      subscriptionTier: true,
      targetFoodCostPct: true,
      locations: { select: { id: true } },
    },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return {
    ...auth,
    account: {
      id: account.id,
      subscriptionTier: account.subscriptionTier,
      targetFoodCostPct: account.targetFoodCostPct,
    },
    locationIds: account.locations.map((l) => l.id),
  };
}

/**
 * Check if location belongs to account
 */
export function hasLocationAccess(ctx: AuthContext, locationId: string): boolean {
  return ctx.locationIds.includes(locationId);
}

/**
 * Standard JSON error response
 */
export function errorResponse(message: string, status = 500): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown, context: string): NextResponse {
  console.error(`${context}:`, error);
  return errorResponse("Internal server error", 500);
}
