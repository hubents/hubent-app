import { NextRequest, NextResponse } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { checkEventSectionAccess } from "@/lib/event-permissions";
import type { TenantSession } from "@/types";
import { db } from "@/db";
import { eventScheduleItems, tasks, taskScheduleItems, vendors } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";

type RouteParams = { params: Promise<{ eventId: string }> };

const createSchema = z.object({
  title: z.string().min(1, "title is required").max(500),
  date: z.string().min(1, "date is required"),
  description: z.string().max(2000).nullish(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm").nullish(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm").nullish(),
  location: z.string().max(500).nullish(),
  notes: z.string().max(2000).nullish(),
  color: z.string().max(20).nullish(),
  sortOrder: z.number().int().min(0).optional(),
});

const updateSchema = z.object({
  scheduleItemId: z.number().int().positive(),
  title: z.string().min(1).max(500).optional(),
  date: z.string().min(1).optional(),
  description: z.string().max(2000).nullish(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).nullish(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).nullish(),
  location: z.string().max(500).nullish(),
  notes: z.string().max(2000).nullish(),
  color: z.string().max(20).nullish(),
  sortOrder: z.number().int().min(0).optional(),
});

function parseEventId(str: string): number | null {
  const n = parseInt(str, 10);
  return isNaN(n) ? null : n;
}

async function requireScheduleAccess(
  eventId: number,
  level: "view" | "edit" = "view"
): Promise<TenantSession> {
  try {
    return await requireEventSectionAccess(eventId, "calendar", level);
  } catch {
    return await requireEventSectionAccess(eventId, "runsheet", level);
  }
}

// GET /api/events/[eventId]/schedule - List event schedule items + task schedule items
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId: eventIdStr } = await params;
    const eventId = parseEventId(eventIdStr);
    if (!eventId) return NextResponse.json({ success: false, error: "Invalid eventId" }, { status: 400 });
    const session = await requireScheduleAccess(eventId, "view");

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");

    // Fetch event-level schedule items
    const eventItems = await db
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
        taskTitle: tasks.title,
        vendorName: vendors.name,
      })
      .from(taskScheduleItems)
      .innerJoin(tasks, eq(taskScheduleItems.taskId, tasks.id))
      .leftJoin(vendors, eq(taskScheduleItems.vendorId, vendors.id))
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
        vendorId: null,
        vendorName: null,
      })),
      ...taskItems.map((item) => ({
        ...item,
        eventId,
        organizationId: session.organizationId,
        color: null,
        source: "task" as const,
        vendorName: item.vendorName || null,
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
    const eventId = parseEventId(eventIdStr);
    if (!eventId) return NextResponse.json({ success: false, error: "Invalid eventId" }, { status: 400 });
    const session = await requireScheduleAccess(eventId, "edit");

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const { title, description, date, startTime, endTime, location, notes, color, sortOrder } = parsed.data;

    const [item] = await db.insert(eventScheduleItems).values({
      eventId,
      organizationId: session.organizationId,
      title,
      description: description ?? null,
      date: new Date(date),
      startTime: startTime ?? null,
      endTime: endTime ?? null,
      location: location ?? null,
      notes: notes ?? null,
      color: color ?? null,
      sortOrder: sortOrder ?? 0,
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
    const eventId = parseEventId(eventIdStr);
    if (!eventId) return NextResponse.json({ success: false, error: "Invalid eventId" }, { status: 400 });
    await requireScheduleAccess(eventId, "edit");

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const { scheduleItemId, ...fields } = parsed.data;

    const setData: Record<string, unknown> = { updatedAt: new Date() };
    if (fields.title !== undefined) setData.title = fields.title;
    if (fields.date !== undefined) setData.date = new Date(fields.date);
    if (fields.description !== undefined) setData.description = fields.description;
    if (fields.startTime !== undefined) setData.startTime = fields.startTime;
    if (fields.endTime !== undefined) setData.endTime = fields.endTime;
    if (fields.location !== undefined) setData.location = fields.location;
    if (fields.notes !== undefined) setData.notes = fields.notes;
    if (fields.color !== undefined) setData.color = fields.color;
    if (fields.sortOrder !== undefined) setData.sortOrder = fields.sortOrder;

    const [updated] = await db.update(eventScheduleItems)
      .set(setData)
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
    const eventId = parseEventId(eventIdStr);
    if (!eventId) return NextResponse.json({ success: false, error: "Invalid eventId" }, { status: 400 });
    await requireScheduleAccess(eventId, "edit");

    const { searchParams } = new URL(request.url);
    const scheduleItemIdStr = searchParams.get("scheduleItemId");
    const scheduleItemId = scheduleItemIdStr ? parseInt(scheduleItemIdStr, 10) : NaN;

    if (!scheduleItemIdStr || isNaN(scheduleItemId)) {
      return NextResponse.json(
        { success: false, error: "scheduleItemId is required" },
        { status: 400 }
      );
    }

    const deleted = await db.delete(eventScheduleItems)
      .where(
        and(
          eq(eventScheduleItems.id, scheduleItemId),
          eq(eventScheduleItems.eventId, eventId)
        )
      )
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { success: false, error: "Schedule item not found" },
        { status: 404 }
      );
    }

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
