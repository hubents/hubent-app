import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import {
  tasks,
  taskChecklistItems,
  taskChecklistAssignees,
  taskParticipants,
  users,
  vendors,
  contacts
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notifyChecklistAssigned } from "@/lib/push-notifications";

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
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await requirePermission("tasks:read");

    const { taskId, itemId } = await params;
    const taskIdNum = parseInt(taskId, 10);
    const itemIdNum = parseInt(itemId, 10);

    if (isNaN(taskIdNum) || isNaN(itemIdNum)) {
      return NextResponse.json({ success: false, error: "Invalid IDs" }, { status: 400 });
    }

    const task = await loadOwnedTask(taskIdNum, session.organizationId);
    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

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

    return NextResponse.json({ success: true, data: assignees });
  } catch (error) {
    console.error("GET assignees error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch assignees";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

// POST /api/tasks/[taskId]/checklist/[itemId]/assignees - Add assignee to item
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await requirePermission("tasks:update");

    const { taskId, itemId } = await params;
    const taskIdNum = parseInt(taskId, 10);
    const itemIdNum = parseInt(itemId, 10);

    if (isNaN(taskIdNum) || isNaN(itemIdNum)) {
      return NextResponse.json({ success: false, error: "Invalid IDs" }, { status: 400 });
    }

    const task = await loadOwnedTask(taskIdNum, session.organizationId);
    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    if (session.eventScoped && task.eventId) {
      await requireEventSectionAccess(task.eventId, "tasks", "edit");
    }

    const body = await request.json();
    const { participantId } = body;

    if (!participantId) {
      return NextResponse.json({ success: false, error: "participantId is required" }, { status: 400 });
    }

    const [item] = await db
      .select({ id: taskChecklistItems.id, title: taskChecklistItems.title, taskId: taskChecklistItems.taskId })
      .from(taskChecklistItems)
      .where(and(
        eq(taskChecklistItems.id, itemIdNum),
        eq(taskChecklistItems.taskId, taskIdNum)
      ))
      .limit(1);

    if (!item) {
      return NextResponse.json({ success: false, error: "Checklist item not found" }, { status: 404 });
    }

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

    if (!participant) {
      return NextResponse.json({ success: false, error: "Participant not found in this task" }, { status: 404 });
    }

    const [existing] = await db
      .select({ id: taskChecklistAssignees.id })
      .from(taskChecklistAssignees)
      .where(and(
        eq(taskChecklistAssignees.checklistItemId, itemIdNum),
        eq(taskChecklistAssignees.participantId, participantId)
      ))
      .limit(1);

    if (existing) {
      return NextResponse.json({ success: false, error: "Already assigned" }, { status: 400 });
    }

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

    return NextResponse.json({ success: true, data: newAssignee });
  } catch (error) {
    console.error("POST assignees error:", error);
    const message = error instanceof Error ? error.message : "Failed to add assignee";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

// DELETE /api/tasks/[taskId]/checklist/[itemId]/assignees - Remove assignee
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await requirePermission("tasks:update");

    const { taskId, itemId } = await params;
    const taskIdNum = parseInt(taskId, 10);
    const itemIdNum = parseInt(itemId, 10);

    if (isNaN(taskIdNum) || isNaN(itemIdNum)) {
      return NextResponse.json({ success: false, error: "Invalid IDs" }, { status: 400 });
    }

    const task = await loadOwnedTask(taskIdNum, session.organizationId);
    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    if (session.eventScoped && task.eventId) {
      await requireEventSectionAccess(task.eventId, "tasks", "edit");
    }

    const { searchParams } = new URL(request.url);
    const assigneeId = searchParams.get("assigneeId");
    const participantId = searchParams.get("participantId");

    if (!assigneeId && !participantId) {
      return NextResponse.json({ success: false, error: "assigneeId or participantId required" }, { status: 400 });
    }

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE assignees error:", error);
    const message = error instanceof Error ? error.message : "Failed to remove assignee";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
