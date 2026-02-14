import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { providerEventAccess, tasks, events, organizations } from "@/db/schema";
import { eq, and, inArray, desc, sql } from "drizzle-orm";

/**
 * GET /api/vendor/tasks
 * List tasks from events where the current provider has active access
 */
export async function GET() {
  try {
    const session = await requireAuth();

    // Verify caller is a provider org
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.organizationId),
      columns: { orgType: true },
    });
    if (!org || org.orgType !== "provider") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Not a provider organization" } },
        { status: 403 }
      );
    }

    // Get event IDs where provider has active or pending access
    const accessList = await db
      .select({ eventId: providerEventAccess.eventId })
      .from(providerEventAccess)
      .where(
        and(
          eq(providerEventAccess.providerOrgId, session.organizationId),
          sql`${providerEventAccess.status} IN ('active', 'pending')`
        )
      );

    const eventIds = accessList.map((a) => a.eventId);

    if (eventIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Get tasks from those events
    const taskList = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        category: tasks.category,
        dueDate: tasks.dueDate,
        eventId: tasks.eventId,
        eventName: events.name,
        eventDate: events.date,
        createdAt: tasks.createdAt,
      })
      .from(tasks)
      .innerJoin(events, eq(events.id, tasks.eventId))
      .where(inArray(tasks.eventId, eventIds))
      .orderBy(desc(tasks.dueDate));

    return NextResponse.json({
      success: true,
      data: taskList,
    });
  } catch (error) {
    console.error("GET /api/vendor/tasks error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch tasks";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}
