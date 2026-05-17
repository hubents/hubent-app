import { NextRequest } from "next/server";
import { db } from "@/db";
import { rsvpTransportOptions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireEventSectionAccess } from "@/lib/session";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ eventId: string }> };

// GET /api/events/[eventId]/rsvp/transport - Get transport options
export async function GET(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "rsvp", "view");

    const options = await db
      .select()
      .from(rsvpTransportOptions)
      .where(eq(rsvpTransportOptions.eventId, eventIdNum))
      .orderBy(rsvpTransportOptions.orderIndex);

    return ok(options);
  }, "GET /api/events/[eventId]/rsvp/transport");
}

// POST /api/events/[eventId]/rsvp/transport - Add transport option
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "rsvp", "edit");
    const body = await request.json();

    const {
      name,
      description,
      departureLocation,
      departureAddress,
      departureTime,
      returnTime,
      capacity,
      price,
      mapImageUrl,
      orderIndex,
    } = body;

    if (!name) {
      return badRequest("Name is required");
    }

    const newItem = await db
      .insert(rsvpTransportOptions)
      .values({
        eventId: eventIdNum,
        name,
        description: description || null,
        departureLocation: departureLocation || null,
        departureAddress: departureAddress || null,
        departureTime: departureTime || null,
        returnTime: returnTime || null,
        capacity: capacity || null,
        price: price || "0",
        mapImageUrl: mapImageUrl || null,
        orderIndex: orderIndex || 0,
      })
      .returning();

    return ok(newItem[0]);
  }, "POST /api/events/[eventId]/rsvp/transport");
}

// PUT /api/events/[eventId]/rsvp/transport - Update transport option
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "rsvp", "edit");
    const body = await request.json();

    const {
      id,
      name,
      description,
      departureLocation,
      departureAddress,
      departureTime,
      returnTime,
      capacity,
      price,
      mapImageUrl,
      isActive,
      orderIndex,
    } = body;

    if (!id) {
      return badRequest("ID is required");
    }

    await db
      .update(rsvpTransportOptions)
      .set({
        name,
        description: description || null,
        departureLocation: departureLocation || null,
        departureAddress: departureAddress || null,
        departureTime: departureTime || null,
        returnTime: returnTime || null,
        capacity: capacity || null,
        price: price || "0",
        mapImageUrl: mapImageUrl || null,
        isActive: isActive ?? true,
        orderIndex: orderIndex ?? 0,
      })
      .where(and(eq(rsvpTransportOptions.id, id), eq(rsvpTransportOptions.eventId, eventIdNum)));

    return ok({ success: true });
  }, "PUT /api/events/[eventId]/rsvp/transport");
}

// DELETE /api/events/[eventId]/rsvp/transport - Delete transport option
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
      .delete(rsvpTransportOptions)
      .where(and(eq(rsvpTransportOptions.id, parseInt(id)), eq(rsvpTransportOptions.eventId, eventIdNum)));

    return ok({ success: true });
  }, "DELETE /api/events/[eventId]/rsvp/transport");
}
