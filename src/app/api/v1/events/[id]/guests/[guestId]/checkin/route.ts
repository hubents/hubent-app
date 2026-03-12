import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { guests, guestCheckins, events } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { validationError, notFoundError } from "@/lib/api/api-errors";

export const POST = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const eventId = parseInt(params.id, 10);
    const guestId = parseInt(params.guestId, 10);
    if (isNaN(eventId)) throw validationError("Invalid event ID.", "id");
    if (isNaN(guestId)) throw validationError("Invalid guest ID.", "guestId");

    const [event] = await db.select({ id: events.id }).from(events)
      .where(and(eq(events.id, eventId), eq(events.organizationId, session.organizationId))).limit(1);
    if (!event) throw notFoundError("Event", String(eventId));

    const [guest] = await db.select({ id: guests.id }).from(guests)
      .where(and(eq(guests.id, guestId), eq(guests.eventId, eventId))).limit(1);
    if (!guest) throw notFoundError("Guest", String(guestId));

    const [checkin] = await db.insert(guestCheckins).values({
      guestId,
      checkedInAt: new Date(),
    }).returning();

    return { status: 201, data: { object: "checkin", ...checkin } };
  },
  { scope: "guests:write", idempotent: true }
);
