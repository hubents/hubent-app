import { NextRequest } from "next/server";
import { requirePermission, requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import { taskHtmlContent } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiHandler, ok, notFound } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ taskId: string }> };

// GET /api/tasks/[taskId]/html-content - Get task HTML content
export async function GET(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:read");
    const { taskId } = await params;

    // Verify task belongs to organization
    const task = await db.query.tasks.findFirst({
      where: (t, { eq, and }) =>
        and(
          eq(t.id, parseInt(taskId, 10)),
          eq(t.organizationId, session.organizationId)
        ),
    });

    if (!task) {
      return notFound("Task not found");
    }

    const htmlContent = await db.query.taskHtmlContent.findFirst({
      where: (h, { eq }) => eq(h.taskId, parseInt(taskId, 10)),
    });

    return ok(htmlContent || { taskId: parseInt(taskId, 10), content: "" });
  }, "GET /api/tasks/[taskId]/html-content");
}

// POST /api/tasks/[taskId]/html-content - Create or update task HTML content
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:update");
    const { taskId } = await params;
    const body = await request.json();

    const { content } = body;

    const task = await db.query.tasks.findFirst({
      where: (t, { eq, and }) =>
        and(
          eq(t.id, parseInt(taskId, 10)),
          eq(t.organizationId, session.organizationId)
        ),
    });

    if (!task) {
      return notFound("Task not found");
    }

    if (session.eventScoped && task.eventId) {
      await requireEventSectionAccess(task.eventId, "tasks", "edit");
    }

    // Check if content already exists
    const existing = await db.query.taskHtmlContent.findFirst({
      where: (h, { eq }) => eq(h.taskId, parseInt(taskId, 10)),
    });

    let result;
    if (existing) {
      [result] = await db.update(taskHtmlContent)
        .set({
          content,
          updatedBy: session.user.userId,
          updatedAt: new Date(),
        })
        .where(eq(taskHtmlContent.taskId, parseInt(taskId, 10)))
        .returning();
    } else {
      [result] = await db.insert(taskHtmlContent).values({
        taskId: parseInt(taskId, 10),
        content,
        updatedBy: session.user.userId,
      }).returning();
    }

    return ok(result);
  }, "POST /api/tasks/[taskId]/html-content");
}
