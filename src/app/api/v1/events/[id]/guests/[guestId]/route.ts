import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { guests, events } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { validationError, notFoundError } from "@/lib/api/api-errors";
import { dispatchWebhookEvent } from "@/lib/api/api-webhooks";
import { z } from "zod";

async function verifyEventAccess(eventId: number, orgId: number) {
  const [event] = await db.select({ id: events.id }).from(events)
    .where(and(eq(events.id, eventId), eq(events.organizationId, orgId))).limit(1);
  if (!event) throw notFoundError("Event", String(eventId));
}

const updateGuestSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  age_group: z.enum(["adult", "child", "baby"]).optional(),
  menu_preference: z.string().optional(),
  plus_one: z.boolean().optional(),
  plus_one_name: z.string().optional(),
  dietary_restrictions: z.string().optional(),
  notes: z.string().optional(),
  group_id: z.number().int().optional(),
  table_id: z.number().int().optional(),
});

export const PATCH = withApiAuth(
  async (request: NextRequest, { session, params }) => {
    const eventId = parseInt(params.id, 10);
    const guestId = parseInt(params.guestId, 10);
    if (isNaN(eventId)) throw validationError("Invalid event ID.", "id");
    if (isNaN(guestId)) throw validationError("Invalid guest ID.", "guestId");
    await verifyEventAccess(eventId, session.organizationId);

    const body = await request.json();
    const parsed = updateGuestSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.issues[0].message, parsed.error.issues[0].path.join("."));

    const d = parsed.data;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (d.first_name !== undefined) updateData.firstName = d.first_name;
    if (d.last_name !== undefined) updateData.lastName = d.last_name;
    if (d.email !== undefined) updateData.email = d.email;
    if (d.phone !== undefined) updateData.phone = d.phone;
    if (d.age_group !== undefined) updateData.ageGroup = d.age_group;
    if (d.menu_preference !== undefined) updateData.menuPreference = d.menu_preference;
    if (d.plus_one !== undefined) updateData.plusOne = d.plus_one;
    if (d.plus_one_name !== undefined) updateData.plusOneName = d.plus_one_name;
    if (d.dietary_restrictions !== undefined) updateData.dietaryRestrictions = d.dietary_restrictions;
    if (d.notes !== undefined) updateData.notes = d.notes;
    if (d.group_id !== undefined) updateData.groupId = d.group_id;
    if (d.table_id !== undefined) updateData.tableId = d.table_id;

    const [updated] = await db.update(guests).set(updateData)
      .where(and(eq(guests.id, guestId), eq(guests.eventId, eventId))).returning();

    if (!updated) throw notFoundError("Guest", params.guestId);

    void dispatchWebhookEvent(session.organizationId, "guest.updated", { id: updated.id, event_id: eventId, ...updated }).catch(() => {});

    return { data: { object: "guest", ...updated } };
  },
  { scope: "guests:write", idempotent: true }
);

export const DELETE = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const eventId = parseInt(params.id, 10);
    const guestId = parseInt(params.guestId, 10);
    if (isNaN(eventId)) throw validationError("Invalid event ID.", "id");
    if (isNaN(guestId)) throw validationError("Invalid guest ID.", "guestId");
    await verifyEventAccess(eventId, session.organizationId);

    const [deleted] = await db.delete(guests)
      .where(and(eq(guests.id, guestId), eq(guests.eventId, eventId))).returning({ id: guests.id });

    if (!deleted) throw notFoundError("Guest", params.guestId);

    void dispatchWebhookEvent(session.organizationId, "guest.deleted", { id: deleted.id, event_id: eventId }).catch(() => {});

    return { data: { object: "guest", id: deleted.id, deleted: true } };
  },
  { scope: "guests:write" }
);
