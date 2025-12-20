import { NextResponse } from "next/server";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { events, tasks, organizationMembers } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Get user's organization
    const membership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, session.user.id),
    });

    if (!membership) {
      // User has no organization - return empty stats
      return NextResponse.json({
        totalEvents: 0,
        pendingTasks: 0,
        pendingPayments: 0,
        activeLeads: 0,
        recentEvents: [],
        pendingTasksList: [],
      });
    }

    const orgId = membership.organizationId;

    // Count events for this organization
    const eventsResult = await db
      .select({ count: count() })
      .from(events)
      .where(eq(events.organizationId, orgId));

    // Count pending tasks for this organization
    const tasksResult = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.organizationId, orgId),
          eq(tasks.status, "pending")
        )
      );

    // Get recent events
    const recentEvents = await db.query.events.findMany({
      where: eq(events.organizationId, orgId),
      orderBy: (events, { desc }) => [desc(events.createdAt)],
      limit: 5,
    });

    // Get pending tasks
    const pendingTasksList = await db.query.tasks.findMany({
      where: and(
        eq(tasks.organizationId, orgId),
        eq(tasks.status, "pending")
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
