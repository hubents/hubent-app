import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { forms } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFoundError, validationError } from "@/lib/api/api-errors";
import { dispatchWebhookEvent } from "@/lib/api/api-webhooks";

export const GET = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid form ID.", "id");

    const [form] = await db.select().from(forms)
      .where(and(eq(forms.id, id), eq(forms.organizationId, session.organizationId))).limit(1);

    if (!form) throw notFoundError("Form", params.id);
    return { data: { object: "form", ...form } };
  },
  { scope: "forms:read" }
);

export const PATCH = withApiAuth(
  async (request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid form ID.", "id");

    const body = await request.json();
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.primary_color !== undefined) updateData.primaryColor = body.primary_color;
    if (body.submit_button_text !== undefined) updateData.submitButtonText = body.submit_button_text;
    if (body.thank_you_title !== undefined) updateData.thankYouTitle = body.thank_you_title;
    if (body.thank_you_message !== undefined) updateData.thankYouMessage = body.thank_you_message;
    if (body.redirect_url !== undefined) updateData.redirectUrl = body.redirect_url;
    if (body.notify_on_response !== undefined) updateData.notifyOnResponse = body.notify_on_response;
    if (body.notify_email !== undefined) updateData.notifyEmail = body.notify_email;
    if (body.gdpr_enabled !== undefined) updateData.gdprEnabled = body.gdpr_enabled;

    const [updated] = await db.update(forms).set(updateData)
      .where(and(eq(forms.id, id), eq(forms.organizationId, session.organizationId))).returning();

    if (!updated) throw notFoundError("Form", params.id);

    void dispatchWebhookEvent(session.organizationId, "form.updated", { ...updated }).catch(() => {});

    return { data: { object: "form", ...updated } };
  },
  { scope: "forms:write", idempotent: true }
);
