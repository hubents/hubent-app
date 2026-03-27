import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { providerEventAccess, tasks, events, organizations, taskParticipants, vendors, organizationMembers } from "@/db/schema";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import { isMarketplaceType } from "@/lib/tenant-type";

/**
 * GET /api/vendor/tasks
 * List tasks from events where the current provider has active access
 * AND the vendor is a task_participant or the task was created by a user from the provider org
 */
export async function GET() {
  try {
    const session = await requireAuth();

    // Verify caller is a provider org
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.organizationId),
      columns: { orgType: true },
    });
    if (!org || !isMarketplaceType(org.orgType || "")) {
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
          eq(providerEventAccess.status, "active")
        )
      );

    const eventIds = accessList.map((a) => a.eventId);

    if (eventIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Find vendor IDs linked to this provider org across planner orgs
    const linkedVendors = await db
      .select({ id: vendors.id })
      .from(vendors)
      .where(eq(vendors.providerOrgId, session.organizationId));

    const vendorIds = linkedVendors.map((v) => v.id);

    // Get tasks from those events WHERE vendor is a participant or task was created by provider org user
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
      .where(
        and(
          inArray(tasks.eventId, eventIds),
          sql`(
            ${vendorIds.length > 0 ? sql`${tasks.id} IN (
              SELECT ${taskParticipants.taskId}
              FROM ${taskParticipants}
              WHERE ${taskParticipants.vendorId} IN (${sql.join(vendorIds.map(id => sql`${id}`), sql`, `)})
            )` : sql`FALSE`}
            OR ${tasks.createdBy} IN (
              SELECT ${organizationMembers.userId}
              FROM ${organizationMembers}
              WHERE ${organizationMembers.organizationId} = ${session.organizationId}
            )
          )`
        )
      )
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
