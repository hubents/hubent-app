import { NextRequest } from "next/server";
import { requirePermission, requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import { taskScheduleItems, vendors } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { apiHandler, ok, created, notFound, badRequest } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ taskId: string }> };

async function findTask(taskId: number, organizationId: number) {
  return db.query.tasks.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.id, taskId), eq(t.organizationId, organizationId)),
  });
}

// GET /api/tasks/[taskId]/schedule - List task schedule items
export async function GET(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:read");
    const { taskId } = await params;
    const id = parseInt(taskId, 10);

    const task = await findTask(id, session.organizationId);
    if (!task) return notFound("Task not found");

    const scheduleItems = await db
      .select({
        id: taskScheduleItems.id,
        taskId: taskScheduleItems.taskId,
        vendorId: taskScheduleItems.vendorId,
        title: taskScheduleItems.title,
        description: taskScheduleItems.description,
        date: taskScheduleItems.date,
        startTime: taskScheduleItems.startTime,
        endTime: taskScheduleItems.endTime,
        location: taskScheduleItems.location,
        notes: taskScheduleItems.notes,
        sortOrder: taskScheduleItems.sortOrder,
        createdAt: taskScheduleItems.createdAt,
        updatedAt: taskScheduleItems.updatedAt,
        vendorName: vendors.name,
      })
      .from(taskScheduleItems)
      .leftJoin(vendors, eq(taskScheduleItems.vendorId, vendors.id))
      .where(eq(taskScheduleItems.taskId, id))
      .orderBy(asc(taskScheduleItems.sortOrder), asc(taskScheduleItems.date));

    return ok(scheduleItems);
  }, "GET /api/tasks/[taskId]/schedule");
}

// POST /api/tasks/[taskId]/schedule - Add schedule item to task
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:update");
    const { taskId } = await params;
    const id = parseInt(taskId, 10);
    const body = await request.json();

    const { title, description, date, startTime, endTime, location, notes, sortOrder, vendorId } = body;

    if (!title || !date) return badRequest("title and date are required");

    const task = await findTask(id, session.organizationId);
    if (!task) return notFound("Task not found");

    if (session.eventScoped && task.eventId) {
      await requireEventSectionAccess(task.eventId, "tasks", "edit");
    }

    const [scheduleItem] = await db.insert(taskScheduleItems).values({
      taskId: id,
      vendorId: vendorId || null,
      title,
      description,
      date: new Date(date),
      startTime,
      endTime,
      location,
      notes,
      sortOrder: sortOrder || 0,
    }).returning();

    return created(scheduleItem);
  }, "POST /api/tasks/[taskId]/schedule");
}

// PATCH /api/tasks/[taskId]/schedule - Update schedule item
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:update");
    const { taskId } = await params;
    const id = parseInt(taskId, 10);
    const body = await request.json();

    const { scheduleItemId, ...updateData } = body;

    if (!scheduleItemId) return badRequest("scheduleItemId is required");

    const task = await findTask(id, session.organizationId);
    if (!task) return notFound("Task not found");

    if (session.eventScoped && task.eventId) {
      await requireEventSectionAccess(task.eventId, "tasks", "edit");
    }

    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    const [updated] = await db.update(taskScheduleItems)
      .set({ ...updateData, updatedAt: new Date() })
      .where(
        and(
          eq(taskScheduleItems.id, scheduleItemId),
          eq(taskScheduleItems.taskId, id)
        )
      )
      .returning();

    return ok(updated);
  }, "PATCH /api/tasks/[taskId]/schedule");
}

// DELETE /api/tasks/[taskId]/schedule - Delete schedule item
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:update");
    const { taskId } = await params;
    const id = parseInt(taskId, 10);
    const { searchParams } = new URL(request.url);
    const scheduleItemId = searchParams.get("scheduleItemId");

    if (!scheduleItemId) return badRequest("scheduleItemId is required");

    const task = await findTask(id, session.organizationId);
    if (!task) return notFound("Task not found");

    if (session.eventScoped && task.eventId) {
      await requireEventSectionAccess(task.eventId, "tasks", "edit");
    }

    await db.delete(taskScheduleItems)
      .where(
        and(
          eq(taskScheduleItems.id, parseInt(scheduleItemId, 10)),
          eq(taskScheduleItems.taskId, id)
        )
      );

    return ok({ message: "Schedule item deleted" });
  }, "DELETE /api/tasks/[taskId]/schedule");
}
