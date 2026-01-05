// lib/email/service.ts
import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { renderWeeklyBriefEmailHtml, weeklyBriefSubject } from "./renderWeeklyBrief";
import type { WeeklyReportPayload } from "@/lib/report/types";
import { checkRateLimits } from "./rateLimit";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  logId?: string;
}

export interface AccountMember {
  id: string;
  name: string | null;
  email: string;
}

/**
 * Get all members of an account (owner + members)
 */
export async function getAccountMembers(accountId: string): Promise<AccountMember[]> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      members: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!account) return [];

  const members: AccountMember[] = [];

  // Add owner
  if (account.owner) {
    members.push({
      id: account.owner.id,
      name: account.owner.name,
      email: account.owner.email,
    });
  }

  // Add members (excluding owner if they're also in members)
  for (const member of account.members) {
    if (!members.some((m) => m.id === member.id)) {
      members.push({
        id: member.id,
        name: member.name,
        email: member.email,
      });
    }
  }

  return members;
}

/**
 * Verify all recipient IDs are members of the account
 */
export async function verifyRecipientsAreAccountMembers(
  accountId: string,
  recipientIds: string[]
): Promise<{ valid: boolean; invalidIds: string[]; emails: string[] }> {
  const members = await getAccountMembers(accountId);
  const memberIdSet = new Set(members.map((m) => m.id));

  const invalidIds: string[] = [];
  const emails: string[] = [];

  for (const id of recipientIds) {
    if (memberIdSet.has(id)) {
      const member = members.find((m) => m.id === id);
      if (member) emails.push(member.email);
    } else {
      invalidIds.push(id);
    }
  }

  return {
    valid: invalidIds.length === 0,
    invalidIds,
    emails,
  };
}

/**
 * Send report email to multiple recipients
 */
export async function sendReportEmail(
  reportId: string,
  recipientEmails: string[],
  senderId: string,
  accountId: string,
  payload: WeeklyReportPayload
): Promise<SendEmailResult> {
  // Check rate limits
  const rateLimitCheck = await checkRateLimits(accountId, reportId);
  if (!rateLimitCheck.allowed) {
    return { success: false, error: rateLimitCheck.reason };
  }

  // Create email log entry first (for tracking)
  const emailLog = await prisma.emailLog.create({
    data: {
      reportId,
      accountId,
      sentBy: senderId,
      recipients: recipientEmails,
      subject: weeklyBriefSubject(payload),
      status: "PENDING",
    },
  });

  try {
    // Render email HTML
    const html = renderWeeklyBriefEmailHtml(payload);
    const subject = weeklyBriefSubject(payload);

    // Send via Resend
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Menu Autopilot <noreply@menuautopilot.com>",
      to: recipientEmails,
      subject,
      html,
    });

    if (error) {
      // Update log with failure
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: "FAILED",
          errorMessage: error.message,
        },
      });

      return { success: false, error: error.message, logId: emailLog.id };
    }

    // Update log with success
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: "SENT",
        messageId: data?.id,
      },
    });

    // Update report's emailSentAt timestamp
    await prisma.report.update({
      where: { id: reportId },
      data: { emailSentAt: new Date() },
    });

    return { success: true, messageId: data?.id, logId: emailLog.id };
  } catch (err) {
    // Update log with failure
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: "FAILED",
        errorMessage,
      },
    });

    return { success: false, error: errorMessage, logId: emailLog.id };
  }
}
