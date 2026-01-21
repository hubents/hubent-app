import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rsvpTransportOptions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

type RouteParams = { params: Promise<{ eventId: string }> };

// GET /api/events/[eventId]/rsvp/transport - Get transport options
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);

    const options = await db
      .select()
      .from(rsvpTransportOptions)
      .where(eq(rsvpTransportOptions.eventId, eventIdNum))
      .orderBy(rsvpTransportOptions.orderIndex);

    return NextResponse.json({ success: true, data: options });
  } catch (error) {
    console.error("Error fetching transport options:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch transport options" }, { status: 500 });
  }
}

// POST /api/events/[eventId]/rsvp/transport - Add transport option
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
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
      orderIndex 
    } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
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

    return NextResponse.json({ success: true, data: newItem[0] });
  } catch (error) {
    console.error("Error creating transport option:", error);
    return NextResponse.json({ success: false, error: "Failed to create transport option" }, { status: 500 });
  }
}

// PUT /api/events/[eventId]/rsvp/transport - Update transport option
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
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
      orderIndex 
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating transport option:", error);
    return NextResponse.json({ success: false, error: "Failed to update transport option" }, { status: 500 });
  }
}

// DELETE /api/events/[eventId]/rsvp/transport - Delete transport option
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
      .delete(rsvpTransportOptions)
      .where(and(eq(rsvpTransportOptions.id, parseInt(id)), eq(rsvpTransportOptions.eventId, eventIdNum)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting transport option:", error);
    return NextResponse.json({ success: false, error: "Failed to delete transport option" }, { status: 500 });
  }
}
