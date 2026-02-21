import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { inviteCollaboratorContact } from "@/lib/invitations";
import { db } from "@/db";
import { eventParticipants, events } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// GET - List events linked to a contact (reads from unified event_participants)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("crm:read");

    const { id } = await params;
    const contactId = parseInt(id, 10);

    const linkedEvents = await db
      .select({
        id: eventParticipants.id,
        eventId: eventParticipants.eventId,
        role: eventParticipants.role,
        eventName: events.name,
        eventDate: events.date,
        eventStatus: events.status,
      })
      .from(eventParticipants)
      .innerJoin(events, eq(eventParticipants.eventId, events.id))
      .where(eq(eventParticipants.contactId, contactId));

    return NextResponse.json({ success: true, data: linkedEvents });
  } catch (error) {
    console.error("Error fetching contact events:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch events" }, { status: 500 });
  }
}

// POST - Link contact to event via unified event_participants
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission("crm:manage");

    const { id } = await params;
    const contactId = parseInt(id, 10);
    const body = await request.json();
    const { eventId, role } = body;

    if (!eventId) {
      return NextResponse.json({ success: false, error: "eventId is required" }, { status: 400 });
    }

    const eId = parseInt(eventId, 10);

    // Check if already linked
    const [existing] = await db
      .select({ id: eventParticipants.id })
      .from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eId), eq(eventParticipants.contactId, contactId)))
      .limit(1);

    if (existing) {
      return NextResponse.json({ success: true, data: existing });
    }

    const [participant] = await db.insert(eventParticipants).values({
      eventId: eId,
      contactId,
      type: "contact",
      role: role || null,
      invitedBy: session.user.userId,
    }).returning();

    // Auto-invite contact to the platform
    let invitationStatus = null;
    try {
      invitationStatus = await inviteCollaboratorContact(session, contactId, eId);
    } catch (inviteErr) {
      console.error("Auto-invite failed (non-blocking):", inviteErr);
    }

    return NextResponse.json({ success: true, data: { ...participant, invitationStatus } });
  } catch (error) {
    console.error("Error linking contact to event:", error);
    return NextResponse.json({ success: false, error: "Failed to link contact" }, { status: 500 });
  }
}

// DELETE - Unlink contact from event via unified event_participants
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("crm:manage");

    const { id } = await params;
    const contactId = parseInt(id, 10);
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json({ success: false, error: "eventId is required" }, { status: 400 });
    }

    await db.delete(eventParticipants).where(
      and(
        eq(eventParticipants.contactId, contactId),
        eq(eventParticipants.eventId, parseInt(eventId, 10))
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unlinking contact from event:", error);
    return NextResponse.json({ success: false, error: "Failed to unlink contact" }, { status: 500 });
  }
}
