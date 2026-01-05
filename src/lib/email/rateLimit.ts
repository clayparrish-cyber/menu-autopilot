// lib/email/rateLimit.ts
import { prisma } from "@/lib/db";

// In-memory rate limiting for account-level limits
// For production, consider using Redis for distributed rate limiting
const accountRateLimits = new Map<string, { count: number; windowStart: number }>();

const ACCOUNT_RATE_LIMIT = 20; // max emails per hour per account
const ACCOUNT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const REPORT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours per report

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if email sending is allowed based on rate limits
 */
export async function checkRateLimits(
  accountId: string,
  reportId: string
): Promise<RateLimitResult> {
  const now = Date.now();

  // 1. Check per-report limit (1 email per report per 24 hours)
  const recentReportEmail = await prisma.emailLog.findFirst({
    where: {
      reportId,
      status: "SENT",
      sentAt: {
        gte: new Date(now - REPORT_COOLDOWN_MS),
      },
    },
    orderBy: { sentAt: "desc" },
  });

  if (recentReportEmail) {
    const nextAllowedTime = new Date(
      recentReportEmail.sentAt.getTime() + REPORT_COOLDOWN_MS
    );
    const hoursRemaining = Math.ceil(
      (nextAllowedTime.getTime() - now) / (60 * 60 * 1000)
    );
    return {
      allowed: false,
      reason: `This report was already emailed today. Try again in ${hoursRemaining} hour${hoursRemaining === 1 ? "" : "s"}.`,
    };
  }

  // 2. Check per-account rate limit (20 emails per hour)
  const accountLimit = accountRateLimits.get(accountId);

  if (accountLimit) {
    const windowAge = now - accountLimit.windowStart;

    if (windowAge < ACCOUNT_WINDOW_MS) {
      // Still within window
      if (accountLimit.count >= ACCOUNT_RATE_LIMIT) {
        const minutesRemaining = Math.ceil(
          (ACCOUNT_WINDOW_MS - windowAge) / (60 * 1000)
        );
        return {
          allowed: false,
          reason: `Rate limit exceeded. You can send ${ACCOUNT_RATE_LIMIT} emails per hour. Try again in ${minutesRemaining} minute${minutesRemaining === 1 ? "" : "s"}.`,
        };
      }
      // Increment counter
      accountLimit.count++;
    } else {
      // Window expired, reset
      accountRateLimits.set(accountId, { count: 1, windowStart: now });
    }
  } else {
    // First request for this account
    accountRateLimits.set(accountId, { count: 1, windowStart: now });
  }

  return { allowed: true };
}

/**
 * Get current rate limit status for an account
 */
export function getAccountRateLimitStatus(accountId: string): {
  remaining: number;
  resetInMs: number;
} {
  const now = Date.now();
  const accountLimit = accountRateLimits.get(accountId);

  if (!accountLimit) {
    return { remaining: ACCOUNT_RATE_LIMIT, resetInMs: 0 };
  }

  const windowAge = now - accountLimit.windowStart;

  if (windowAge >= ACCOUNT_WINDOW_MS) {
    return { remaining: ACCOUNT_RATE_LIMIT, resetInMs: 0 };
  }

  return {
    remaining: Math.max(0, ACCOUNT_RATE_LIMIT - accountLimit.count),
    resetInMs: ACCOUNT_WINDOW_MS - windowAge,
  };
}
