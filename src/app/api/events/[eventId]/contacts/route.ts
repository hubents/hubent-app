import { NextRequest } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import { eventParticipants, contacts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiHandler, ok, created, badRequest } from "@/lib/api-handler";

// GET - List contacts linked to an event (reads from event_participants)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  return apiHandler(async () => {
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

    return ok(linkedContacts);
  }, "GET /api/events/[eventId]/contacts");
}

// POST - Link contact to event (writes to event_participants)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const session = await requireEventSectionAccess(eventIdNum, "general", "edit");
    const body = await request.json();
    const { contactId, role } = body;

    if (!contactId) {
      return badRequest("contactId is required");
    }

    const cId = typeof contactId === "number" ? contactId : parseInt(contactId, 10);

    const [existing] = await db
      .select({ id: eventParticipants.id })
      .from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eventIdNum), eq(eventParticipants.contactId, cId)))
      .limit(1);

    if (existing) {
      return ok(existing);
    }

    const [participant] = await db.insert(eventParticipants).values({
      eventId: eventIdNum,
      contactId: cId,
      type: "contact",
      role: role || null,
      invitedBy: session.user.userId,
    }).returning();

    return created(participant);
  }, "POST /api/events/[eventId]/contacts");
}

// DELETE - Unlink contact from event (deletes from event_participants)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    await requireEventSectionAccess(eventIdNum, "general", "edit");
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contactId");

    if (!contactId) {
      return badRequest("contactId is required");
    }

    await db.delete(eventParticipants).where(
      and(
        eq(eventParticipants.contactId, parseInt(contactId, 10)),
        eq(eventParticipants.eventId, eventIdNum)
      )
    );

    return ok(null);
  }, "DELETE /api/events/[eventId]/contacts");
}
