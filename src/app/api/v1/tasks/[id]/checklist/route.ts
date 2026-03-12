import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { taskChecklistItems, tasks } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { validationError, notFoundError } from "@/lib/api/api-errors";
import { z } from "zod";

async function verifyTaskAccess(taskId: number, orgId: number) {
  const [task] = await db.select({ id: tasks.id }).from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.organizationId, orgId))).limit(1);
  if (!task) throw notFoundError("Task", String(taskId));
}

export const GET = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const taskId = parseInt(params.id, 10);
    if (isNaN(taskId)) throw validationError("Invalid task ID.", "id");
    await verifyTaskAccess(taskId, session.organizationId);

    const items = await db.select().from(taskChecklistItems)
      .where(eq(taskChecklistItems.taskId, taskId))
      .orderBy(asc(taskChecklistItems.sortOrder));

    return { data: { object: "list", data: items.map((i) => ({ object: "checklist_item", ...i })), url: `/api/v1/tasks/${taskId}/checklist` } };
  },
  { scope: "tasks:read" }
);

const createChecklistItemSchema = z.object({
  title: z.string().min(1),
  due_date: z.string().datetime().optional(),
  sort_order: z.number().int().optional(),
});

export const POST = withApiAuth(
  async (request: NextRequest, { session, params }) => {
    const taskId = parseInt(params.id, 10);
    if (isNaN(taskId)) throw validationError("Invalid task ID.", "id");
    await verifyTaskAccess(taskId, session.organizationId);

    const body = await request.json();
    const parsed = createChecklistItemSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.issues[0].message, parsed.error.issues[0].path.join("."));

    const d = parsed.data;
    const [item] = await db.insert(taskChecklistItems).values({
      taskId,
      title: d.title,
      dueDate: d.due_date ? new Date(d.due_date) : null,
      sortOrder: d.sort_order ?? 0,
    }).returning();

    return { status: 201, data: { object: "checklist_item", ...item } };
  },
  { scope: "tasks:write", idempotent: true }
);
