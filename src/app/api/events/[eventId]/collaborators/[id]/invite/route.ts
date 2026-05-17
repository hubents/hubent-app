import { NextRequest } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { inviteCollaboratorContact } from "@/lib/invitations";
import { db } from "@/db";
import { events, eventParticipants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiHandler, ok, notFound } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ eventId: string; id: string }> };

/**
 * POST /api/events/[eventId]/collaborators/[id]/invite
 * Manually trigger invitation for a contact collaborator (e.g. legacy data)
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId, id } = await params;
    const eId = parseInt(eventId, 10);
    const pId = parseInt(id, 10);
    const session = await requireEventSectionAccess(eId, "settings", "edit");

    // Verify event belongs to org
    const [event] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.id, eId), eq(events.organizationId, session.organizationId)))
      .limit(1);

    if (!event) {
      return notFound("Evento no encontrado");
    }

    // Find participant
    const [participant] = await db
      .select({ id: eventParticipants.id, contactId: eventParticipants.contactId, role: eventParticipants.role })
      .from(eventParticipants)
      .where(and(eq(eventParticipants.id, pId), eq(eventParticipants.eventId, eId)))
      .limit(1);

    if (!participant || !participant.contactId) {
      return notFound("Colaborador contacto no encontrado");
    }

    const result = await inviteCollaboratorContact(session, participant.contactId, eId, participant.role);

    return ok(result);
  }, "POST /api/events/[eventId]/collaborators/[id]/invite");
}
