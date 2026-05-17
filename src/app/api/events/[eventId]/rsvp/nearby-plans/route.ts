import { NextRequest } from "next/server";
import { db } from "@/db";
import { rsvpNearbyPlans } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireEventSectionAccess } from "@/lib/session";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ eventId: string }> };

// POST /api/events/[eventId]/rsvp/nearby-plans - Add nearby plan
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "rsvp", "edit");
    const body = await request.json();

    const { name, description, category, address, website, imageUrl, orderIndex } = body;

    if (!name) {
      return badRequest("Name is required");
    }

    const newItem = await db
      .insert(rsvpNearbyPlans)
      .values({
        eventId: eventIdNum,
        name,
        description: description || null,
        category: category || null,
        address: address || null,
        website: website || null,
        imageUrl: imageUrl || null,
        orderIndex: orderIndex || 0,
      })
      .returning();

    return ok(newItem[0]);
  }, "POST /api/events/[eventId]/rsvp/nearby-plans");
}

// PUT /api/events/[eventId]/rsvp/nearby-plans - Update nearby plan
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "rsvp", "edit");
    const body = await request.json();

    const { id, name, description, category, address, website, imageUrl, orderIndex } = body;

    if (!id) {
      return badRequest("ID is required");
    }

    await db
      .update(rsvpNearbyPlans)
      .set({
        name,
        description: description || null,
        category: category || null,
        address: address || null,
        website: website || null,
        imageUrl: imageUrl || null,
        orderIndex: orderIndex ?? 0,
      })
      .where(and(eq(rsvpNearbyPlans.id, id), eq(rsvpNearbyPlans.eventId, eventIdNum)));

    return ok({ success: true });
  }, "PUT /api/events/[eventId]/rsvp/nearby-plans");
}

// DELETE /api/events/[eventId]/rsvp/nearby-plans - Delete nearby plan
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
      .delete(rsvpNearbyPlans)
      .where(and(eq(rsvpNearbyPlans.id, parseInt(id)), eq(rsvpNearbyPlans.eventId, eventIdNum)));

    return ok({ success: true });
  }, "DELETE /api/events/[eventId]/rsvp/nearby-plans");
}
