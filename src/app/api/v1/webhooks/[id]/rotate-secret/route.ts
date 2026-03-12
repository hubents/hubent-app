import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { rotateWebhookSecret } from "@/lib/api/api-webhooks";
import { notFoundError, validationError } from "@/lib/api/api-errors";

export const POST = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid webhook ID.", "id");

    const result = await rotateWebhookSecret(id, session.organizationId);
    if (!result) throw notFoundError("Webhook", params.id);

    return {
      data: {
        object: "webhook",
        ...result.webhook,
        secret: result.secret,
        message: "Secret rotated. Save the new secret — it won't be shown again.",
      },
    };
  },
  { scope: "webhooks:manage", idempotent: true, requiredFeature: "webhooks" }
);
