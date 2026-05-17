import { NextRequest } from "next/server";
import { db } from "@/db";
import { rsvpHotels } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireEventSectionAccess } from "@/lib/session";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ eventId: string }> };

// POST /api/events/[eventId]/rsvp/hotels - Add hotel
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "rsvp", "edit");
    const body = await request.json();

    const { name, description, address, phone, website, priceRange, distance, imageUrl, orderIndex } = body;

    if (!name) {
      return badRequest("Name is required");
    }

    const newItem = await db
      .insert(rsvpHotels)
      .values({
        eventId: eventIdNum,
        name,
        description: description || null,
        address: address || null,
        phone: phone || null,
        website: website || null,
        priceRange: priceRange || null,
        distance: distance || null,
        imageUrl: imageUrl || null,
        orderIndex: orderIndex || 0,
      })
      .returning();

    return ok(newItem[0]);
  }, "POST /api/events/[eventId]/rsvp/hotels");
}

// PUT /api/events/[eventId]/rsvp/hotels - Update hotel
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "rsvp", "edit");
    const body = await request.json();

    const { id, name, description, address, phone, website, priceRange, distance, imageUrl, orderIndex } = body;

    if (!id) {
      return badRequest("ID is required");
    }

    await db
      .update(rsvpHotels)
      .set({
        name,
        description: description || null,
        address: address || null,
        phone: phone || null,
        website: website || null,
        priceRange: priceRange || null,
        distance: distance || null,
        imageUrl: imageUrl || null,
        orderIndex: orderIndex ?? 0,
      })
      .where(and(eq(rsvpHotels.id, id), eq(rsvpHotels.eventId, eventIdNum)));

    return ok({ success: true });
  }, "PUT /api/events/[eventId]/rsvp/hotels");
}

// DELETE /api/events/[eventId]/rsvp/hotels - Delete hotel
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
      .delete(rsvpHotels)
      .where(and(eq(rsvpHotels.id, parseInt(id)), eq(rsvpHotels.eventId, eventIdNum)));

    return ok({ success: true });
  }, "DELETE /api/events/[eventId]/rsvp/hotels");
}
