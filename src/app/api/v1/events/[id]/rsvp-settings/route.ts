import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { rsvpSettings, events } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFoundError, validationError } from "@/lib/api/api-errors";

export const GET = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const eventId = parseInt(params.id, 10);
    if (isNaN(eventId)) throw validationError("Invalid event ID.", "id");

    const [event] = await db.select({ id: events.id }).from(events)
      .where(and(eq(events.id, eventId), eq(events.organizationId, session.organizationId))).limit(1);
    if (!event) throw notFoundError("Event", params.id);

    const [settings] = await db.select().from(rsvpSettings)
      .where(eq(rsvpSettings.eventId, eventId)).limit(1);

    return { data: settings ? { object: "rsvp_settings", ...settings } : null };
  },
  { scope: "guests:read" }
);

export const PATCH = withApiAuth(
  async (request: NextRequest, { session, params }) => {
    const eventId = parseInt(params.id, 10);
    if (isNaN(eventId)) throw validationError("Invalid event ID.", "id");

    const [event] = await db.select({ id: events.id }).from(events)
      .where(and(eq(events.id, eventId), eq(events.organizationId, session.organizationId))).limit(1);
    if (!event) throw notFoundError("Event", params.id);

    const body = await request.json();
    const [existing] = await db.select({ id: rsvpSettings.id }).from(rsvpSettings)
      .where(eq(rsvpSettings.eventId, eventId)).limit(1);

    const updateData: Record<string, unknown> = {};
    if (body.deadline !== undefined) updateData.deadline = body.deadline ? new Date(body.deadline) : null;
    if (body.allow_plus_one !== undefined) updateData.allowPlusOne = body.allow_plus_one;
    if (body.allow_dietary_notes !== undefined) updateData.allowDietaryNotes = body.allow_dietary_notes;
    if (body.custom_message !== undefined) updateData.customMessage = body.custom_message;
    if (body.max_guests_per_invitation !== undefined) updateData.maxGuestsPerInvitation = body.max_guests_per_invitation;

    let settings;
    if (existing) {
      [settings] = await db.update(rsvpSettings).set({ ...updateData, updatedAt: new Date() })
        .where(eq(rsvpSettings.id, existing.id)).returning();
    } else {
      [settings] = await db.insert(rsvpSettings).values({
        eventId,
        ...updateData,
      }).returning();
    }

    return { data: { object: "rsvp_settings", ...settings } };
  },
  { scope: "guests:write", idempotent: true }
);
