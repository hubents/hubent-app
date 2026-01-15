import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, guests, rsvpResponses, rsvpSettings, rsvpItinerary, rsvpHotels, rsvpNearbyPlans, rsvpFaqs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notifyGuestRsvp } from "@/lib/push-notifications";

type RouteParams = { params: Promise<{ eventId: string }> };

// GET /api/rsvp/event/[eventId] - Get event info for public RSVP page
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);

    const event = await db
      .select({
        id: events.id,
        name: events.name,
        type: events.type,
        date: events.date,
        endDate: events.endDate,
        location: events.location,
        description: events.description,
        coverImage: events.coverImage,
      })
      .from(events)
      .where(eq(events.id, eventIdNum))
      .limit(1);

    if (event.length === 0) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    // Get RSVP settings
    const settings = await db
      .select()
      .from(rsvpSettings)
      .where(eq(rsvpSettings.eventId, eventIdNum))
      .limit(1);

    // Get itinerary (if enabled)
    const itinerary = await db
      .select()
      .from(rsvpItinerary)
      .where(eq(rsvpItinerary.eventId, eventIdNum))
      .orderBy(rsvpItinerary.orderIndex);

    // Get hotels (if enabled)
    const hotels = await db
      .select()
      .from(rsvpHotels)
      .where(eq(rsvpHotels.eventId, eventIdNum))
      .orderBy(rsvpHotels.orderIndex);

    // Get nearby plans (if enabled)
    const nearbyPlans = await db
      .select()
      .from(rsvpNearbyPlans)
      .where(eq(rsvpNearbyPlans.eventId, eventIdNum))
      .orderBy(rsvpNearbyPlans.orderIndex);

    // Get FAQs (if enabled)
    const faqs = await db
      .select()
      .from(rsvpFaqs)
      .where(eq(rsvpFaqs.eventId, eventIdNum))
      .orderBy(rsvpFaqs.orderIndex);

    const rsvpConfig = settings[0] || {
      showItinerary: true,
      showHotels: true,
      showNearbyPlans: true,
      showFaqs: true,
      showLocation: true,
      allowPlusOne: false,
      askDietaryRestrictions: true,
      customMessage: null,
    };

    return NextResponse.json({
      success: true,
      data: {
        ...event[0],
        settings: rsvpConfig,
        itinerary: rsvpConfig.showItinerary ? itinerary : [],
        hotels: rsvpConfig.showHotels ? hotels : [],
        nearbyPlans: rsvpConfig.showNearbyPlans ? nearbyPlans : [],
        faqs: rsvpConfig.showFaqs ? faqs : [],
      },
    });
  } catch (error) {
    console.error("Error fetching event for RSVP:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch event" },
      { status: 500 }
    );
  }
}

// POST /api/rsvp/event/[eventId] - Submit RSVP response (public)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const body = await request.json();

    const {
      firstName,
      lastName,
      email,
      phone,
      attending,
      plusOne,
      plusOneName,
      menuPreference,
      dietaryRestrictions,
      message,
    } = body;

    if (!firstName || !email || !attending) {
      return NextResponse.json(
        { success: false, error: "firstName, email, and attending are required" },
        { status: 400 }
      );
    }

    // Map attending to rsvp status
    const statusMap: Record<string, "confirmed" | "declined" | "pending"> = {
      yes: "confirmed",
      no: "declined",
      maybe: "pending",
    };

    // Check if guest already exists for this event
    const existingGuests = await db
      .select()
      .from(guests)
      .where(and(eq(guests.email, email), eq(guests.eventId, eventIdNum)))
      .limit(1);

    let guestId: number;

    if (existingGuests.length > 0) {
      // Update existing guest
      guestId = existingGuests[0].id;
      await db
        .update(guests)
        .set({
          firstName,
          lastName,
          phone,
          plusOne: plusOne || false,
          plusOneName: plusOneName || null,
          dietaryRestrictions: dietaryRestrictions || null,
          notes: [
            menuPreference ? `Menú: ${menuPreference}` : "",
            message ? `Mensaje: ${message}` : "",
          ]
            .filter(Boolean)
            .join("\n") || null,
          updatedAt: new Date(),
        })
        .where(eq(guests.id, guestId));

      // Update or create RSVP response
      const existingRsvp = await db
        .select()
        .from(rsvpResponses)
        .where(eq(rsvpResponses.guestId, guestId))
        .limit(1);

      if (existingRsvp.length > 0) {
        await db
          .update(rsvpResponses)
          .set({
            status: statusMap[attending],
            plusOneConfirmed: plusOne || false,
            message: message || null,
            respondedAt: new Date(),
          })
          .where(eq(rsvpResponses.guestId, guestId));
      } else {
        await db.insert(rsvpResponses).values({
          guestId,
          status: statusMap[attending],
          plusOneConfirmed: plusOne || false,
          message: message || null,
          respondedAt: new Date(),
        });
      }
    } else {
      // Create new guest
      const newGuest = await db
        .insert(guests)
        .values({
          eventId: eventIdNum,
          firstName,
          lastName: lastName || null,
          email,
          phone: phone || null,
          plusOne: plusOne || false,
          plusOneName: plusOneName || null,
          dietaryRestrictions: dietaryRestrictions || null,
          notes: [
            menuPreference ? `Menú: ${menuPreference}` : "",
            message ? `Mensaje: ${message}` : "",
          ]
            .filter(Boolean)
            .join("\n") || null,
        })
        .returning({ id: guests.id });
      guestId = newGuest[0].id;

      // Create RSVP response
      await db.insert(rsvpResponses).values({
        guestId,
        status: statusMap[attending],
        plusOneConfirmed: plusOne || false,
        message: message || null,
        respondedAt: new Date(),
      });
    }

    // Send push notification for RSVP response
    const eventData = await db
      .select({ name: events.name, organizationId: events.organizationId })
      .from(events)
      .where(eq(events.id, eventIdNum))
      .limit(1);

    if (eventData.length > 0) {
      const guestName = lastName ? `${firstName} ${lastName}` : firstName;
      const guestCount = plusOne ? 2 : 1;
      const response = statusMap[attending] === "confirmed" ? "confirmed" 
        : statusMap[attending] === "declined" ? "declined" 
        : "maybe";

      notifyGuestRsvp(
        eventData[0].organizationId.toString(),
        eventIdNum,
        eventData[0].name,
        guestName,
        response,
        guestCount
      ).catch(err => console.error("Push notification failed:", err));
    }

    return NextResponse.json({
      success: true,
      data: { guestId, status: statusMap[attending] },
    });
  } catch (error) {
    console.error("Error submitting RSVP:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit RSVP" },
      { status: 500 }
    );
  }
}
