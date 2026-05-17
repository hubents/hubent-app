import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import { tasks, users, eventParticipants, taskParticipants, eventCollaborations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notifyTaskAssigned, notifyTaskStatusChanged } from "@/lib/push-notifications";
import { canAccessTask } from "@/lib/tenant";
import { apiHandler, ok, notFound, forbidden } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ taskId: string }> };

// GET /api/tasks/[taskId] - Get single task
export async function GET(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:read");
    const { taskId } = await params;
    const taskIdNum = parseInt(taskId, 10);

    // First try loading task owned by session org
    let task = await db.query.tasks.findFirst({
      where: (t, { eq, and }) =>
        and(
          eq(t.id, taskIdNum),
          eq(t.organizationId, session.organizationId)
        ),
    });

    // If not found, check cross-org access (shared task or assigned via collaboration)
    if (!task) {
      const crossOrgTask = await db.query.tasks.findFirst({
        where: (t, { eq }) => eq(t.id, taskIdNum),
      });

      if (crossOrgTask?.eventId) {
        const [collab] = await db
          .select({ id: eventCollaborations.id })
          .from(eventCollaborations)
          .where(
            and(
              eq(eventCollaborations.eventId, crossOrgTask.eventId),
              eq(eventCollaborations.guestOrgId, session.organizationId),
              eq(eventCollaborations.status, "active"),
            ),
          )
          .limit(1);

        if (collab) {
          // Check if task is shared with host or assigned to this org
          const isShared = crossOrgTask.sharedWithHost;
          const [isAssigned] = await db
            .select({ id: taskParticipants.id })
            .from(taskParticipants)
            .where(
              and(
                eq(taskParticipants.taskId, taskIdNum),
                eq(taskParticipants.collaboratorOrgId, session.organizationId),
              ),
            )
            .limit(1);

          if (isShared || isAssigned) {
            task = crossOrgTask;
          }
        }
      }
    }

    if (!task) {
      return notFound("Task not found");
    }

    // For eventScoped roles on owned tasks, verify access
    if (session.eventScoped && task.organizationId === session.organizationId) {
      const access = await canAccessTask(session, taskIdNum);
      if (!access.allowed) {
        return forbidden(access.reason || "Sin acceso");
      }
    }

    return ok(task);
  }, "GET /api/tasks/[taskId]");
}

// PATCH /api/tasks/[taskId] - Update task
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:update");
    const { taskId } = await params;
    const body = await request.json();

    // Remove undefined values and handle date conversion
    const cleanBody: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) {
        if (key === "dueDate" && value) {
          cleanBody[key] = new Date(value as string);
        } else {
          cleanBody[key] = value;
        }
      }
    }

    const taskIdNum = parseInt(taskId, 10);

    // Get current task (owned by session org, or cross-org)
    let currentTask = await db.query.tasks.findFirst({
      where: (t, { eq, and: a }) => a(
        eq(t.id, taskIdNum),
        eq(t.organizationId, session.organizationId)
      ),
      columns: { assignedTo: true, status: true, title: true, eventId: true, organizationId: true },
    });

    // Cross-org: guest updating own task in collaborated event
    if (!currentTask) {
      const crossTask = await db.query.tasks.findFirst({
        where: (t, { eq }) => eq(t.id, taskIdNum),
        columns: { assignedTo: true, status: true, title: true, eventId: true, organizationId: true },
      });
      if (crossTask && crossTask.organizationId === session.organizationId) {
        currentTask = crossTask;
      }
    }

    // For eventScoped roles, verify section-level permissions
    if (session.eventScoped && currentTask?.eventId) {
      await requireEventSectionAccess(currentTask.eventId, "tasks", "edit");
    }

    const [updated] = await db.update(tasks)
      .set({ ...cleanBody, updatedAt: new Date() })
      .where(
        and(
          eq(tasks.id, taskIdNum),
          eq(tasks.organizationId, session.organizationId)
        )
      )
      .returning();

    if (!updated) {
      return notFound("Task not found");
    }

    // Send push notifications for relevant changes (async, don't wait)
    const userName = session.user.name || "Alguien";

    // Notify if assignee changed
    if (cleanBody.assignedTo && cleanBody.assignedTo !== currentTask?.assignedTo) {
      notifyTaskAssigned(
        taskIdNum,
        updated.title,
        cleanBody.assignedTo as string,
        userName,
        session.organizationId
      ).catch(err => console.error("Push notification failed:", err));
    }

    // Notify if status changed
    if (cleanBody.status && cleanBody.status !== currentTask?.status) {
      notifyTaskStatusChanged(
        taskIdNum,
        updated.title,
        cleanBody.status as string,
        session.user.userId,
        userName
      ).catch(err => console.error("Push notification failed:", err));
    }

    return ok(updated);
  }, "PATCH /api/tasks/[taskId]");
}

// DELETE /api/tasks/[taskId] - Delete task
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:update");
    const { taskId } = await params;

    // For eventScoped roles, verify section-level permissions
    if (session.eventScoped) {
      const task = await db.query.tasks.findFirst({
        where: (t, { eq, and: a }) => a(eq(t.id, parseInt(taskId, 10)), eq(t.organizationId, session.organizationId)),
        columns: { eventId: true },
      });
      if (task?.eventId) {
        await requireEventSectionAccess(task.eventId, "tasks", "edit");
      }
    }

    await db.delete(tasks)
      .where(
        and(
          eq(tasks.id, parseInt(taskId, 10)),
          eq(tasks.organizationId, session.organizationId)
        )
      );

    return ok({ message: "Task deleted" });
  }, "DELETE /api/tasks/[taskId]");
}
