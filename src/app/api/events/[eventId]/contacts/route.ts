import { NextRequest, NextResponse } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import { eventParticipants, contacts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// GET - List contacts linked to an event (reads from event_participants)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "general", "view");

    const linkedContacts = await db
      .select({
        id: eventParticipants.id,
        contactId: eventParticipants.contactId,
        role: eventParticipants.role,
        contactName: contacts.name,
        contactEmail: contacts.email,
        contactPhone: contacts.phone,
        contactType: contacts.type,
        contactAvatar: contacts.avatar,
      })
      .from(eventParticipants)
      .innerJoin(contacts, eq(eventParticipants.contactId, contacts.id))
      .where(and(eq(eventParticipants.eventId, eventIdNum), eq(eventParticipants.type, "contact")));

    return NextResponse.json({ success: true, data: linkedContacts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch contacts";
    const status = message.includes("Forbidden") ? 403 : message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

// POST - Link contact to event (writes to event_participants)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const session = await requireEventSectionAccess(eventIdNum, "general", "edit");
    const body = await request.json();
    const { contactId, role } = body;

    if (!contactId) {
      return NextResponse.json({ success: false, error: "contactId is required" }, { status: 400 });
    }

    const cId = typeof contactId === "number" ? contactId : parseInt(contactId, 10);

    const [existing] = await db
      .select({ id: eventParticipants.id })
      .from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eventIdNum), eq(eventParticipants.contactId, cId)))
      .limit(1);

    if (existing) {
      return NextResponse.json({ success: true, data: existing });
    }

    const [participant] = await db.insert(eventParticipants).values({
      eventId: eventIdNum,
      contactId: cId,
      type: "contact",
      role: role || null,
      invitedBy: session.user.userId,
    }).returning();

    return NextResponse.json({ success: true, data: participant });
  } catch (error) {
    console.error("Error linking contact to event:", error);
    return NextResponse.json({ success: false, error: "Failed to link contact" }, { status: 500 });
  }
}

// DELETE - Unlink contact from event (deletes from event_participants)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "general", "edit");
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contactId");

    if (!contactId) {
      return NextResponse.json({ success: false, error: "contactId is required" }, { status: 400 });
    }

    await db.delete(eventParticipants).where(
      and(
        eq(eventParticipants.contactId, parseInt(contactId, 10)),
        eq(eventParticipants.eventId, eventIdNum)
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unlinking contact from event:", error);
    return NextResponse.json({ success: false, error: "Failed to unlink contact" }, { status: 500 });
  }
}
