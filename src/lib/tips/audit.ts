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

  submit: (entityType: string, entityId: string, details?: Record<string, unknown>, ctx?: AuditContext) =>
    logAuditEvent("SUBMIT", entityType, entityId, details, ctx),

  approve: (entityType: string, entityId: string, details?: Record<string, unknown>, ctx?: AuditContext) =>
    logAuditEvent("APPROVE", entityType, entityId, details, ctx),

  close: (entityType: string, entityId: string, details?: Record<string, unknown>, ctx?: AuditContext) =>
    logAuditEvent("CLOSE", entityType, entityId, details, ctx),

  reopen: (entityType: string, entityId: string, details?: Record<string, unknown>, ctx?: AuditContext) =>
    logAuditEvent("REOPEN", entityType, entityId, details, ctx),

  override: (entityType: string, entityId: string, details?: Record<string, unknown>, ctx?: AuditContext) =>
    logAuditEvent("OVERRIDE", entityType, entityId, details, ctx),

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
