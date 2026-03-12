import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFoundError, validationError } from "@/lib/api/api-errors";
import { dispatchWebhookEvent } from "@/lib/api/api-webhooks";

export const GET = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid task ID.", "id");

    const [task] = await db.select().from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.organizationId, session.organizationId))).limit(1);

    if (!task) throw notFoundError("Task", params.id);
    return { data: { object: "task", ...task } };
  },
  { scope: "tasks:read" }
);

export const PATCH = withApiAuth(
  async (request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid task ID.", "id");

    const body = await request.json();
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.due_date !== undefined) updateData.dueDate = body.due_date ? new Date(body.due_date) : null;
    if (body.event_id !== undefined) updateData.eventId = body.event_id;
    if (body.assigned_to !== undefined) updateData.assignedTo = body.assigned_to;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.sort_order !== undefined) updateData.sortOrder = body.sort_order;

    const [updated] = await db.update(tasks).set(updateData)
      .where(and(eq(tasks.id, id), eq(tasks.organizationId, session.organizationId))).returning();

    if (!updated) throw notFoundError("Task", params.id);

    void dispatchWebhookEvent(session.organizationId, "task.updated", { ...updated }).catch(() => {});
    if (body.status === "completed") {
      void dispatchWebhookEvent(session.organizationId, "task.completed", { id: updated.id }).catch(() => {});
    }

    return { data: { object: "task", ...updated } };
  },
  { scope: "tasks:write", idempotent: true }
);

export const DELETE = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid task ID.", "id");

    const [deleted] = await db.update(tasks).set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.organizationId, session.organizationId)))
      .returning({ id: tasks.id });

    if (!deleted) throw notFoundError("Task", params.id);

    void dispatchWebhookEvent(session.organizationId, "task.deleted", { id: deleted.id }).catch(() => {});

    return { data: { object: "task", id: deleted.id, deleted: true } };
  },
  { scope: "tasks:write" }
);
