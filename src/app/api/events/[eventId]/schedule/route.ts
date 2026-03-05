import { NextRequest, NextResponse } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import { eventScheduleItems, tasks, taskScheduleItems } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

type RouteParams = { params: Promise<{ eventId: string }> };

// GET /api/events/[eventId]/schedule - List event schedule items + task schedule items
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId: eventIdStr } = await params;
    const eventId = parseInt(eventIdStr, 10);
    const session = await requireEventSectionAccess(eventId, "general", "view");

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");

    // Fetch event-level schedule items
    let eventItems = await db
      .select()
      .from(eventScheduleItems)
      .where(
        and(
          eq(eventScheduleItems.eventId, eventId),
          eq(eventScheduleItems.organizationId, session.organizationId)
        )
      )
      .orderBy(asc(eventScheduleItems.date), asc(eventScheduleItems.sortOrder));

    // Fetch task schedule items from tasks belonging to this event
    const taskItems = await db
      .select({
        id: taskScheduleItems.id,
        taskId: taskScheduleItems.taskId,
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
        taskTitle: tasks.title,
      })
      .from(taskScheduleItems)
      .innerJoin(tasks, eq(taskScheduleItems.taskId, tasks.id))
      .where(
        and(
          eq(tasks.eventId, eventId),
          eq(tasks.organizationId, session.organizationId)
        )
      )
      .orderBy(asc(taskScheduleItems.date), asc(taskScheduleItems.sortOrder));

    // Combine and sort by date
    const combined = [
      ...eventItems.map((item) => ({
        ...item,
        source: "event" as const,
        taskTitle: null,
        taskId: null,
      })),
      ...taskItems.map((item) => ({
        ...item,
        eventId,
        organizationId: session.organizationId,
        color: null,
        source: "task" as const,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const data = limit ? combined.slice(0, parseInt(limit, 10)) : combined;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET /api/events/[eventId]/schedule error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch schedule";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}

// POST /api/events/[eventId]/schedule - Create event schedule item
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId: eventIdStr } = await params;
    const eventId = parseInt(eventIdStr, 10);
    const session = await requireEventSectionAccess(eventId, "general", "edit");

    const body = await request.json();
    const { title, description, date, startTime, endTime, location, notes, color, sortOrder } = body;

    if (!title || !date) {
      return NextResponse.json(
        { success: false, error: "title and date are required" },
        { status: 400 }
      );
    }

    const [item] = await db.insert(eventScheduleItems).values({
      eventId,
      organizationId: session.organizationId,
      title,
      description,
      date: new Date(date),
      startTime,
      endTime,
      location,
      notes,
      color,
      sortOrder: sortOrder || 0,
    }).returning();

    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error("POST /api/events/[eventId]/schedule error:", error);
    const message = error instanceof Error ? error.message : "Failed to create schedule item";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 400;
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}

// PATCH /api/events/[eventId]/schedule - Update event schedule item
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId: eventIdStr } = await params;
    const eventId = parseInt(eventIdStr, 10);
    await requireEventSectionAccess(eventId, "general", "edit");

    const body = await request.json();
    const { scheduleItemId, ...updateData } = body;

    if (!scheduleItemId) {
      return NextResponse.json(
        { success: false, error: "scheduleItemId is required" },
        { status: 400 }
      );
    }

    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    const [updated] = await db.update(eventScheduleItems)
      .set({ ...updateData, updatedAt: new Date() })
      .where(
        and(
          eq(eventScheduleItems.id, scheduleItemId),
          eq(eventScheduleItems.eventId, eventId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Schedule item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update schedule item";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 400;
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}

// DELETE /api/events/[eventId]/schedule - Delete event schedule item
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId: eventIdStr } = await params;
    const eventId = parseInt(eventIdStr, 10);
    await requireEventSectionAccess(eventId, "general", "edit");

    const { searchParams } = new URL(request.url);
    const scheduleItemId = searchParams.get("scheduleItemId");

    if (!scheduleItemId) {
      return NextResponse.json(
        { success: false, error: "scheduleItemId is required" },
        { status: 400 }
      );
    }

    await db.delete(eventScheduleItems)
      .where(
        and(
          eq(eventScheduleItems.id, parseInt(scheduleItemId, 10)),
          eq(eventScheduleItems.eventId, eventId)
        )
      );

    return NextResponse.json({ success: true, data: { message: "Schedule item deleted" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete schedule item";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 400;
    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
