import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { tasks, events, users } from "@/db/schema";
import { eq, and, desc, gt, count, ilike, asc } from "drizzle-orm";
import { parsePaginationParams, buildPaginatedResponse, parseFilterParams } from "@/lib/api/api-utils";
import { validationError } from "@/lib/api/api-errors";
import { dispatchWebhookEvent } from "@/lib/api/api-webhooks";
import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
  priority: z.string().optional(),
  due_date: z.string().datetime().optional(),
  event_id: z.number().int().optional(),
  assigned_to: z.string().optional(),
  category: z.string().optional(),
});

export const GET = withApiAuth(
  async (request: NextRequest, { session }) => {
    const { searchParams } = new URL(request.url);
    const { limit, startingAfter } = parsePaginationParams(searchParams);
    const filters = parseFilterParams(searchParams, ["status", "priority", "event_id", "assigned_to", "search"]);

    let whereClause = eq(tasks.organizationId, session.organizationId);

    if (filters.status) {
      whereClause = and(whereClause, eq(tasks.status, filters.status as "pending" | "in_progress" | "completed" | "cancelled"))!;
    }
    if (filters.priority) {
      whereClause = and(whereClause, eq(tasks.priority, filters.priority))!;
    }
    if (filters.event_id) {
      whereClause = and(whereClause, eq(tasks.eventId, parseInt(filters.event_id, 10)))!;
    }
    if (filters.assigned_to) {
      whereClause = and(whereClause, eq(tasks.assignedTo, filters.assigned_to))!;
    }
    if (filters.search) {
      whereClause = and(whereClause, ilike(tasks.title, `%${filters.search}%`))!;
    }
    if (startingAfter) {
      whereClause = and(whereClause, gt(tasks.id, startingAfter))!;
    }

    const [totalResult] = await db.select({ count: count() }).from(tasks)
      .where(eq(tasks.organizationId, session.organizationId));

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
        category: tasks.category,
        sortOrder: tasks.sortOrder,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        eventName: events.name,
        assignedUserName: users.name,
      })
      .from(tasks)
      .leftJoin(events, eq(tasks.eventId, events.id))
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .where(whereClause)
      .orderBy(asc(tasks.sortOrder), desc(tasks.createdAt))
      .limit(limit);

    return {
      data: buildPaginatedResponse(
        results.map((t) => ({ object: "task" as const, ...t })),
        totalResult?.count ?? 0,
        "/api/v1/tasks",
        limit
      ),
    };
  },
  { scope: "tasks:read" }
);

export const POST = withApiAuth(
  async (request: NextRequest, { session }) => {
    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.issues[0].message, parsed.error.issues[0].path.join("."));

    const d = parsed.data;
    const [task] = await db.insert(tasks).values({
      organizationId: session.organizationId,
      title: d.title,
      description: d.description,
      status: d.status || "pending",
      priority: d.priority || "medium",
      dueDate: d.due_date ? new Date(d.due_date) : null,
      eventId: d.event_id,
      assignedTo: d.assigned_to,
      category: d.category,
    }).returning();

    void dispatchWebhookEvent(session.organizationId, "task.created", { ...task }).catch(() => {});

    return { status: 201, data: { object: "task", ...task } };
  },
  { scope: "tasks:write", idempotent: true }
);
