import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { getEventParticipants, addEventParticipant } from "@/lib/events";
import { db } from "@/db";
import { events, organizationMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ eventId: string }> };

/**
 * GET /api/events/[eventId]/collaborators
 * List all collaborators (participants) of an event
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("events:read");
    const { eventId } = await params;
    const id = parseInt(eventId, 10);

    // Verify event belongs to org
    const event = await db.query.events.findFirst({
      where: (e, { eq, and }) =>
        and(eq(e.id, id), eq(e.organizationId, session.organizationId)),
      columns: { id: true },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Evento no encontrado" } },
        { status: 404 }
      );
    }

    const participants = await getEventParticipants(id);

    return NextResponse.json({ success: true, data: participants });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener colaboradores";
    const status = message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}

/**
 * POST /api/events/[eventId]/collaborators
 * Add a collaborator to an event
 * Body: { userId?, contactId?, vendorId?, type?, role?, permissions? }
 * At least one of userId, contactId, or vendorId is required.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("events:update");
    const { eventId } = await params;
    const id = parseInt(eventId, 10);
    const body = await request.json();

    const { userId, contactId, vendorId, type = "planner", role, permissions } = body;

    if (!userId && !contactId && !vendorId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Se requiere userId, contactId o vendorId" } },
        { status: 400 }
      );
    }

    // Verify event belongs to org
    const event = await db.query.events.findFirst({
      where: (e, { eq, and }) =>
        and(eq(e.id, id), eq(e.organizationId, session.organizationId)),
      columns: { id: true },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Evento no encontrado" } },
        { status: 404 }
      );
    }

    // If userId provided, verify user is a member of the organization
    if (userId) {
      const [member] = await db
        .select({ id: organizationMembers.id })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.userId, userId),
            eq(organizationMembers.organizationId, session.organizationId)
          )
        )
        .limit(1);

      if (!member) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_MEMBER", message: "El usuario no es miembro de la organización" } },
          { status: 400 }
        );
      }
    }

    const participant = await addEventParticipant(session, id, {
      userId,
      contactId: contactId ? parseInt(contactId, 10) : undefined,
      vendorId: vendorId ? parseInt(vendorId, 10) : undefined,
      type,
      role,
      permissions,
    });

    return NextResponse.json({ success: true, data: participant }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al agregar colaborador";
    const status = message.includes("Forbidden") ? 403
      : message.includes("ya es colaborador") ? 409
      : 400;
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status }
    );
  }
}
