import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { 
  events, 
  rsvpSettings, 
  rsvpItinerary, 
  rsvpHotels, 
  rsvpNearbyPlans, 
  rsvpFaqs 
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

type RouteParams = { params: Promise<{ eventId: string }> };

// GET /api/events/[eventId]/rsvp - Get all RSVP data for an event
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);

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
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
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

    return NextResponse.json({
      success: true,
      data: {
        event: eventData[0],
        settings: settings[0] || null,
        itinerary,
        hotels,
        nearbyPlans,
        faqs,
      },
    });
  } catch (error) {
    console.error("Error fetching RSVP data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch RSVP data" },
      { status: 500 }
    );
  }
}

// PUT /api/events/[eventId]/rsvp - Update RSVP settings
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating RSVP settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update RSVP settings" },
      { status: 500 }
    );
  }
}
