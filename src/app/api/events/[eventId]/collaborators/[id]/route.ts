import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { updateEventParticipant, removeEventParticipant } from "@/lib/events";
import { db } from "@/db";
import { events, eventParticipants } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ eventId: string; id: string }> };

/**
 * PATCH /api/events/[eventId]/collaborators/[id]
 * Update a collaborator's permissions
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("events:update");
    const { eventId, id } = await params;
    const eId = parseInt(eventId, 10);
    const pId = parseInt(id, 10);
    const body = await request.json();

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

    // Verify participant exists for this event
    const [existing] = await db
      .select({ id: eventParticipants.id })
      .from(eventParticipants)
      .where(and(eq(eventParticipants.id, pId), eq(eventParticipants.eventId, eId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Colaborador no encontrado" } },
        { status: 404 }
      );
    }

    const updated = await updateEventParticipant(eId, pId, {
      permissions: body.permissions,
      role: body.role,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar colaborador";
    const status = message.includes("Forbidden") ? 403 : 400;
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status }
    );
  }
}

/**
 * DELETE /api/events/[eventId]/collaborators/[id]
 * Remove a collaborator from an event
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    await removeEventParticipant(pId);

    return NextResponse.json({ success: true, data: { message: "Colaborador eliminado" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al eliminar colaborador";
    const status = message.includes("Forbidden") ? 403 : 400;
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status }
    );
  }
}
