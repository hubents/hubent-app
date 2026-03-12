import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { getWebhook, updateWebhook, deleteWebhook, getWebhookLogs, getWebhookDeliveryStats, WEBHOOK_EVENT_TYPES } from "@/lib/api/api-webhooks";
import { notFoundError, validationError } from "@/lib/api/api-errors";
import { z } from "zod";

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  is_active: z.boolean().optional(),
  description: z.string().optional(),
});

export const GET = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid webhook ID.", "id");

    const webhook = await getWebhook(id, session.organizationId);
    if (!webhook) throw notFoundError("Webhook", params.id);

    const logs = await getWebhookLogs(id, 10);
    const stats = await getWebhookDeliveryStats(id);

    return { data: { object: "webhook", ...webhook, delivery_stats: stats, recent_deliveries: logs } };
  },
  { scope: "webhooks:manage", requiredFeature: "webhooks" }
);

export const PATCH = withApiAuth(
  async (request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid webhook ID.", "id");

    const body = await request.json();
    const parsed = updateWebhookSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.issues[0].message, parsed.error.issues[0].path.join("."));

    const d = parsed.data;

    if (d.events) {
      const invalidEvents = d.events.filter((e) => e !== "*" && !WEBHOOK_EVENT_TYPES.includes(e as typeof WEBHOOK_EVENT_TYPES[number]));
      if (invalidEvents.length > 0) {
        throw validationError(`Invalid event types: ${invalidEvents.join(", ")}`, "events");
      }
    }

    const updated = await updateWebhook(id, session.organizationId, {
      url: d.url,
      events: d.events,
      isActive: d.is_active,
      description: d.description,
    });

    if (!updated) throw notFoundError("Webhook", params.id);
    return { data: { object: "webhook", ...updated } };
  },
  { scope: "webhooks:manage", idempotent: true, requiredFeature: "webhooks" }
);

export const DELETE = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid webhook ID.", "id");

    const deleted = await deleteWebhook(id, session.organizationId);
    if (!deleted) throw notFoundError("Webhook", params.id);

    return { data: { object: "webhook", id, deleted: true } };
  },
  { scope: "webhooks:manage", requiredFeature: "webhooks" }
);
