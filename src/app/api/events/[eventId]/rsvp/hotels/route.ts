import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rsvpHotels } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

type RouteParams = { params: Promise<{ eventId: string }> };

// POST /api/events/[eventId]/rsvp/hotels - Add hotel
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const body = await request.json();

    const { name, description, address, phone, website, priceRange, distance, imageUrl, orderIndex } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
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

    return NextResponse.json({ success: true, data: newItem[0] });
  } catch (error) {
    console.error("Error creating hotel:", error);
    return NextResponse.json({ success: false, error: "Failed to create hotel" }, { status: 500 });
  }
}

// PUT /api/events/[eventId]/rsvp/hotels - Update hotel
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const body = await request.json();

    const { id, name, description, address, phone, website, priceRange, distance, imageUrl, orderIndex } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating hotel:", error);
    return NextResponse.json({ success: false, error: "Failed to update hotel" }, { status: 500 });
  }
}

// DELETE /api/events/[eventId]/rsvp/hotels - Delete hotel
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
      .delete(rsvpHotels)
      .where(and(eq(rsvpHotels.id, parseInt(id)), eq(rsvpHotels.eventId, eventIdNum)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting hotel:", error);
    return NextResponse.json({ success: false, error: "Failed to delete hotel" }, { status: 500 });
  }
}
