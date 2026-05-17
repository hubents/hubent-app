import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import {
  taskChecklistItems,
  taskChecklistAssignees,
  taskParticipants,
  users,
  vendors,
  contacts
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notifyChecklistAssigned } from "@/lib/push-notifications";
import { apiHandler, badRequest, notFound, ok, created } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ taskId: string; itemId: string }> };

async function loadOwnedTask(taskIdNum: number, organizationId: number) {
  return db.query.tasks.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.id, taskIdNum), eq(t.organizationId, organizationId)),
    columns: { id: true, eventId: true, title: true },
  });
}

// GET /api/tasks/[taskId]/checklist/[itemId]/assignees - List assignees for an item
export async function GET(
  _req: NextRequest,
  { params }: RouteParams
) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:read");

    const { taskId, itemId } = await params;
    const taskIdNum = parseInt(taskId, 10);
    const itemIdNum = parseInt(itemId, 10);

    if (isNaN(taskIdNum) || isNaN(itemIdNum)) return badRequest("Invalid IDs");

    const task = await loadOwnedTask(taskIdNum, session.organizationId);
    if (!task) return notFound("Task not found");

    if (session.eventScoped && task.eventId) {
      await requireEventSectionAccess(task.eventId, "tasks", "view");
    }

    const assigneesRaw = await db
      .select({
        id: taskChecklistAssignees.id,
        participantId: taskChecklistAssignees.participantId,
        assignedAt: taskChecklistAssignees.assignedAt,
        participantType: taskParticipants.type,
        userId: taskParticipants.userId,
        vendorId: taskParticipants.vendorId,
        contactId: taskParticipants.contactId,
      })
      .from(taskChecklistAssignees)
      .innerJoin(taskParticipants, eq(taskChecklistAssignees.participantId, taskParticipants.id))
      .where(eq(taskChecklistAssignees.checklistItemId, itemIdNum));

    const assignees = [];
    for (const a of assigneesRaw) {
      let name = "Sin nombre";

      if (a.userId) {
        const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, a.userId)).limit(1);
        name = user?.name || "Usuario";
      } else if (a.vendorId) {
        const [vendor] = await db.select({ name: vendors.name }).from(vendors).where(eq(vendors.id, a.vendorId)).limit(1);
        name = vendor?.name || "Proveedor";
      } else if (a.contactId) {
        const [contact] = await db.select({ name: contacts.name }).from(contacts).where(eq(contacts.id, a.contactId)).limit(1);
        name = contact?.name || "Contacto";
      }

      assignees.push({
        id: a.id,
        participantId: a.participantId,
        type: a.participantType,
        name,
        isUser: !!a.userId,
        isVendor: !!a.vendorId,
        isContact: !!a.contactId,
        assignedAt: a.assignedAt,
      });
    }

    return ok(assignees);
  }, "GET /api/tasks/[taskId]/checklist/[itemId]/assignees");
}

// POST /api/tasks/[taskId]/checklist/[itemId]/assignees - Add assignee to item
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:update");

    const { taskId, itemId } = await params;
    const taskIdNum = parseInt(taskId, 10);
    const itemIdNum = parseInt(itemId, 10);

    if (isNaN(taskIdNum) || isNaN(itemIdNum)) return badRequest("Invalid IDs");

    const task = await loadOwnedTask(taskIdNum, session.organizationId);
    if (!task) return notFound("Task not found");

    if (session.eventScoped && task.eventId) {
      await requireEventSectionAccess(task.eventId, "tasks", "edit");
    }

    const body = await request.json();
    const { participantId } = body;

    if (!participantId) return badRequest("participantId is required");

    const [item] = await db
      .select({ id: taskChecklistItems.id, title: taskChecklistItems.title, taskId: taskChecklistItems.taskId })
      .from(taskChecklistItems)
      .where(and(
        eq(taskChecklistItems.id, itemIdNum),
        eq(taskChecklistItems.taskId, taskIdNum)
      ))
      .limit(1);

    if (!item) return notFound("Checklist item not found");

    const [participant] = await db
      .select({
        id: taskParticipants.id,
        userId: taskParticipants.userId,
        vendorId: taskParticipants.vendorId,
        contactId: taskParticipants.contactId,
      })
      .from(taskParticipants)
      .where(and(
        eq(taskParticipants.id, participantId),
        eq(taskParticipants.taskId, taskIdNum)
      ))
      .limit(1);

    if (!participant) return notFound("Participant not found in this task");

    const [existing] = await db
      .select({ id: taskChecklistAssignees.id })
      .from(taskChecklistAssignees)
      .where(and(
        eq(taskChecklistAssignees.checklistItemId, itemIdNum),
        eq(taskChecklistAssignees.participantId, participantId)
      ))
      .limit(1);

    if (existing) return badRequest("Already assigned");

    const [newAssignee] = await db
      .insert(taskChecklistAssignees)
      .values({
        checklistItemId: itemIdNum,
        participantId,
        assignedBy: session.user.userId,
      })
      .returning();

    if (participant.userId && participant.userId !== session.user.userId) {
      try {
        await notifyChecklistAssigned(
          taskIdNum,
          task.title || "Tarea",
          item.title,
          participant.userId,
          session.user.name || "Alguien"
        );
      } catch (notifError) {
        console.error("Failed to send notification:", notifError);
      }
    }

    return created(newAssignee);
  }, "POST /api/tasks/[taskId]/checklist/[itemId]/assignees");
}

// DELETE /api/tasks/[taskId]/checklist/[itemId]/assignees - Remove assignee
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:update");

    const { taskId, itemId } = await params;
    const taskIdNum = parseInt(taskId, 10);
    const itemIdNum = parseInt(itemId, 10);

    if (isNaN(taskIdNum) || isNaN(itemIdNum)) return badRequest("Invalid IDs");

    const task = await loadOwnedTask(taskIdNum, session.organizationId);
    if (!task) return notFound("Task not found");

    if (session.eventScoped && task.eventId) {
      await requireEventSectionAccess(task.eventId, "tasks", "edit");
    }

    const { searchParams } = new URL(request.url);
    const assigneeId = searchParams.get("assigneeId");
    const participantId = searchParams.get("participantId");

    if (!assigneeId && !participantId) return badRequest("assigneeId or participantId required");

    if (assigneeId) {
      await db
        .delete(taskChecklistAssignees)
        .where(eq(taskChecklistAssignees.id, parseInt(assigneeId, 10)));
    } else if (participantId) {
      await db
        .delete(taskChecklistAssignees)
        .where(and(
          eq(taskChecklistAssignees.checklistItemId, itemIdNum),
          eq(taskChecklistAssignees.participantId, parseInt(participantId, 10))
        ));
    }

    return ok(null);
  }, "DELETE /api/tasks/[taskId]/checklist/[itemId]/assignees");
}
