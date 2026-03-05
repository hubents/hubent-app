import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rsvpItinerary } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireEventSectionAccess } from "@/lib/session";

type RouteParams = { params: Promise<{ eventId: string }> };

// POST /api/events/[eventId]/rsvp/itinerary - Add itinerary item
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "rsvp", "edit");
    const body = await request.json();

    const { title, description, startTime, endTime, location, orderIndex } = body;

    if (!title) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
    }

    const newItem = await db
      .insert(rsvpItinerary)
      .values({
        eventId: eventIdNum,
        title,
        description: description || null,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        location: location || null,
        orderIndex: orderIndex || 0,
      })
      .returning();

    return NextResponse.json({ success: true, data: newItem[0] });
  } catch (error) {
    console.error("Error creating itinerary item:", error);
    return NextResponse.json({ success: false, error: "Failed to create itinerary item" }, { status: 500 });
  }
}

// PUT /api/events/[eventId]/rsvp/itinerary - Update itinerary item
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "rsvp", "edit");
    const body = await request.json();

    const { id, title, description, startTime, endTime, location, orderIndex } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    await db
      .update(rsvpItinerary)
      .set({
        title,
        description: description || null,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        location: location || null,
        orderIndex: orderIndex ?? 0,
      })
      .where(and(eq(rsvpItinerary.id, id), eq(rsvpItinerary.eventId, eventIdNum)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating itinerary item:", error);
    return NextResponse.json({ success: false, error: "Failed to update itinerary item" }, { status: 500 });
  }
}

// DELETE /api/events/[eventId]/rsvp/itinerary - Delete itinerary item
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "rsvp", "edit");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    await db
      .delete(rsvpItinerary)
      .where(and(eq(rsvpItinerary.id, parseInt(id)), eq(rsvpItinerary.eventId, eventIdNum)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting itinerary item:", error);
    return NextResponse.json({ success: false, error: "Failed to delete itinerary item" }, { status: 500 });
  }
}
