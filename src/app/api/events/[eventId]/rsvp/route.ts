import { NextRequest } from "next/server";
import { db } from "@/db";
import {
  events,
  rsvpSettings,
  rsvpItinerary,
  rsvpHotels,
  rsvpNearbyPlans,
  rsvpFaqs,
  guests,
  rsvpResponses,
  guestCompanions,
  rsvpTransportBookings,
  rsvpTransportOptions
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireEventSectionAccess, requireFeature } from "@/lib/session";
import { apiHandler, ok, notFound } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ eventId: string }> };

// GET /api/events/[eventId]/rsvp - Get all RSVP data for an event
export async function GET(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "rsvp", "view");

    // Get event with cover image
    const eventData = await db
      .select({
        id: events.id,
        name: events.name,
        coverImage: events.coverImage,
        date: events.date,
        location: events.location,
      })
      .from(events)
      .where(eq(events.id, eventIdNum))
      .limit(1);

    if (eventData.length === 0) {
      return notFound("Event not found");
    }

    // Get settings
    const settings = await db
      .select()
      .from(rsvpSettings)
      .where(eq(rsvpSettings.eventId, eventIdNum))
      .limit(1);

    // Get itinerary
    const itinerary = await db
      .select()
      .from(rsvpItinerary)
      .where(eq(rsvpItinerary.eventId, eventIdNum))
      .orderBy(rsvpItinerary.orderIndex);

    // Get hotels
    const hotels = await db
      .select()
      .from(rsvpHotels)
      .where(eq(rsvpHotels.eventId, eventIdNum))
      .orderBy(rsvpHotels.orderIndex);

    // Get nearby plans
    const nearbyPlans = await db
      .select()
      .from(rsvpNearbyPlans)
      .where(eq(rsvpNearbyPlans.eventId, eventIdNum))
      .orderBy(rsvpNearbyPlans.orderIndex);

    // Get FAQs
    const faqs = await db
      .select()
      .from(rsvpFaqs)
      .where(eq(rsvpFaqs.eventId, eventIdNum))
      .orderBy(rsvpFaqs.orderIndex);

    // Get RSVP statistics
    const [guestStats] = await db
      .select({
        totalGuests: sql<number>`count(distinct ${guests.id})`,
        confirmed: sql<number>`count(distinct ${guests.id}) filter (where ${rsvpResponses.status} = 'confirmed')`,
        declined: sql<number>`count(distinct ${guests.id}) filter (where ${rsvpResponses.status} = 'declined')`,
        pending: sql<number>`count(distinct ${guests.id}) filter (where ${rsvpResponses.status} = 'pending' or ${rsvpResponses.status} is null)`,
      })
      .from(guests)
      .leftJoin(rsvpResponses, eq(guests.id, rsvpResponses.guestId))
      .where(eq(guests.eventId, eventIdNum));

    // Get companion count
    const [companionStats] = await db
      .select({
        totalCompanions: sql<number>`count(*)`,
      })
      .from(guestCompanions)
      .innerJoin(guests, eq(guestCompanions.guestId, guests.id))
      .where(eq(guests.eventId, eventIdNum));

    // Get transport bookings
    const transportStats = await db
      .select({
        optionId: rsvpTransportOptions.id,
        optionName: rsvpTransportOptions.name,
        capacity: rsvpTransportOptions.capacity,
        bookedSeats: sql<number>`COALESCE(SUM(${rsvpTransportBookings.seats}), 0)`,
      })
      .from(rsvpTransportOptions)
      .leftJoin(rsvpTransportBookings, eq(rsvpTransportOptions.id, rsvpTransportBookings.transportOptionId))
      .where(eq(rsvpTransportOptions.eventId, eventIdNum))
      .groupBy(rsvpTransportOptions.id, rsvpTransportOptions.name, rsvpTransportOptions.capacity);

    const stats = {
      totalGuests: Number(guestStats?.totalGuests) || 0,
      confirmed: Number(guestStats?.confirmed) || 0,
      declined: Number(guestStats?.declined) || 0,
      pending: Number(guestStats?.pending) || 0,
      totalCompanions: Number(companionStats?.totalCompanions) || 0,
      totalAttending: (Number(guestStats?.confirmed) || 0) + (Number(companionStats?.totalCompanions) || 0),
      transport: transportStats.map(t => ({
        name: t.optionName,
        capacity: t.capacity,
        booked: Number(t.bookedSeats) || 0,
        available: t.capacity ? t.capacity - (Number(t.bookedSeats) || 0) : null,
      })),
    };

    return ok({
      event: eventData[0],
      settings: settings[0] || null,
      itinerary,
      hotels,
      nearbyPlans,
      faqs,
      stats,
    });
  }, "GET /api/events/[eventId]/rsvp");
}

// PUT /api/events/[eventId]/rsvp - Update RSVP settings
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireFeature("rsvp");
    await requireEventSectionAccess(eventIdNum, "rsvp", "edit");
    const body = await request.json();

    const { settings: newSettings, coverImage } = body;

    // Update cover image if provided
    if (coverImage !== undefined) {
      await db
        .update(events)
        .set({ coverImage, updatedAt: new Date() })
        .where(eq(events.id, eventIdNum));
    }

    // Upsert settings
    if (newSettings) {
      const existingSettings = await db
        .select()
        .from(rsvpSettings)
        .where(eq(rsvpSettings.eventId, eventIdNum))
        .limit(1);

      if (existingSettings.length > 0) {
        await db
          .update(rsvpSettings)
          .set({ ...newSettings, updatedAt: new Date() })
          .where(eq(rsvpSettings.eventId, eventIdNum));
      } else {
        await db.insert(rsvpSettings).values({
          eventId: eventIdNum,
          ...newSettings,
        });
      }
    }

    return ok({ success: true });
  }, "PUT /api/events/[eventId]/rsvp");
}
