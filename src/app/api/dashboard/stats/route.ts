import { NextResponse } from "next/server";
import { db } from "@/db";
import { requireAuth } from "@/lib/session";
import { events, tasks } from "@/db/schema";
import { eq, and, count, inArray } from "drizzle-orm";
import { getUserEventAccess } from "@/lib/event-permissions";

export async function GET() {
  try {
    const session = await requireAuth();
    const orgId = session.organizationId;

    // For eventScoped users, restrict to their assigned events
    let allowedEventIds: number[] | null = null;
    if (session.eventScoped) {
      const access = await getUserEventAccess(session.user.userId);
      allowedEventIds = access.map((a) => a.eventId);
    }

    // Count events for this organization
    const eventsResult = await db
      .select({ count: count() })
      .from(events)
      .where(
        and(
          eq(events.organizationId, orgId),
          ...(allowedEventIds !== null ? [inArray(events.id, allowedEventIds)] : [])
        )
      );

    // Count pending tasks for this organization
    const tasksResult = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.organizationId, orgId),
          eq(tasks.status, "pending"),
          ...(allowedEventIds !== null ? [inArray(tasks.eventId, allowedEventIds)] : [])
        )
      );

    // Get recent events
    const recentEvents = await db.query.events.findMany({
      where: and(
        eq(events.organizationId, orgId),
        ...(allowedEventIds !== null ? [inArray(events.id, allowedEventIds)] : [])
      ),
      orderBy: (events, { desc }) => [desc(events.createdAt)],
      limit: 5,
    });

    // Get pending tasks
    const pendingTasksList = await db.query.tasks.findMany({
      where: and(
        eq(tasks.organizationId, orgId),
        eq(tasks.status, "pending"),
        ...(allowedEventIds !== null ? [inArray(tasks.eventId, allowedEventIds)] : [])
      ),
      orderBy: (tasks, { asc }) => [asc(tasks.dueDate)],
      limit: 5,
    });

    return NextResponse.json({
      totalEvents: eventsResult[0]?.count || 0,
      pendingTasks: tasksResult[0]?.count || 0,
      pendingPayments: 0, // TODO: implement when payments are ready
      activeLeads: 0, // TODO: implement when leads are ready
      recentEvents: recentEvents.map((e) => ({
        id: e.id,
        name: e.name,
        date: e.date,
        status: e.status,
        guestCount: e.guestCount,
      })),
      pendingTasksList: pendingTasksList.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate,
      })),
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Error al cargar estadísticas" },
      { status: 500 }
    );
  }
}
