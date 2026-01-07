// lib/tips/audit.ts
// Audit logging for AirTip - immutable event log for compliance

import { prisma } from "../db";
import type { TipAuditAction, Prisma } from "@prisma/client";

export interface AuditContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent(
  action: TipAuditAction,
  entityType: string,
  entityId: string,
  details?: Record<string, unknown>,
  ctx?: AuditContext
): Promise<void> {
  await prisma.tipAuditLog.create({
    data: {
      action,
      entityType,
      entityId,
      details: details as Prisma.InputJsonValue | undefined,
      userId: ctx?.userId,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    },
  });
}

// Convenience functions for common actions
export const audit = {
  create: (entityType: string, entityId: string, details?: Record<string, unknown>, ctx?: AuditContext) =>
    logAuditEvent("CREATE", entityType, entityId, details, ctx),

  update: (entityType: string, entityId: string, details?: Record<string, unknown>, ctx?: AuditContext) =>
    logAuditEvent("UPDATE", entityType, entityId, details, ctx),

  delete: (entityType: string, entityId: string, details?: Record<string, unknown>, ctx?: AuditContext) =>
    logAuditEvent("DELETE", entityType, entityId, details, ctx),

  // Scan actions
  scanUpload: (scanId: string, details?: Record<string, unknown>, ctx?: AuditContext) =>
    logAuditEvent("SCAN_UPLOAD", "CoverPageScan", scanId, details, ctx),

  scanConfirm: (scanId: string, details?: Record<string, unknown>, ctx?: AuditContext) =>
    logAuditEvent("SCAN_CONFIRM", "CoverPageScan", scanId, details, ctx),

  scanEdit: (scanId: string, details?: Record<string, unknown>, ctx?: AuditContext) =>
    logAuditEvent("SCAN_EDIT", "CoverPageScan", scanId, details, ctx),

  // Pay period actions
  periodFinalize: (periodId: string, details?: Record<string, unknown>, ctx?: AuditContext) =>
    logAuditEvent("PERIOD_FINALIZE", "PayPeriod", periodId, details, ctx),

  periodExport: (periodId: string, details?: Record<string, unknown>, ctx?: AuditContext) =>
    logAuditEvent("PERIOD_EXPORT", "PayPeriod", periodId, details, ctx),

  periodReopen: (periodId: string, details?: Record<string, unknown>, ctx?: AuditContext) =>
    logAuditEvent("PERIOD_REOPEN", "PayPeriod", periodId, details, ctx),

  // Auth actions
  login: (userId: string, ctx?: AuditContext) =>
    logAuditEvent("LOGIN", "TipUser", userId, undefined, ctx),

  logout: (userId: string, ctx?: AuditContext) =>
    logAuditEvent("LOGOUT", "TipUser", userId, undefined, ctx),
};

// Get audit trail for an entity
export async function getAuditTrail(entityType: string, entityId: string) {
  return prisma.tipAuditLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}
