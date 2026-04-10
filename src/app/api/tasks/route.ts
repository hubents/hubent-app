import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireAuth, requireEventSectionAccess } from "@/lib/session";
import { db } from "@/db";
import {
  tasks,
  events,
  users,
  eventParticipants,
  taskParticipants,
  providerEventAccess,
  eventCollaborations,
  vendors,
} from "@/db/schema";
import { eq, and, desc, asc, sql, isNull, isNotNull, inArray } from "drizzle-orm";
import { withMonitoring } from "@/lib/monitoring";

// GET /api/tasks - List tasks
// Supports ?scope=collaborated (tasks from events invited via providerEventAccess)
export const GET = withMonitoring(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);

    const scope = searchParams.get("scope") as
      | "standalone"
      | "event"
      | "all"
      | "collaborated"
      | null;

    if (scope === "collaborated") {
      const session = await requireAuth();
      return getCollaboratedTasks(session);
    }

    const session = await requirePermission("tasks:read");

    const eventId = searchParams.get("eventId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;

    let whereClause = eq(tasks.organizationId, session.organizationId);

    if (eventId) {
      const eid = parseInt(eventId, 10);
      // Check if session org owns the event or is a guest collaborator
      const event = await db.query.events.findFirst({
        where: eq(events.id, eid),
        columns: { id: true, organizationId: true },
      });

      if (event && event.organizationId === session.organizationId) {
        // Host viewing own event: own tasks + guest shared tasks
        whereClause = and(
          eq(tasks.eventId, eid),
          sql`(${tasks.organizationId} = ${session.organizationId} OR ${tasks.sharedWithHost} = true)`,
        )!;
      } else {
        // Guest viewing collaborated event: check scope to determine visibility
        const [collab] = await db
          .select({ permissions: eventCollaborations.permissions })
          .from(eventCollaborations)
          .where(
            and(
              eq(eventCollaborations.eventId, eid),
              eq(eventCollaborations.guestOrgId, session.organizationId),
              eq(eventCollaborations.status, "active"),
            ),
          )
          .limit(1);

        const collabScope = (collab?.permissions as Record<string, string> | null)?.scope || "full";

        if (collabScope === "full") {
          whereClause = eq(tasks.eventId, eid);
        } else {
          whereClause = and(
            eq(tasks.eventId, eid),
            sql`(
              ${tasks.organizationId} = ${session.organizationId}
              OR ${tasks.id} IN (
                SELECT ${taskParticipants.taskId} FROM ${taskParticipants}
                WHERE ${taskParticipants.collaboratorOrgId} = ${session.organizationId}
              )
            )`,
          )!;
        }
      }
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

    const [results, [countResult]] = await Promise.all([
      db
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
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(tasks)
        .where(whereClause),
    ]);

    return NextResponse.json({
      success: true,
      data: results,
      meta: { total: countResult.count, page, limit },
    });
  },
  { name: "GET /api/tasks" },
);

async function getCollaboratedTasks(session: { organizationId: number; user: { userId: string } }) {
  const collabAccess = await db
    .select({
      eventId: eventCollaborations.eventId,
      permissions: eventCollaborations.permissions,
    })
    .from(eventCollaborations)
    .where(
      and(
        eq(eventCollaborations.guestOrgId, session.organizationId),
        eq(eventCollaborations.status, "active"),
      ),
    );

  // Fallback: legacy provider_event_access (always treated as scope: "full")
  const legacyAccess = await db
    .select({ eventId: providerEventAccess.eventId })
    .from(providerEventAccess)
    .where(
      and(
        eq(providerEventAccess.providerOrgId, session.organizationId),
        eq(providerEventAccess.status, "active"),
      ),
    );

  const collabEventIds = new Set(collabAccess.map((a) => a.eventId));

  const fullScopeEventIds: number[] = [];
  const participantScopeEventIds: number[] = [];

  for (const c of collabAccess) {
    const scope = (c.permissions as Record<string, string> | null)?.scope || "full";
    if (scope === "participant") {
      participantScopeEventIds.push(c.eventId);
    } else {
      fullScopeEventIds.push(c.eventId);
    }
  }

  // Legacy rows not in event_collaborations are treated as full scope
  for (const l of legacyAccess) {
    if (!collabEventIds.has(l.eventId)) {
      fullScopeEventIds.push(l.eventId);
    }
  }

  const allEventIds = [...fullScopeEventIds, ...participantScopeEventIds];

  if (allEventIds.length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

  const linkedVendors = await db
    .select({ id: vendors.id })
    .from(vendors)
    .where(eq(vendors.providerOrgId, session.organizationId));
  const vendorIds = linkedVendors.map((v) => v.id);

  const participantFilter = sql`(
    ${tasks.organizationId} = ${session.organizationId}
    OR ${tasks.id} IN (
      SELECT ${taskParticipants.taskId}
      FROM ${taskParticipants}
      WHERE ${taskParticipants.collaboratorOrgId} = ${session.organizationId}
    )
    ${vendorIds.length > 0 ? sql`OR ${tasks.id} IN (
      SELECT ${taskParticipants.taskId}
      FROM ${taskParticipants}
      WHERE ${taskParticipants.vendorId} IN (${sql.join(vendorIds.map(id => sql`${id}`), sql`, `)})
    )` : sql``}
  )`;

  let whereClause;

  if (fullScopeEventIds.length > 0 && participantScopeEventIds.length > 0) {
    whereClause = sql`(
      (${inArray(tasks.eventId, fullScopeEventIds)})
      OR (${inArray(tasks.eventId, participantScopeEventIds)} AND ${participantFilter})
    )`;
  } else if (fullScopeEventIds.length > 0) {
    whereClause = inArray(tasks.eventId, fullScopeEventIds);
  } else {
    whereClause = and(
      inArray(tasks.eventId, participantScopeEventIds),
      participantFilter,
    );
  }

  const taskList = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      eventId: tasks.eventId,
      eventName: events.name,
      eventDate: events.date,
      createdAt: tasks.createdAt,
      sharedWithHost: tasks.sharedWithHost,
    })
    .from(tasks)
    .innerJoin(events, eq(events.id, tasks.eventId))
    .where(whereClause)
    .orderBy(desc(tasks.dueDate));

  return NextResponse.json({ success: true, data: taskList });
}

