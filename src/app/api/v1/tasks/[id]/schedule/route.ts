import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { taskScheduleItems, tasks } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { validationError, notFoundError } from "@/lib/api/api-errors";

export const GET = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const taskId = parseInt(params.id, 10);
    if (isNaN(taskId)) throw validationError("Invalid task ID.", "id");

    const [task] = await db.select({ id: tasks.id }).from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.organizationId, session.organizationId))).limit(1);
    if (!task) throw notFoundError("Task", params.id);

    const items = await db.select().from(taskScheduleItems)
      .where(eq(taskScheduleItems.taskId, taskId))
      .orderBy(asc(taskScheduleItems.date), asc(taskScheduleItems.sortOrder));

    return { data: { object: "list", data: items.map((i) => ({ object: "task_schedule_item", ...i })), url: `/api/v1/tasks/${taskId}/schedule` } };
  },
  { scope: "tasks:read" }
);
