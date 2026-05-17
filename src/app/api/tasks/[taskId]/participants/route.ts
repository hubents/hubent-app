import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireEventSectionAccess } from "@/lib/session";
import {
  addTaskParticipant,
  removeTaskParticipant,
  updateTaskParticipant,
  getTaskParticipants
} from "@/lib/invitations";
import { db } from "@/db";
import { notifyAddedAsParticipant } from "@/lib/push-notifications";
import { ensureVendorForProviderOrg } from "@/lib/cross-org";
import { apiHandler, ok, badRequest, created } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ taskId: string }> };

async function enforceTaskEditAccess(taskIdNum: number, organizationId: number, eventScoped: boolean): Promise<void> {
  if (!eventScoped) return;
  const task = await db.query.tasks.findFirst({
    where: (t, { eq, and }) => and(eq(t.id, taskIdNum), eq(t.organizationId, organizationId)),
    columns: { eventId: true },
  });
  if (task?.eventId) {
    await requireEventSectionAccess(task.eventId, "tasks", "edit");
  }
}

// GET /api/tasks/[taskId]/participants - List task participants
export async function GET(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    await requirePermission("tasks:read");
    const { taskId } = await params;

    const participants = await getTaskParticipants(parseInt(taskId, 10));
    return ok(participants);
  }, "GET /api/tasks/[taskId]/participants");
}

// POST /api/tasks/[taskId]/participants - Add participant to task (user or vendor)
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:update");
    const { taskId } = await params;
    await enforceTaskEditAccess(parseInt(taskId, 10), session.organizationId, session.eventScoped);
    const body = await request.json();

    const { userId, vendorId, contactId, providerOrgId, type, canEdit, canComment } = body;

    if (!userId && !vendorId && !contactId && !providerOrgId) {
      return badRequest("userId, vendorId, contactId, or providerOrgId is required");
    }

    if (!type) {
      return badRequest("type is required");
    }

    let resolvedVendorId = vendorId;

    if (providerOrgId && !vendorId) {
      resolvedVendorId = await ensureVendorForProviderOrg(
        session.organizationId,
        providerOrgId,
        session.user.userId,
      );
    }

    const participant = await addTaskParticipant(session, parseInt(taskId, 10), {
      userId,
      vendorId: resolvedVendorId,
      contactId,
      type,
      canEdit,
      canComment,
    });

    // Send push notification if a user was added (not vendor/contact)
    if (userId) {
      const task = await db.query.tasks.findFirst({
        where: (t, { eq }) => eq(t.id, parseInt(taskId, 10)),
        columns: { title: true },
      });
      if (task) {
        const addedByName = session.user.name || "Alguien";
        notifyAddedAsParticipant(
          parseInt(taskId, 10),
          task.title,
          userId,
          addedByName
        ).catch(err => console.error("Push notification failed:", err));
      }
    }

    return created(participant);
  }, "POST /api/tasks/[taskId]/participants");
}

// PATCH /api/tasks/[taskId]/participants - Update participant permissions
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:update");
    const { taskId } = await params;
    await enforceTaskEditAccess(parseInt(taskId, 10), session.organizationId, session.eventScoped);
    const body = await request.json();

    const { participantId, canEdit, canComment } = body;

    if (!participantId) {
      return badRequest("participantId is required");
    }

    const updated = await updateTaskParticipant(
      session,
      parseInt(taskId, 10),
      participantId,
      { canEdit, canComment }
    );

    return ok(updated);
  }, "PATCH /api/tasks/[taskId]/participants");
}

// DELETE /api/tasks/[taskId]/participants - Remove participant from task
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:update");
    const { taskId } = await params;
    await enforceTaskEditAccess(parseInt(taskId, 10), session.organizationId, session.eventScoped);
    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get("participantId");

    if (!participantId) {
      return badRequest("participantId is required");
    }

    await removeTaskParticipant(
      session,
      parseInt(taskId, 10),
      parseInt(participantId, 10)
    );

    return ok({ message: "Participant removed" });
  }, "DELETE /api/tasks/[taskId]/participants");
}
