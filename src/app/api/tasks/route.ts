import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { tasks, events, users } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// GET /api/tasks - List tasks
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole("viewer");
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
        createdAt: tasks.createdAt,
        eventName: events.name,
        assignedUserName: users.name,
      })
      .from(tasks)
      .leftJoin(events, eq(tasks.eventId, events.id))
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .where(whereClause)
      .orderBy(desc(tasks.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch tasks";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create task
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole("planner");
    const body = await request.json();

    const { title, description, priority, dueDate, eventId, assignedTo } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Title is required" } },
        { status: 400 }
      );
    }

    const [task] = await db.insert(tasks).values({
      organizationId: session.organizationId,
      title,
      description,
      status: "pending",
      priority: priority || "medium",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      eventId,
      assignedTo: assignedTo || session.user.userId,
      createdBy: session.user.userId,
    }).returning();

    return NextResponse.json({
      success: true,
      data: task,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create task";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}
