import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import { tasks, taskChecklistItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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

    const [existingItem] = await db
      .select()
      .from(taskChecklistItems)
      .where(and(
        eq(taskChecklistItems.id, itemIdNum),
        eq(taskChecklistItems.taskId, taskIdNum)
      ))
      .limit(1);

    if (!existingItem) {
      return NextResponse.json({ success: false, error: "Checklist item not found" }, { status: 404 });
    }

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

    return NextResponse.json({ success: true, data: updatedItem });
  } catch (error) {
    console.error("PATCH /api/tasks/[taskId]/checklist/[itemId] error:", error);
    const message = error instanceof Error ? error.message : "Failed to update checklist item";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

// DELETE /api/tasks/[taskId]/checklist/[itemId] - Delete checklist item
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

    const [existingItem] = await db
      .select({ id: taskChecklistItems.id })
      .from(taskChecklistItems)
      .where(and(
        eq(taskChecklistItems.id, itemIdNum),
        eq(taskChecklistItems.taskId, taskIdNum)
      ))
      .limit(1);

    if (!existingItem) {
      return NextResponse.json({ success: false, error: "Checklist item not found" }, { status: 404 });
    }

    await db
      .delete(taskChecklistItems)
      .where(eq(taskChecklistItems.id, itemIdNum));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks/[taskId]/checklist/[itemId] error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete checklist item";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
