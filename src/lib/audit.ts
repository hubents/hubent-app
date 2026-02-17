import { db } from "@/db";
import { auditLogs } from "@/db/schema";

interface AuditLogParams {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit({
  actorId,
  actorEmail,
  action,
  resource,
  resourceId,
  details,
  ipAddress,
  userAgent,
}: AuditLogParams) {
  try {
    await db.insert(auditLogs).values({
      actorId: actorId || null,
      actorEmail: actorEmail || null,
      action,
      resource,
      resourceId: resourceId || null,
      details: details || null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
