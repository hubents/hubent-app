import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFoundError, validationError } from "@/lib/api/api-errors";
import { dispatchWebhookEvent } from "@/lib/api/api-webhooks";

export const GET = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid lead ID.", "id");

    const [lead] = await db.select().from(leads)
      .where(and(eq(leads.id, id), eq(leads.organizationId, session.organizationId))).limit(1);

    if (!lead) throw notFoundError("Lead", params.id);
    return { data: { object: "lead", ...lead } };
  },
  { scope: "crm:read" }
);

export const PATCH = withApiAuth(
  async (request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid lead ID.", "id");

    const body = await request.json();
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.value !== undefined) updateData.value = body.value;
    if (body.contact_id !== undefined) updateData.contactId = body.contact_id;
    if (body.stage_id !== undefined) updateData.stageId = body.stage_id;
    if (body.source !== undefined) updateData.source = body.source;
    if (body.event_type !== undefined) updateData.eventType = body.event_type;
    if (body.event_date !== undefined) updateData.eventDate = body.event_date ? new Date(body.event_date) : null;
    if (body.guest_count !== undefined) updateData.guestCount = body.guest_count;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const [updated] = await db.update(leads).set(updateData)
      .where(and(eq(leads.id, id), eq(leads.organizationId, session.organizationId))).returning();

    if (!updated) throw notFoundError("Lead", params.id);

    void dispatchWebhookEvent(session.organizationId, "lead.updated", { ...updated }).catch(() => {});

    return { data: { object: "lead", ...updated } };
  },
  { scope: "crm:write", idempotent: true }
);

export const DELETE = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid lead ID.", "id");

    const [deleted] = await db.delete(leads)
      .where(and(eq(leads.id, id), eq(leads.organizationId, session.organizationId)))
      .returning({ id: leads.id });

    if (!deleted) throw notFoundError("Lead", params.id);

    void dispatchWebhookEvent(session.organizationId, "lead.deleted", { id: deleted.id }).catch(() => {});

    return { data: { object: "lead", id: deleted.id, deleted: true } };
  },
  { scope: "crm:write" }
);
