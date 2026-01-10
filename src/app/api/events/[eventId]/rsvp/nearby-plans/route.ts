import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rsvpNearbyPlans } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

type RouteParams = { params: Promise<{ eventId: string }> };

// POST /api/events/[eventId]/rsvp/nearby-plans - Add nearby plan
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const body = await request.json();

    const { name, description, category, address, website, imageUrl, orderIndex } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
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

    return NextResponse.json({ success: true, data: newItem[0] });
  } catch (error) {
    console.error("Error creating nearby plan:", error);
    return NextResponse.json({ success: false, error: "Failed to create nearby plan" }, { status: 500 });
  }
}

// PUT /api/events/[eventId]/rsvp/nearby-plans - Update nearby plan
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const body = await request.json();

    const { id, name, description, category, address, website, imageUrl, orderIndex } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating nearby plan:", error);
    return NextResponse.json({ success: false, error: "Failed to update nearby plan" }, { status: 500 });
  }
}

// DELETE /api/events/[eventId]/rsvp/nearby-plans - Delete nearby plan
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    await db
      .delete(rsvpNearbyPlans)
      .where(and(eq(rsvpNearbyPlans.id, parseInt(id)), eq(rsvpNearbyPlans.eventId, eventIdNum)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting nearby plan:", error);
    return NextResponse.json({ success: false, error: "Failed to delete nearby plan" }, { status: 500 });
  }
}
