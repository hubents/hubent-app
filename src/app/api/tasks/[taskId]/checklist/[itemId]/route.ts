import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import { taskChecklistItems, tasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiHandler, badRequest, notFound, ok } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ taskId: string; itemId: string }> };

async function loadOwnedTask(taskIdNum: number, organizationId: number) {
  return db.query.tasks.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.id, taskIdNum), eq(t.organizationId, organizationId)),
    columns: { id: true, eventId: true },
  });
}

// PATCH /api/tasks/[taskId]/checklist/[itemId] - Update checklist item
export async function PATCH(
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

    const [existingItem] = await db
      .select()
      .from(taskChecklistItems)
      .where(and(
        eq(taskChecklistItems.id, itemIdNum),
        eq(taskChecklistItems.taskId, taskIdNum)
      ))
      .limit(1);

    if (!existingItem) return notFound("Checklist item not found");

    const body = await request.json();
    const { title, isCompleted, dueDate, sortOrder } = body;

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) {
      updates.title = title.trim();
    }

    if (isCompleted !== undefined) {
      updates.isCompleted = isCompleted;
      if (isCompleted && !existingItem.isCompleted) {
        updates.completedAt = new Date();
        updates.completedBy = session.user.userId;
      } else if (!isCompleted) {
        updates.completedAt = null;
        updates.completedBy = null;
      }
    }

    if (dueDate !== undefined) {
      updates.dueDate = dueDate ? new Date(dueDate) : null;
    }

    if (sortOrder !== undefined) {
      updates.sortOrder = sortOrder;
    }

    const [updatedItem] = await db
      .update(taskChecklistItems)
      .set(updates)
      .where(eq(taskChecklistItems.id, itemIdNum))
      .returning();

    return ok(updatedItem);
  }, "PATCH /api/tasks/[taskId]/checklist/[itemId]");
}

// DELETE /api/tasks/[taskId]/checklist/[itemId] - Delete checklist item
export async function DELETE(
  _request: NextRequest,
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

    const [existingItem] = await db
      .select({ id: taskChecklistItems.id })
      .from(taskChecklistItems)
      .where(and(
        eq(taskChecklistItems.id, itemIdNum),
        eq(taskChecklistItems.taskId, taskIdNum)
      ))
      .limit(1);

    if (!existingItem) return notFound("Checklist item not found");

    await db
      .delete(taskChecklistItems)
      .where(eq(taskChecklistItems.id, itemIdNum));

    return ok(null);
  }, "DELETE /api/tasks/[taskId]/checklist/[itemId]");
}
