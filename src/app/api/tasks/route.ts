import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import {
  tasks,
  events,
  users,
  eventParticipants,
  taskParticipants,
  providerEventAccess,
} from "@/db/schema";
import { eq, and, desc, asc, sql, isNull, isNotNull } from "drizzle-orm";
import { withMonitoring } from "@/lib/monitoring";

// GET /api/tasks - List tasks
export const GET = withMonitoring(
  async (request: NextRequest) => {
    const session = await requirePermission("tasks:read");
    const { searchParams } = new URL(request.url);

    const eventId = searchParams.get("eventId");
    const scope = searchParams.get("scope") as
      | "standalone"
      | "event"
      | "all"
      | null;
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;

    let whereClause = eq(tasks.organizationId, session.organizationId);

    if (eventId) {
      whereClause = and(whereClause, eq(tasks.eventId, parseInt(eventId, 10)))!;
    } else if (scope === "standalone") {
      whereClause = and(whereClause, isNull(tasks.eventId))!;
    } else if (scope === "event") {
      whereClause = and(whereClause, isNotNull(tasks.eventId))!;
    }

    if (status) {
      whereClause = and(
        whereClause,
        eq(
          tasks.status,
          status as "pending" | "in_progress" | "completed" | "cancelled",
        ),
      )!;
    }

    // For eventScoped roles, apply participation-based filtering:
    // - tasks:edit on event → see ALL tasks in that event
    // - tasks:view on event → see ONLY tasks where user is task_participant, assignedTo, or createdBy
    if (session.eventScoped) {
      whereClause = and(
        whereClause,
        sql`(
          ${tasks.eventId} IN (
            SELECT ${eventParticipants.eventId}
            FROM ${eventParticipants}
            WHERE ${eventParticipants.userId} = ${session.user.userId}
              AND ${eventParticipants.permissions}->>'tasks' = 'edit'
          )
          OR ${tasks.id} IN (
            SELECT ${taskParticipants.taskId}
            FROM ${taskParticipants}
            WHERE ${taskParticipants.userId} = ${session.user.userId}
          )
          OR ${tasks.assignedTo} = ${session.user.userId}
          OR ${tasks.createdBy} = ${session.user.userId}
        )`,
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
  },
  { name: "GET /api/tasks" },
);

// POST /api/tasks - Create task
export const POST = withMonitoring(
  async (request: NextRequest) => {
    const session = await requirePermission("tasks:create");
    const body = await request.json();

    const { title, description, priority, dueDate, eventId, assignedTo } = body;

    // For eventScoped roles, verify section-level permissions on the target event
    if (eventId && session.eventScoped) {
      await requireEventSectionAccess(eventId, "tasks", "edit");
    }

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Title is required" },
        },
        { status: 400 },
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
          eq(tasks.status, body.status || "pending"),
        ),
      );
    const nextSortOrder = (maxOrderResult[0]?.maxOrder || 0) + 1;

    const [task] = await db
      .insert(tasks)
      .values({
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
      })
      .returning();

    // Auto-add vendor participants for active providers in this event (non-blocking)
    if (eventId) {
      (async () => {
        try {
          const activeProviders = await db
            .select({ vendorId: providerEventAccess.vendorId })
            .from(providerEventAccess)
            .where(
              and(
                eq(providerEventAccess.eventId, eventId),
                eq(providerEventAccess.status, "active"),
              ),
            );

          let vendorsLinked = 0;
          for (const p of activeProviders) {
            if (!p.vendorId) continue;
            const exists = await db.query.taskParticipants.findFirst({
              where: and(
                eq(taskParticipants.taskId, task.id),
                eq(taskParticipants.vendorId, p.vendorId),
              ),
            });
            if (exists) continue;
            await db.insert(taskParticipants).values({
              taskId: task.id,
              vendorId: p.vendorId,
              type: "vendor",
              canEdit: false,
              canComment: true,
              addedBy: session.user.userId,
            });
            vendorsLinked++;
          }
          if (vendorsLinked > 0) {
            console.log(
              `[createTask] taskId=${task.id} eventId=${eventId} vendorsLinked=${vendorsLinked}`,
            );
          }
        } catch (err) {
          console.error(
            "[createTask] auto-add vendor participants failed:",
            err,
          );
        }
      })();
    }

    return NextResponse.json({
      success: true,
      data: task,
    });
  },
  { name: "POST /api/tasks" },
);
