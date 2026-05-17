import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { eventCollaborations, providerEventAccess, tasks, taskParticipants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { dispatchWebhookEvent } from "@/lib/api/api-webhooks";
import { apiHandler, ok, badRequest, notFound, forbidden, conflict } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ accessId: string }> };

const actionSchema = z.object({
  action: z.enum(["accept", "reject", "revoke"]),
});

/**
 * PATCH /api/events/collaborations/[accessId]
 * Accept, reject, or revoke an event collaboration
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { accessId } = await params;
    const aid = parseInt(accessId);

    const body = await request.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid action. Use accept, reject, or revoke.");
    }

    const { action } = parsed.data;

    // Try new event_collaborations table first
    const collab = await db.query.eventCollaborations.findFirst({
      where: eq(eventCollaborations.id, aid),
    });

    if (collab) {
      if (action === "revoke") {
        if (collab.hostOrgId !== session.organizationId) {
          return forbidden("Only the host can revoke");
        }
        if (collab.status !== "active" && collab.status !== "pending") {
          return conflict(`Cannot revoke: status is ${collab.status}`);
        }
        await db
          .update(eventCollaborations)
          .set({ status: "revoked", updatedAt: new Date() })
          .where(eq(eventCollaborations.id, aid));

        void dispatchWebhookEvent(session.organizationId, "collaboration.revoked", {
          id: aid, eventId: collab.eventId, guestOrgId: collab.guestOrgId,
        }).catch(() => {});

        return ok({ id: aid, status: "revoked" });
      }

      // accept / reject: must be the guest org
      if (collab.guestOrgId !== session.organizationId) {
        return forbidden("Not authorized for this invitation");
      }

      if (collab.status !== "pending") {
        return conflict(`Invitation already ${collab.status}`);
      }

      const newStatus = action === "accept" ? "active" : "rejected";
      await db
        .update(eventCollaborations)
        .set({
          status: newStatus,
          acceptedAt: action === "accept" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(eventCollaborations.id, aid));

      // On accept: retroactively link guest org to all existing tasks in this event
      if (action === "accept" && collab.guestOrgId && collab.eventId) {
        const permissions = (collab.permissions as Record<string, string> | null);
        const taskPerm = permissions?.tasks;
        if (taskPerm !== "none") {
          (async () => {
            try {
              const eventTasks = await db
                .select({ id: tasks.id })
                .from(tasks)
                .where(eq(tasks.eventId, collab.eventId));

              let linked = 0;
              for (const t of eventTasks) {
                const exists = await db.query.taskParticipants.findFirst({
                  where: and(
                    eq(taskParticipants.taskId, t.id),
                    eq(taskParticipants.collaboratorOrgId, collab.guestOrgId!),
                  ),
                });
                if (exists) continue;
                await db.insert(taskParticipants).values({
                  taskId: t.id,
                  collaboratorOrgId: collab.guestOrgId!,
                  type: "vendor",
                  canEdit: taskPerm === "edit",
                  canComment: true,
                });
                linked++;
              }
              if (linked > 0) {
                console.error(`[collab-accept] Linked ${linked} existing tasks to guest org ${collab.guestOrgId} on event ${collab.eventId}`);
              }
            } catch (err) {
              console.error("[collab-accept] Failed to auto-link tasks:", err);
            }
          })();
        }
      }

      const webhookType = action === "accept" ? "collaboration.accepted" : "collaboration.rejected";
      void dispatchWebhookEvent(collab.hostOrgId, webhookType, {
        id: aid, eventId: collab.eventId, guestOrgId: collab.guestOrgId,
      }).catch(() => {});

      return ok({ id: aid, status: newStatus });
    }

    // Fallback: legacy provider_event_access table
    const access = await db.query.providerEventAccess.findFirst({
      where: and(
        eq(providerEventAccess.id, aid),
        eq(providerEventAccess.providerOrgId, session.organizationId),
      ),
    });

    if (!access) {
      return notFound("Invitation not found");
    }

    if (access.status !== "pending") {
      return conflict(`Invitation already ${access.status}`);
    }

    const newStatus = action === "accept" ? "active" : "rejected";
    await db
      .update(providerEventAccess)
      .set({
        status: newStatus,
        acceptedAt: action === "accept" ? new Date() : null,
      })
      .where(eq(providerEventAccess.id, aid));

    return ok({ id: aid, status: newStatus });
  }, "PATCH /api/events/collaborations/[accessId]");
}
