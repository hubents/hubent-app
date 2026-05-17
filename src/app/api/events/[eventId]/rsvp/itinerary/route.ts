import { NextRequest } from "next/server";
import { db } from "@/db";
import { rsvpItinerary } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireEventSectionAccess } from "@/lib/session";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ eventId: string }> };

// POST /api/events/[eventId]/rsvp/itinerary - Add itinerary item
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "rsvp", "edit");
    const body = await request.json();

    const { title, description, startTime, endTime, location, orderIndex } = body;

    if (!title) {
      return badRequest("Title is required");
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

    return ok(newItem[0]);
  }, "POST /api/events/[eventId]/rsvp/itinerary");
}

// PUT /api/events/[eventId]/rsvp/itinerary - Update itinerary item
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "rsvp", "edit");
    const body = await request.json();

    const { id, title, description, startTime, endTime, location, orderIndex } = body;

    if (!id) {
      return badRequest("ID is required");
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

    return ok({ success: true });
  }, "PUT /api/events/[eventId]/rsvp/itinerary");
}

// DELETE /api/events/[eventId]/rsvp/itinerary - Delete itinerary item
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "rsvp", "edit");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return badRequest("ID is required");
    }

    await db
      .delete(rsvpItinerary)
      .where(and(eq(rsvpItinerary.id, parseInt(id)), eq(rsvpItinerary.eventId, eventIdNum)));

    return ok({ success: true });
  }, "DELETE /api/events/[eventId]/rsvp/itinerary");
}
