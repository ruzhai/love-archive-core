import "server-only";

import { getDb, saveDb } from "@/lib/db/index";
import { auditLog } from "@/lib/db/schema";

export interface AuditLogParams {
  userId?: number;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export async function logAction(params: AuditLogParams): Promise<void> {
  try {
    const db = await getDb();
    db.insert(auditLog).values({
      userId: params.userId ?? null,
      action: params.action,
      resourceType: params.resourceType ?? null,
      resourceId: params.resourceId ?? null,
      details: params.details ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      createdAt: params.createdAt,
    }).run();
    saveDb();
  } catch {
    // Audit logging must never break the main flow
    console.error("[audit] Failed to log action:", params.action);
  }
}
