import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { linkContactToEvent, unlinkContactFromEvent } from "@/lib/contacts";
import { db } from "@/db";
import { contactEvents, contacts } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET - List contacts linked to an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await requirePermission("events:read");

    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);

    const linkedContacts = await db
      .select({
        id: contactEvents.id,
        contactId: contactEvents.contactId,
        role: contactEvents.role,
        contactName: contacts.name,
        contactEmail: contacts.email,
        contactPhone: contacts.phone,
        contactType: contacts.type,
        contactAvatar: contacts.avatar,
      })
      .from(contactEvents)
      .innerJoin(contacts, eq(contactEvents.contactId, contacts.id))
      .where(eq(contactEvents.eventId, eventIdNum));

    return NextResponse.json({ success: true, data: linkedContacts });
  } catch (error) {
    console.error("Error fetching event contacts:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch contacts" }, { status: 500 });
  }
}

// POST - Link contact to event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await requirePermission("events:update");

    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const body = await request.json();
    const { contactId, role } = body;

    if (!contactId) {
      return NextResponse.json({ success: false, error: "contactId is required" }, { status: 400 });
    }

    const link = await linkContactToEvent(contactId, eventIdNum, role);

    return NextResponse.json({ success: true, data: link });
  } catch (error) {
    console.error("Error linking contact to event:", error);
    return NextResponse.json({ success: false, error: "Failed to link contact" }, { status: 500 });
  }
}

// DELETE - Unlink contact from event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await requirePermission("events:update");

    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contactId");

    if (!contactId) {
      return NextResponse.json({ success: false, error: "contactId is required" }, { status: 400 });
    }

    await unlinkContactFromEvent(parseInt(contactId, 10), eventIdNum);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unlinking contact from event:", error);
    return NextResponse.json({ success: false, error: "Failed to unlink contact" }, { status: 500 });
  }
}
