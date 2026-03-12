import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { taskChecklistItems, tasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { validationError, notFoundError } from "@/lib/api/api-errors";

export const PATCH = withApiAuth(
  async (request: NextRequest, { session, params }) => {
    const taskId = parseInt(params.id, 10);
    const itemId = parseInt(params.itemId, 10);
    if (isNaN(taskId)) throw validationError("Invalid task ID.", "id");
    if (isNaN(itemId)) throw validationError("Invalid checklist item ID.", "itemId");

    const [task] = await db.select({ id: tasks.id }).from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.organizationId, session.organizationId))).limit(1);
    if (!task) throw notFoundError("Task", String(taskId));

    const body = await request.json();
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.is_completed !== undefined) {
      updateData.isCompleted = body.is_completed;
      updateData.completedAt = body.is_completed ? new Date() : null;
    }
    if (body.due_date !== undefined) updateData.dueDate = body.due_date ? new Date(body.due_date) : null;
    if (body.sort_order !== undefined) updateData.sortOrder = body.sort_order;

    const [updated] = await db.update(taskChecklistItems).set(updateData)
      .where(and(eq(taskChecklistItems.id, itemId), eq(taskChecklistItems.taskId, taskId))).returning();

    if (!updated) throw notFoundError("ChecklistItem", String(itemId));
    return { data: { object: "checklist_item", ...updated } };
  },
  { scope: "tasks:write", idempotent: true }
);
