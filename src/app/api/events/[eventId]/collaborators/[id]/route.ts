import { NextRequest, NextResponse } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { updateEventParticipant, removeEventParticipant } from "@/lib/events";
import { db } from "@/db";
import { events, eventParticipants, eventCollaborations, taskParticipants, tasks } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const updateCollaboratorSchema = z.object({
  role: z.string().min(1, "El rol es obligatorio").optional(),
  permissions: z.record(z.string(), z.string()).optional(),
});

type RouteParams = { params: Promise<{ eventId: string; id: string }> };

/**
 * PATCH /api/events/[eventId]/collaborators/[id]
 * Update a collaborator's permissions
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId, id } = await params;
    const eId = parseInt(eventId, 10);
    const pId = parseInt(id, 10);
    const session = await requireEventSectionAccess(eId, "settings", "edit");
    const body = await request.json();

    const parsed = updateCollaboratorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Datos inválidos" } },
        { status: 400 }
      );
    }

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

    // Try event_participants first
    const [existingParticipant] = await db
      .select({ id: eventParticipants.id })
      .from(eventParticipants)
      .where(and(eq(eventParticipants.id, pId), eq(eventParticipants.eventId, eId)))
      .limit(1);

    if (existingParticipant) {
      const updated = await updateEventParticipant(eId, pId, {
        permissions: parsed.data.permissions,
        role: parsed.data.role,
      });
      return NextResponse.json({ success: true, data: updated });
    }

    // Fallback: check event_collaborations (partner-type collaborators)
    const [existingCollab] = await db
      .select({ id: eventCollaborations.id, permissions: eventCollaborations.permissions })
      .from(eventCollaborations)
      .where(and(eq(eventCollaborations.id, pId), eq(eventCollaborations.eventId, eId)))
      .limit(1);

    if (!existingCollab) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Colaborador no encontrado" } },
        { status: 404 }
      );
    }

    const oldPerms = (existingCollab.permissions || {}) as Record<string, string>;
    const newPerms = parsed.data.permissions
      ? { ...oldPerms, ...parsed.data.permissions }
      : oldPerms;

    const oldScope = oldPerms.scope || "full";
    const newScope = (newPerms as Record<string, string>).scope || "full";

    const [updated] = await db
      .update(eventCollaborations)
      .set({ permissions: newPerms, updatedAt: new Date() })
      .where(eq(eventCollaborations.id, pId))
      .returning();

    // When scope changes from full to participant, clean up auto-added task_participants
    if (oldScope === "full" && newScope === "participant" && updated.guestOrgId) {
      const guestOrgId = updated.guestOrgId;
      db.delete(taskParticipants)
        .where(
          and(
            eq(taskParticipants.collaboratorOrgId, guestOrgId),
            sql`${taskParticipants.taskId} IN (
              SELECT ${tasks.id} FROM ${tasks}
              WHERE ${tasks.eventId} = ${eId}
                AND ${tasks.organizationId} != ${guestOrgId}
            )`,
          ),
        )
        .then((result) => {
          console.log(`[scope-change] Cleaned auto-adds for guestOrgId=${guestOrgId} eventId=${eId}:`, result.rowCount);
        })
        .catch((err) => {
          console.error("[scope-change] Failed to clean auto-adds:", err);
        });
    }

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
 * Revoke a collaborator's access to an event.
 *
 * Removes the event_participants row AND cleans up taskParticipants for the same user
 * on every task of this event so the user immediately loses chat / file / task access.
 *
 * IMPORTANT: We deliberately do NOT delete `organization_members` — the user keeps the
 * ability to log in and access OTHER events they may collaborate on. To fully remove a
 * user from a tenant, an admin must delete the org_members row separately.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId, id } = await params;
    const eId = parseInt(eventId, 10);
    const pId = parseInt(id, 10);
    const session = await requireEventSectionAccess(eId, "settings", "edit");

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

    // Capture the userId BEFORE deleting so we can clean up task_participants for them.
    const [participant] = await db
      .select({ userId: eventParticipants.userId })
      .from(eventParticipants)
      .where(and(eq(eventParticipants.id, pId), eq(eventParticipants.eventId, eId)))
      .limit(1);

    await removeEventParticipant(pId, eId);

    if (participant?.userId) {
      const userId = participant.userId;
      const eventTasks = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(eq(tasks.eventId, eId));

      if (eventTasks.length > 0) {
        await db.delete(taskParticipants).where(
          and(
            eq(taskParticipants.userId, userId),
            sql`${taskParticipants.taskId} IN (${sql.join(eventTasks.map(t => sql`${t.id}`), sql`, `)})`,
          ),
        );
      }
    }

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
