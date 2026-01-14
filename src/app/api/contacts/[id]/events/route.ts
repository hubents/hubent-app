import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { linkContactToEvent, unlinkContactFromEvent } from "@/lib/contacts";
import { db } from "@/db";
import { contactEvents, events } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET - List events linked to a contact
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("viewer");

    const { id } = await params;
    const contactId = parseInt(id, 10);

    const linkedEvents = await db
      .select({
        id: contactEvents.id,
        eventId: contactEvents.eventId,
        role: contactEvents.role,
        eventName: events.name,
        eventDate: events.date,
        eventStatus: events.status,
      })
      .from(contactEvents)
      .innerJoin(events, eq(contactEvents.eventId, events.id))
      .where(eq(contactEvents.contactId, contactId));

    return NextResponse.json({ success: true, data: linkedEvents });
  } catch (error) {
    console.error("Error fetching contact events:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch events" }, { status: 500 });
  }
}

// POST - Link contact to event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("planner");

    const { id } = await params;
    const contactId = parseInt(id, 10);
    const body = await request.json();
    const { eventId, role } = body;

    if (!eventId) {
      return NextResponse.json({ success: false, error: "eventId is required" }, { status: 400 });
    }

    const link = await linkContactToEvent(contactId, eventId, role);

    return NextResponse.json({ success: true, data: link });
  } catch (error) {
    console.error("Error linking contact to event:", error);
    return NextResponse.json({ success: false, error: "Failed to link contact" }, { status: 500 });
  }
}

// DELETE - Unlink contact from event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("planner");

    const { id } = await params;
    const contactId = parseInt(id, 10);
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json({ success: false, error: "eventId is required" }, { status: 400 });
    }

    await unlinkContactFromEvent(contactId, parseInt(eventId, 10));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unlinking contact from event:", error);
    return NextResponse.json({ success: false, error: "Failed to unlink contact" }, { status: 500 });
  }
}
