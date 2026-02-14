import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { taskMeetings, tasks } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

type RouteParams = { params: Promise<{ taskId: string }> };

// GET /api/tasks/[taskId]/meetings - List task meetings
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
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
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    const meetings = await db
      .select()
      .from(taskMeetings)
      .where(eq(taskMeetings.taskId, parseInt(taskId, 10)))
      .orderBy(asc(taskMeetings.sortOrder), asc(taskMeetings.date));

    return NextResponse.json({
      success: true,
      data: meetings,
    });
  } catch (error) {
    console.error("GET /api/tasks/[taskId]/meetings error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch meetings";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}

// POST /api/tasks/[taskId]/meetings - Add meeting to task
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("tasks:update");
    const { taskId } = await params;
    const body = await request.json();

    const { title, description, date, startTime, endTime, location, notes, sortOrder } = body;

    if (!title || !date) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "title and date are required" } },
        { status: 400 }
      );
    }

    // Verify task belongs to organization
    const task = await db.query.tasks.findFirst({
      where: (t, { eq, and }) =>
        and(
          eq(t.id, parseInt(taskId, 10)),
          eq(t.organizationId, session.organizationId)
        ),
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
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

    return NextResponse.json({
      success: true,
      data: meeting,
    });
  } catch (error) {
    console.error("POST /api/tasks/[taskId]/meetings error:", error);
    const message = error instanceof Error ? error.message : "Failed to add meeting";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 400;
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status }
    );
  }
}

// PATCH /api/tasks/[taskId]/meetings - Update meeting
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("tasks:update");
    const { taskId } = await params;
    const body = await request.json();

    const { meetingId, ...updateData } = body;

    if (!meetingId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "meetingId is required" } },
        { status: 400 }
      );
    }

    // Verify task belongs to organization
    const task = await db.query.tasks.findFirst({
      where: (t, { eq, and }) =>
        and(
          eq(t.id, parseInt(taskId, 10)),
          eq(t.organizationId, session.organizationId)
        ),
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    // Convert date if present
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

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update meeting";
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// DELETE /api/tasks/[taskId]/meetings - Delete meeting
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("tasks:update");
    const { taskId } = await params;
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get("meetingId");

    if (!meetingId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "meetingId is required" } },
        { status: 400 }
      );
    }

    // Verify task belongs to organization
    const task = await db.query.tasks.findFirst({
      where: (t, { eq, and }) =>
        and(
          eq(t.id, parseInt(taskId, 10)),
          eq(t.organizationId, session.organizationId)
        ),
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    await db.delete(taskMeetings)
      .where(
        and(
          eq(taskMeetings.id, parseInt(meetingId, 10)),
          eq(taskMeetings.taskId, parseInt(taskId, 10))
        )
      );

    return NextResponse.json({
      success: true,
      data: { message: "Meeting deleted" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete meeting";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
