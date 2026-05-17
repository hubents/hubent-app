import { NextRequest } from "next/server";
import { requirePermission, requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import { taskChecklistItems, taskChecklistAssignees, taskParticipants, users, vendors, contacts } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { apiHandler, badRequest, notFound, ok } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ taskId: string }> };

// GET /api/tasks/[taskId]/checklist - List all checklist items with assignees
export async function GET(
  _req: NextRequest,
  { params }: RouteParams
) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:read");

    const { taskId } = await params;
    const taskIdNum = parseInt(taskId, 10);
    if (isNaN(taskIdNum)) return badRequest("Invalid task ID");

    const task = await db.query.tasks.findFirst({
      where: (t, { eq, and }) =>
        and(
          eq(t.id, taskIdNum),
          eq(t.organizationId, session.organizationId)
        ),
      columns: { id: true, eventId: true },
    });

    if (!task) return notFound("Task not found");

    if (session.eventScoped && task.eventId) {
      await requireEventSectionAccess(task.eventId, "tasks", "view");
    }

    const items = await db
      .select()
      .from(taskChecklistItems)
      .where(eq(taskChecklistItems.taskId, taskIdNum))
      .orderBy(asc(taskChecklistItems.sortOrder), asc(taskChecklistItems.id));

    const itemIds = items.map(i => i.id);

    let assigneesWithDetails: Array<{
      id: number;
      checklistItemId: number;
      participantId: number;
      assignedAt: Date | null;
      participantType: string | null;
      userId: string | null;
      vendorId: number | null;
      contactId: number | null;
      userName: string | null;
      vendorName: string | null;
      contactName: string | null;
    }> = [];

    if (itemIds.length > 0) {
      const assigneesRaw = await db
        .select({
          id: taskChecklistAssignees.id,
          checklistItemId: taskChecklistAssignees.checklistItemId,
          participantId: taskChecklistAssignees.participantId,
          assignedAt: taskChecklistAssignees.assignedAt,
          participantType: taskParticipants.type,
          userId: taskParticipants.userId,
          vendorId: taskParticipants.vendorId,
          contactId: taskParticipants.contactId,
        })
        .from(taskChecklistAssignees)
        .innerJoin(taskParticipants, eq(taskChecklistAssignees.participantId, taskParticipants.id))
        .where(eq(taskParticipants.taskId, taskIdNum));

      for (const assignee of assigneesRaw) {
        let userName: string | null = null;
        let vendorName: string | null = null;
        let contactName: string | null = null;

        if (assignee.userId) {
          const [user] = await db
            .select({ name: users.name })
            .from(users)
            .where(eq(users.id, assignee.userId))
            .limit(1);
          userName = user?.name || null;
        }

        if (assignee.vendorId) {
          const [vendor] = await db
            .select({ name: vendors.name })
            .from(vendors)
            .where(eq(vendors.id, assignee.vendorId))
            .limit(1);
          vendorName = vendor?.name || null;
        }

        if (assignee.contactId) {
          const [contact] = await db
            .select({ name: contacts.name })
            .from(contacts)
            .where(eq(contacts.id, assignee.contactId))
            .limit(1);
          contactName = contact?.name || null;
        }

        assigneesWithDetails.push({
          ...assignee,
          userName,
          vendorName,
          contactName,
        });
      }
    }

    const itemsWithAssignees = items.map(item => ({
      ...item,
      assignees: assigneesWithDetails
        .filter(a => a.checklistItemId === item.id)
        .map(a => ({
          id: a.id,
          participantId: a.participantId,
          type: a.participantType,
          name: a.userName || a.vendorName || a.contactName || "Sin nombre",
          isUser: !!a.userId,
          isVendor: !!a.vendorId,
          isContact: !!a.contactId,
          assignedAt: a.assignedAt,
        })),
    }));

    return ok(itemsWithAssignees);
  }, "GET /api/tasks/[taskId]/checklist");
}

// POST /api/tasks/[taskId]/checklist - Create a new checklist item
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:update");

    const { taskId } = await params;
    const taskIdNum = parseInt(taskId, 10);
    if (isNaN(taskIdNum)) return badRequest("Invalid task ID");

    const task = await db.query.tasks.findFirst({
      where: (t, { eq, and }) =>
        and(
          eq(t.id, taskIdNum),
          eq(t.organizationId, session.organizationId)
        ),
      columns: { id: true, eventId: true },
    });

    if (!task) return notFound("Task not found");

    if (session.eventScoped && task.eventId) {
      await requireEventSectionAccess(task.eventId, "tasks", "edit");
    }

    const body = await request.json();
    const { title, dueDate, assigneeIds } = body;

    if (!title?.trim()) return badRequest("Title is required");

    const [maxOrder] = await db
      .select({ maxSort: taskChecklistItems.sortOrder })
      .from(taskChecklistItems)
      .where(eq(taskChecklistItems.taskId, taskIdNum))
      .orderBy(asc(taskChecklistItems.sortOrder))
      .limit(1);

    const newSortOrder = (maxOrder?.maxSort || 0) + 1;

    const [newItem] = await db
      .insert(taskChecklistItems)
      .values({
        taskId: taskIdNum,
        title: title.trim(),
        dueDate: dueDate ? new Date(dueDate) : null,
        sortOrder: newSortOrder,
        createdBy: session.user.userId,
      })
      .returning();

    if (assigneeIds && Array.isArray(assigneeIds) && assigneeIds.length > 0) {
      const assigneeValues = assigneeIds.map((participantId: number) => ({
        checklistItemId: newItem.id,
        participantId,
        assignedBy: session.user.userId,
      }));

      await db.insert(taskChecklistAssignees).values(assigneeValues);
    }

    return ok(newItem, 201);
  }, "POST /api/tasks/[taskId]/checklist");
}
