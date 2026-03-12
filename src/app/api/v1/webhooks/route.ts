import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { listWebhooks, createWebhook, WEBHOOK_EVENT_TYPES } from "@/lib/api/api-webhooks";
import { validationError } from "@/lib/api/api-errors";
import { z } from "zod";

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  description: z.string().optional(),
});

export const GET = withApiAuth(
  async (_request: NextRequest, { session }) => {
    const whs = await listWebhooks(session.organizationId);
    return {
      data: {
        object: "list",
        data: whs.map((w) => ({ object: "webhook", ...w })),
        available_events: WEBHOOK_EVENT_TYPES,
        url: "/api/v1/webhooks",
      },
    };
  },
  { scope: "webhooks:manage", requiredFeature: "webhooks" }
);

export const POST = withApiAuth(
  async (request: NextRequest, { session }) => {
    const body = await request.json();
    const parsed = createWebhookSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.issues[0].message, parsed.error.issues[0].path.join("."));

    const d = parsed.data;

    // Validate event types
    const invalidEvents = d.events.filter((e) => e !== "*" && !WEBHOOK_EVENT_TYPES.includes(e as typeof WEBHOOK_EVENT_TYPES[number]));
    if (invalidEvents.length > 0) {
      throw validationError(`Invalid event types: ${invalidEvents.join(", ")}`, "events");
    }

    const { webhook, secret } = await createWebhook({
      organizationId: session.organizationId,
      url: d.url,
      events: d.events,
      description: d.description,
    });

    return {
      status: 201,
      data: {
        object: "webhook",
        ...webhook,
        secret,
        message: "Webhook created. Save the secret — it won't be shown again.",
      },
    };
  },
  { scope: "webhooks:manage", idempotent: true, requiredFeature: "webhooks" }
);
