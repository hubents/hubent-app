import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { organizations, vendors, taskParticipants, tasks, events, providerEventAccess, users } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { notifyTaskStatusChanged } from "@/lib/push-notifications";
import { isMarketplaceType } from "@/lib/tenant-type";

type RouteParams = { params: Promise<{ taskId: string }> };

/**
 * Verify that the caller is a provider org and has a vendor linked as task_participant.
 * Returns { vendorId, task } or throws.
 */
async function verifyVendorTaskAccess(
  session: { organizationId: number; user: { userId: string } },
  taskId: number
) {
  // Verify caller is a provider org
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, session.organizationId),
    columns: { orgType: true },
  });
  if (!org || !isMarketplaceType(org.orgType || "")) {
    throw { status: 403, code: "FORBIDDEN", message: "Not a provider organization" };
  }

  // Get vendor IDs linked to this provider org
  const linkedVendors = await db
    .select({ id: vendors.id })
    .from(vendors)
    .where(eq(vendors.providerOrgId, session.organizationId));

  const vendorIds = linkedVendors.map((v) => v.id);
  if (vendorIds.length === 0) {
    throw { status: 403, code: "FORBIDDEN", message: "No vendor records linked to provider org" };
  }

  // Verify at least one vendor is a task_participant for this task
  const participant = await db.query.taskParticipants.findFirst({
    where: and(
      eq(taskParticipants.taskId, taskId),
      inArray(taskParticipants.vendorId, vendorIds)
    ),
  });
  if (!participant) {
    throw { status: 403, code: "FORBIDDEN", message: "Vendor is not a participant of this task" };
  }

  // Get the task
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  });
  if (!task) {
    throw { status: 404, code: "NOT_FOUND", message: "Task not found" };
  }

  // Verify providerEventAccess is active for the task's event
  if (task.eventId) {
    const access = await db.query.providerEventAccess.findFirst({
      where: and(
        eq(providerEventAccess.providerOrgId, session.organizationId),
        eq(providerEventAccess.eventId, task.eventId),
        eq(providerEventAccess.status, "active")
      ),
    });
    if (!access) {
      throw { status: 403, code: "FORBIDDEN", message: "No active access to this event" };
    }
  }

  return { vendorId: participant.vendorId, task };
}

/**
 * GET /api/vendor/tasks/[taskId]
 * Get task detail for a provider (cross-org)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { taskId } = await params;
    const taskIdNum = parseInt(taskId, 10);
    if (isNaN(taskIdNum)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid task ID" } },
        { status: 400 }
      );
    }

    const { task } = await verifyVendorTaskAccess(session, taskIdNum);

    // Get event name
    let eventName: string | null = null;
    if (task.eventId) {
      const event = await db.query.events.findFirst({
        where: eq(events.id, task.eventId),
        columns: { name: true },
      });
      eventName = event?.name ?? null;
    }

    // Get participants (basic info only)
    const participantRows = await db
      .select({
        id: taskParticipants.id,
        userId: taskParticipants.userId,
        vendorId: taskParticipants.vendorId,
        type: taskParticipants.type,
        canEdit: taskParticipants.canEdit,
        canComment: taskParticipants.canComment,
      })
      .from(taskParticipants)
      .where(eq(taskParticipants.taskId, taskIdNum));

    // Enrich with names
    const participantsWithNames = await Promise.all(
      participantRows.map(async (p) => {
        let name: string | null = null;
        if (p.userId) {
          const user = await db.query.users.findFirst({
            where: eq(users.id, p.userId),
            columns: { name: true },
          });
          name = user?.name ?? null;
        } else if (p.vendorId) {
          const vendor = await db.query.vendors.findFirst({
            where: eq(vendors.id, p.vendorId),
            columns: { name: true },
          });
          name = vendor?.name ?? null;
        }
        return { ...p, name };
      })
    );

    // Get assigned user name
    let assignedUserName: string | null = null;
    if (task.assignedTo) {
      const assignee = await db.query.users.findFirst({
        where: eq(users.id, task.assignedTo),
        columns: { name: true },
      });
      assignedUserName = assignee?.name ?? null;
    }

    console.log(`[vendorTaskDetail] taskId=${taskIdNum} orgId=${session.organizationId}`);

    return NextResponse.json({
      success: true,
      data: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        category: task.category,
        dueDate: task.dueDate,
        eventId: task.eventId,
        eventName,
        assignedTo: task.assignedTo,
        assignedUserName,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        participants: participantsWithNames,
      },
    });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };
    if (err.status && err.code) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.status }
      );
    }
    console.error("GET /api/vendor/tasks/[taskId] error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch task";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}

/**
 * PATCH /api/vendor/tasks/[taskId]
 * Update task status only (cross-org, provider access)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { taskId } = await params;
    const taskIdNum = parseInt(taskId, 10);
    if (isNaN(taskIdNum)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid task ID" } },
        { status: 400 }
      );
    }
    const body = await request.json();

    const { task } = await verifyVendorTaskAccess(session, taskIdNum);

    // Only allow status updates
    const { status } = body;
    const allowedStatuses = ["pending", "in_progress", "completed"];
    if (!status || !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: `Status must be one of: ${allowedStatuses.join(", ")}` } },
        { status: 400 }
      );
    }

    const oldStatus = task.status;

    const [updated] = await db
      .update(tasks)
      .set({ status: status as "pending" | "in_progress" | "completed", updatedAt: new Date() })
      .where(eq(tasks.id, taskIdNum))
      .returning();

    console.log(`[vendorTaskPatch] taskId=${taskIdNum} oldStatus=${oldStatus} newStatus=${status} by=${session.user.userId}`);

    // Push notification to planner (async)
    const userName = session.user.name || "Un proveedor";
    notifyTaskStatusChanged(
      taskIdNum,
      updated.title,
      status,
      session.user.userId,
      userName
    ).catch((err) => console.error("[vendorTaskPatch] push notification failed:", err));

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };
    if (err.status && err.code) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.status }
      );
    }
    console.error("PATCH /api/vendor/tasks/[taskId] error:", error);
    const message = error instanceof Error ? error.message : "Failed to update task";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status }
    );
  }
}
