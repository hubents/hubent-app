import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { inviteCollaboratorContact } from "@/lib/invitations";
import { db } from "@/db";
import { events, eventParticipants } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ eventId: string; id: string }> };

/**
 * POST /api/events/[eventId]/collaborators/[id]/invite
 * Manually trigger invitation for a contact collaborator (e.g. legacy data)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("events:update");
    const { eventId, id } = await params;
    const eId = parseInt(eventId, 10);
    const pId = parseInt(id, 10);

    // Verify event belongs to org
    const event = await db.query.events.findFirst({
      where: (e, { eq, and }) =>
        and(eq(e.id, eId), eq(e.organizationId, session.organizationId)),
      columns: { id: true },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Evento no encontrado" } },
        { status: 404 }
      );
    }

    // Find participant
    const [participant] = await db
      .select({ id: eventParticipants.id, contactId: eventParticipants.contactId, role: eventParticipants.role })
      .from(eventParticipants)
      .where(and(eq(eventParticipants.id, pId), eq(eventParticipants.eventId, eId)))
      .limit(1);

    if (!participant || !participant.contactId) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Colaborador contacto no encontrado" } },
        { status: 404 }
      );
    }

    const result = await inviteCollaboratorContact(session, participant.contactId, eId, participant.role);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al invitar colaborador";
    return NextResponse.json(
      { success: false, error: { code: "INVITE_ERROR", message } },
      { status: 500 }
    );
  }
}
