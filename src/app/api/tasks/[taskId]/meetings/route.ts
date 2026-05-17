import { NextRequest } from "next/server";
import { requirePermission, requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import { taskMeetings } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { apiHandler, ok, badRequest, notFound, created } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ taskId: string }> };

// GET /api/tasks/[taskId]/meetings - List task meetings
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

    const meetings = await db
      .select()
      .from(taskMeetings)
      .where(eq(taskMeetings.taskId, parseInt(taskId, 10)))
      .orderBy(asc(taskMeetings.sortOrder), asc(taskMeetings.date));

    return ok(meetings);
  }, "GET /api/tasks/[taskId]/meetings");
}

// POST /api/tasks/[taskId]/meetings - Add meeting to task
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:update");
    const { taskId } = await params;
    const body = await request.json();

    const { title, description, date, startTime, endTime, location, notes, sortOrder } = body;

    if (!title || !date) {
      return badRequest("title and date are required");
    }

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

    const [meeting] = await db.insert(taskMeetings).values({
      taskId: parseInt(taskId, 10),
      title,
      description,
      date: new Date(date),
      startTime,
      endTime,
      location,
      notes,
      sortOrder: sortOrder || 0,
    }).returning();

    return created(meeting);
  }, "POST /api/tasks/[taskId]/meetings");
}

// PATCH /api/tasks/[taskId]/meetings - Update meeting
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:update");
    const { taskId } = await params;
    const body = await request.json();

    const { meetingId, ...updateData } = body;

    if (!meetingId) {
      return badRequest("meetingId is required");
    }

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

    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    const [updated] = await db.update(taskMeetings)
      .set({ ...updateData, updatedAt: new Date() })
      .where(
        and(
          eq(taskMeetings.id, meetingId),
          eq(taskMeetings.taskId, parseInt(taskId, 10))
        )
      )
      .returning();

    return ok(updated);
  }, "PATCH /api/tasks/[taskId]/meetings");
}

// DELETE /api/tasks/[taskId]/meetings - Delete meeting
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:update");
    const { taskId } = await params;
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get("meetingId");

    if (!meetingId) {
      return badRequest("meetingId is required");
    }

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

    await db.delete(taskMeetings)
      .where(
        and(
          eq(taskMeetings.id, parseInt(meetingId, 10)),
          eq(taskMeetings.taskId, parseInt(taskId, 10))
        )
      );

    return ok({ message: "Meeting deleted" });
  }, "DELETE /api/tasks/[taskId]/meetings");
}
