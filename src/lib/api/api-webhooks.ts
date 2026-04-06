import { db } from "@/db";
import { webhooks, webhookLogs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { signWebhookPayload, generateWebhookSecret } from "./api-utils";

// ============================================
// Webhook Event Types
// ============================================

export const WEBHOOK_EVENT_TYPES = [
  "event.created",
  "event.updated",
  "event.deleted",
  "event.status_changed",
  "contact.created",
  "contact.updated",
  "contact.deleted",
  "guest.created",
  "guest.updated",
  "guest.deleted",
  "guest.checked_in",
  "guest.rsvp_responded",
  "task.created",
  "task.updated",
  "task.completed",
  "task.deleted",
  "task.shared_with_host",
  "lead.created",
  "lead.updated",
  "lead.stage_changed",
  "lead.won",
  "lead.lost",
  "lead.deleted",
  "finance.document_created",
  "finance.document_updated",
  "finance.document_status_changed",
  "finance.payment_received",
  "finance.payment_created",
  "collaboration.invited",
  "collaboration.accepted",
  "collaboration.rejected",
  "collaboration.revoked",
  "form.submission_created",
  "form.updated",
  "vendor.created",
  "vendor.updated",
  "vendor.deleted",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

// ============================================
// Webhook CRUD
// ============================================

export async function createWebhook(params: {
  organizationId: number;
  url: string;
  events: string[];
  description?: string;
  createdBy?: string;
}) {
  const secret = generateWebhookSecret();

  const [webhook] = await db.insert(webhooks).values({
    organizationId: params.organizationId,
    url: params.url,
    secret,
    events: params.events,
    description: params.description,
    createdBy: params.createdBy,
  }).returning();

  return { webhook, secret };
}

export async function listWebhooks(organizationId: number) {
  return db.select({
    id: webhooks.id,
    url: webhooks.url,
    events: webhooks.events,
    isActive: webhooks.isActive,
    description: webhooks.description,
    createdAt: webhooks.createdAt,
    updatedAt: webhooks.updatedAt,
  }).from(webhooks)
    .where(eq(webhooks.organizationId, organizationId))
    .orderBy(desc(webhooks.createdAt));
}

export async function getWebhook(id: number, organizationId: number) {
  const [webhook] = await db.select().from(webhooks)
    .where(and(eq(webhooks.id, id), eq(webhooks.organizationId, organizationId)))
    .limit(1);
  return webhook ?? null;
}

export async function updateWebhook(id: number, organizationId: number, data: {
  url?: string;
  events?: string[];
  isActive?: boolean;
  description?: string;
}) {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.url !== undefined) updateData.url = data.url;
  if (data.events !== undefined) updateData.events = data.events;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.description !== undefined) updateData.description = data.description;

  const [updated] = await db.update(webhooks).set(updateData)
    .where(and(eq(webhooks.id, id), eq(webhooks.organizationId, organizationId)))
    .returning();
  return updated ?? null;
}

export async function deleteWebhook(id: number, organizationId: number) {
  const [deleted] = await db.delete(webhooks)
    .where(and(eq(webhooks.id, id), eq(webhooks.organizationId, organizationId)))
    .returning({ id: webhooks.id });
  return !!deleted;
}

export async function rotateWebhookSecret(id: number, organizationId: number) {
  const newSecret = generateWebhookSecret();
  const [updated] = await db.update(webhooks).set({ secret: newSecret, updatedAt: new Date() })
    .where(and(eq(webhooks.id, id), eq(webhooks.organizationId, organizationId)))
    .returning();
  return updated ? { webhook: updated, secret: newSecret } : null;
}

// ============================================
// Webhook Dispatcher
// ============================================

const MAX_RETRIES = 5;
const RETRY_DELAYS = [0, 60, 300, 1800, 7200]; // seconds: 0, 1m, 5m, 30m, 2h

export async function dispatchWebhookEvent(
  organizationId: number,
  eventType: string,
  data: Record<string, unknown>
) {
  // Find all active webhooks for this org that listen to this event type
  const activeWebhooks = await db.select().from(webhooks)
    .where(and(eq(webhooks.organizationId, organizationId), eq(webhooks.isActive, true)));

  const matchingWebhooks = activeWebhooks.filter((wh) => {
    const events = wh.events as string[];
    return events.includes(eventType) || events.includes("*");
  });

  if (matchingWebhooks.length === 0) return { dispatched: 0 };

  const timestamp = Math.floor(Date.now() / 1000);
  const results: { webhookId: number; success: boolean; statusCode?: number }[] = [];

  for (const wh of matchingWebhooks) {
    const payload = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: eventType,
      created: timestamp,
      data,
      organization_id: organizationId,
    };

    const payloadStr = JSON.stringify(payload);
    const signature = signWebhookPayload(payloadStr, wh.secret);

    try {
      const response = await fetch(wh.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-HubEnts-Signature": signature,
          "X-HubEnts-Timestamp": String(timestamp),
          "X-HubEnts-Event": eventType,
          "User-Agent": "HubEnts-Webhooks/1.0",
        },
        body: payloadStr,
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      const responseBody = await response.text().catch(() => "");

      await db.insert(webhookLogs).values({
        webhookId: wh.id,
        eventType,
        payload,
        responseCode: response.status,
        responseBody: responseBody.slice(0, 1000),
        attempt: 1,
        status: response.ok ? "delivered" : "failed",
        deliveredAt: response.ok ? new Date() : null,
        nextRetryAt: response.ok ? null : getNextRetryTime(1),
      });

      results.push({ webhookId: wh.id, success: response.ok, statusCode: response.status });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      await db.insert(webhookLogs).values({
        webhookId: wh.id,
        eventType,
        payload,
        responseCode: 0,
        responseBody: errorMessage.slice(0, 1000),
        attempt: 1,
        status: "failed",
        nextRetryAt: getNextRetryTime(1),
      });

      results.push({ webhookId: wh.id, success: false });
    }
  }

  return { dispatched: matchingWebhooks.length, results };
}

function getNextRetryTime(attempt: number): Date | null {
  if (attempt >= MAX_RETRIES) return null;
  const delaySeconds = RETRY_DELAYS[attempt] ?? 7200;
  return new Date(Date.now() + delaySeconds * 1000);
}

// ============================================
// Webhook Log Queries
// ============================================

export async function getWebhookLogs(webhookId: number, limit = 25) {
  return db.select().from(webhookLogs)
    .where(eq(webhookLogs.webhookId, webhookId))
    .orderBy(desc(webhookLogs.createdAt))
    .limit(limit);
}

export async function getWebhookDeliveryStats(webhookId: number) {
  const logs = await db.select({
    status: webhookLogs.status,
  }).from(webhookLogs)
    .where(eq(webhookLogs.webhookId, webhookId));

  return {
    total: logs.length,
    delivered: logs.filter((l) => l.status === "delivered").length,
    failed: logs.filter((l) => l.status === "failed").length,
    pending: logs.filter((l) => l.status === "pending").length,
  };
}
