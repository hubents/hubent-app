import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { guests, rsvpResponses, guestCheckins, events } from "@/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { validationError, notFoundError } from "@/lib/api/api-errors";

export const GET = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const eventId = parseInt(params.id, 10);
    if (isNaN(eventId)) throw validationError("Invalid event ID.", "id");

    const [event] = await db.select({ id: events.id }).from(events)
      .where(and(eq(events.id, eventId), eq(events.organizationId, session.organizationId))).limit(1);
    if (!event) throw notFoundError("Event", params.id);

    const [totalGuests] = await db.select({ count: count() }).from(guests).where(eq(guests.eventId, eventId));

    const rsvpStats = await db
      .select({
        status: rsvpResponses.status,
        count: count(),
      })
      .from(rsvpResponses)
      .innerJoin(guests, eq(rsvpResponses.guestId, guests.id))
      .where(eq(guests.eventId, eventId))
      .groupBy(rsvpResponses.status);

    const [checkedIn] = await db
      .select({ count: count() })
      .from(guestCheckins)
      .innerJoin(guests, eq(guestCheckins.guestId, guests.id))
      .where(eq(guests.eventId, eventId));

    const rsvpByStatus: Record<string, number> = {};
    for (const row of rsvpStats) {
      if (row.status) rsvpByStatus[row.status] = row.count;
    }

    return {
      data: {
        object: "guest_stats",
        event_id: eventId,
        total_guests: totalGuests?.count ?? 0,
        rsvp: {
          confirmed: rsvpByStatus["confirmed"] ?? 0,
          declined: rsvpByStatus["declined"] ?? 0,
          pending: rsvpByStatus["pending"] ?? 0,
          maybe: rsvpByStatus["maybe"] ?? 0,
        },
        checked_in: checkedIn?.count ?? 0,
      },
    };
  },
  { scope: "guests:read" }
);
