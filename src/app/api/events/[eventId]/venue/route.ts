import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { events, venueBookings, venues, venueSpaces } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { apiHandler, ok, notFound, badRequest } from "@/lib/api-handler";

type Params = { params: Promise<{ eventId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { eventId: rawId } = await params;
    const eventId = parseInt(rawId);
    if (isNaN(eventId)) return badRequest("ID inválido");

    // Verify event belongs to user's org
    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.organizationId, session.organizationId)),
      columns: { id: true, name: true },
    });
    if (!event) return notFound("Evento no encontrado");

    // Find bookings that link this event to a venue
    const eventBookings = await db
      .select()
      .from(venueBookings)
      .where(eq(venueBookings.eventId, eventId))
      .orderBy(asc(venueBookings.date));

    if (!eventBookings.length) return ok({ venue: null, spaces: [], bookings: [], eventBookings: [] });

    const venueId = eventBookings[0].venueId;

    // Get venue info (cross-tenant read — planner accessing booking provider's venue)
    const venue = await db.query.venues.findFirst({
      where: eq(venues.id, venueId),
    });
    if (!venue) return notFound("Finca no encontrada");

    // Get spaces for this venue
    const spaces = await db
      .select()
      .from(venueSpaces)
      .where(and(eq(venueSpaces.venueId, venueId), eq(venueSpaces.isActive, true)))
      .orderBy(asc(venueSpaces.name));

    // Get all bookings for this venue (to show calendar availability)
    const allBookings = await db
      .select()
      .from(venueBookings)
      .where(eq(venueBookings.venueId, venueId))
      .orderBy(asc(venueBookings.date));

    return ok({
      venue,
      spaces,
      bookings: allBookings,
      eventBookings,
    });
  }, "GET /api/events/[eventId]/venue");
}
