import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { inviteCollaboratorContact } from "@/lib/invitations";
import { db } from "@/db";
import { eventParticipants, events } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";

// GET - List events linked to a contact (reads from unified event_participants)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
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

    return ok(linkedEvents);
  }, "GET /api/contacts/[id]/events");
}

// POST - Link contact to event via unified event_participants
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");

    const { id } = await params;
    const contactId = parseInt(id, 10);
    const body = await request.json();
    const { eventId, role } = body;

    if (!eventId) {
      return badRequest("eventId is required");
    }

    const eId = parseInt(eventId, 10);

    // Check if already linked
    const [existing] = await db
      .select({ id: eventParticipants.id })
      .from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eId), eq(eventParticipants.contactId, contactId)))
      .limit(1);

    if (existing) {
      return ok(existing);
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
      invitationStatus = await inviteCollaboratorContact(session, contactId, eId, role || null);
    } catch (inviteErr) {
      console.error("Auto-invite failed (non-blocking):", inviteErr);
    }

    return ok({ ...participant, invitationStatus });
  }, "POST /api/contacts/[id]/events");
}

// DELETE - Unlink contact from event via unified event_participants
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    await requirePermission("crm:manage");

    const { id } = await params;
    const contactId = parseInt(id, 10);
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return badRequest("eventId is required");
    }

    await db.delete(eventParticipants).where(
      and(
        eq(eventParticipants.contactId, contactId),
        eq(eventParticipants.eventId, parseInt(eventId, 10))
      )
    );

    return ok(null);
  }, "DELETE /api/contacts/[id]/events");
}
