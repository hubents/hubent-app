import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import { tasks, events, users, eventParticipants } from "@/db/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { withMonitoring } from "@/lib/monitoring";

// GET /api/tasks - List tasks
export const GET = withMonitoring(async (request: NextRequest) => {
  const session = await requirePermission("tasks:read");
    const { searchParams } = new URL(request.url);
    
    const eventId = searchParams.get("eventId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;

    let whereClause = eq(tasks.organizationId, session.organizationId);

    if (eventId) {
      whereClause = and(whereClause, eq(tasks.eventId, parseInt(eventId, 10)))!;
    }

    if (status) {
      whereClause = and(whereClause, eq(tasks.status, status as "pending" | "in_progress" | "completed" | "cancelled"))!;
    }

    // For eventScoped roles, only show tasks from events where user is a participant
    if (session.eventScoped) {
      whereClause = and(
        whereClause,
        sql`${tasks.eventId} IN (
          SELECT ${eventParticipants.eventId}
          FROM ${eventParticipants}
          WHERE ${eventParticipants.userId} = ${session.user.userId}
        )`
      )!;
    }

    const results = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        eventId: tasks.eventId,
        assignedTo: tasks.assignedTo,
        sortOrder: tasks.sortOrder,
        createdAt: tasks.createdAt,
        eventName: events.name,
        assignedUserName: users.name,
      })
      .from(tasks)
      .leftJoin(events, eq(tasks.eventId, events.id))
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .where(whereClause)
      .orderBy(asc(tasks.sortOrder), desc(tasks.createdAt))
      .limit(limit)
      .offset(offset);

  return NextResponse.json({
    success: true,
    data: results,
  });
}, { name: "GET /api/tasks" });

// POST /api/tasks - Create task
export const POST = withMonitoring(async (request: NextRequest) => {
  const session = await requirePermission("tasks:create");
    const body = await request.json();

    const { title, description, priority, dueDate, eventId, assignedTo } = body;

    // For eventScoped roles, verify section-level permissions on the target event
    if (eventId && session.eventScoped) {
      await requireEventSectionAccess(eventId, "tasks", "edit");
    }

    if (!title) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Title is required" } },
        { status: 400 }
      );
    }

    // Get max sortOrder for the event/status to place new task at end
    const maxOrderResult = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${tasks.sortOrder}), 0)` })
      .from(tasks)
      .where(
        and(
          eq(tasks.organizationId, session.organizationId),
          eventId ? eq(tasks.eventId, eventId) : sql`${tasks.eventId} IS NULL`,
          eq(tasks.status, body.status || "pending")
        )
      );
    const nextSortOrder = (maxOrderResult[0]?.maxOrder || 0) + 1;

    const [task] = await db.insert(tasks).values({
      organizationId: session.organizationId,
      title,
      description,
      status: body.status || "pending",
      priority: priority || "medium",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      eventId,
      assignedTo: assignedTo || session.user.userId,
      createdBy: session.user.userId,
      sortOrder: nextSortOrder,
    }).returning();

  return NextResponse.json({
    success: true,
    data: task,
  });
}, { name: "POST /api/tasks" });
