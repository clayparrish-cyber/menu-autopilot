// POST /api/cron/send-scheduled-emails
// Called by cron job to process scheduled email sends
// Protected by CRON_SECRET environment variable

import { NextRequest, NextResponse } from "next/server";
import { processScheduledEmails } from "@/lib/email/scheduler";

export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Cron not configured" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const result = await processScheduledEmails();

    console.log(
      `[Cron] Scheduled emails processed: ${result.accountsProcessed} accounts, ${result.emailsSent} emails sent`
    );

    if (result.errors.length > 0) {
      console.error("[Cron] Errors:", result.errors);
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[Cron] Failed to process scheduled emails:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Also support GET for Vercel Cron (it uses GET by default)
export async function GET(req: NextRequest) {
  return POST(req);
}