// POST /api/tasks - Create task
// Supports guest org creating private tasks in collaborated events
export const POST = withMonitoring(
  async (request: NextRequest) => {
    const session = await requirePermission("tasks:create");
    const body = await request.json();

    const { title, description, priority, dueDate, eventId, assignedTo } = body;

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Title is required" },
        },
        { status: 400 },
      );
    }

    let isGuestTask = false;

    if (eventId) {
      // Check if event belongs to session org (host) or if session org is a guest collaborator
      const event = await db.query.events.findFirst({
        where: eq(events.id, eventId),
        columns: { id: true, organizationId: true },
      });

      if (!event) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Event not found" } },
          { status: 404 },
        );
      }

      if (event.organizationId === session.organizationId) {
        // Host creating task in own event
        if (session.eventScoped) {
          await requireEventSectionAccess(eventId, "tasks", "edit");
        }
      } else {
        // Guest org creating task in host's event -- verify active collaboration
        const [collab] = await db
          .select({ id: eventCollaborations.id, permissions: eventCollaborations.permissions })
          .from(eventCollaborations)
          .where(
            and(
              eq(eventCollaborations.eventId, eventId),
              eq(eventCollaborations.guestOrgId, session.organizationId),
              eq(eventCollaborations.status, "active"),
            ),
          )
          .limit(1);

        if (!collab) {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "No collaboration access to this event" } },
            { status: 403 },
          );
        }

        const perms = (collab.permissions || {}) as Record<string, string>;
        if (perms.tasks === "none") {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "No task access in this collaboration" } },
            { status: 403 },
          );
        }

        isGuestTask = true;
      }
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
        sharedWithHost: false,
      })
      .returning();

    // Auto-add collaborator participants for active event_collaborations (non-blocking)
    if (eventId && !isGuestTask) {
      (async () => {
        try {
          const activeCollabs = await db
            .select({
              guestOrgId: eventCollaborations.guestOrgId,
              permissions: eventCollaborations.permissions,
            })
            .from(eventCollaborations)
            .where(
              and(
                eq(eventCollaborations.eventId, eventId),
                eq(eventCollaborations.status, "active"),
              ),
            );

          let collabsLinked = 0;
          for (const c of activeCollabs) {
            if (!c.guestOrgId) continue;
            const perms = c.permissions as Record<string, string> | null;
            const collabScope = perms?.scope || "full";
            if (collabScope === "participant") continue;
            const taskPerm = perms?.tasks;
            if (taskPerm === "none") continue;
            const exists = await db.query.taskParticipants.findFirst({
              where: and(
                eq(taskParticipants.taskId, task.id),
                eq(taskParticipants.collaboratorOrgId, c.guestOrgId),
              ),
            });
            if (exists) continue;
            await db.insert(taskParticipants).values({
              taskId: task.id,
              collaboratorOrgId: c.guestOrgId,
              type: "vendor",
              canEdit: taskPerm === "edit",
              canComment: true,
              addedBy: session.user.userId,
            });
            collabsLinked++;
          }

          // Legacy: auto-add vendor participants from provider_event_access
          const activeProviders = await db
            .select({ vendorId: providerEventAccess.vendorId })
            .from(providerEventAccess)
            .where(
              and(
                eq(providerEventAccess.eventId, eventId),
                eq(providerEventAccess.status, "active"),
              ),
            );

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
          }
        } catch (err) {
          console.error("[createTask] auto-add participants failed:", err);
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
