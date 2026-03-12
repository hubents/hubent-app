import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFoundError, validationError } from "@/lib/api/api-errors";
import { dispatchWebhookEvent } from "@/lib/api/api-webhooks";
import { z } from "zod";

const updateEventSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  type: z.enum(["wedding", "pre_wedding", "post_wedding", "birthday", "corporate", "social", "other"]).optional(),
  status: z.enum(["draft", "confirmed", "in_progress", "completed", "cancelled"]).optional(),
  date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  location: z.string().optional(),
  budget: z.string().optional(),
  guest_count: z.number().int().optional(),
  cover_image: z.string().optional(),
});

export const GET = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid event ID.", "id");

    const [event] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, id), eq(events.organizationId, session.organizationId)))
      .limit(1);

    if (!event) throw notFoundError("Event", params.id);

    return { data: { object: "event", ...event } };
  },
  { scope: "events:read" }
);

export const PATCH = withApiAuth(
  async (request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid event ID.", "id");

    const body = await request.json();
    const parsed = updateEventSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0].message, parsed.error.issues[0].path.join("."));
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.end_date !== undefined) updateData.endDate = new Date(data.end_date);
    if (data.location !== undefined) updateData.location = data.location;
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.guest_count !== undefined) updateData.guestCount = data.guest_count;
    if (data.cover_image !== undefined) updateData.coverImage = data.cover_image;

    const [updated] = await db
      .update(events)
      .set(updateData)
      .where(and(eq(events.id, id), eq(events.organizationId, session.organizationId)))
      .returning();

    if (!updated) throw notFoundError("Event", params.id);

    void dispatchWebhookEvent(session.organizationId, "event.updated", { id: updated.id, ...updated }).catch(() => {});
    if (data.status !== undefined) {
      void dispatchWebhookEvent(session.organizationId, "event.status_changed", { id: updated.id, status: updated.status }).catch(() => {});
    }

    return { data: { object: "event", ...updated } };
  },
  { scope: "events:write", idempotent: true }
);

export const DELETE = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid event ID.", "id");

    const [deleted] = await db
      .update(events)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(events.id, id), eq(events.organizationId, session.organizationId)))
      .returning({ id: events.id });

    if (!deleted) throw notFoundError("Event", params.id);

    void dispatchWebhookEvent(session.organizationId, "event.deleted", { id: deleted.id }).catch(() => {});

    return { data: { object: "event", id: deleted.id, deleted: true } };
  },
  { scope: "events:write" }
);
