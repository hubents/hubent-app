import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { providerEventAccess, events, organizations, tasks, taskParticipants, vendors } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

/**
 * GET /api/vendor/events
 * List events where the current provider org has access
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

    // Get vendor IDs linked to this provider org for task count subqueries
    const linkedVendors = await db
      .select({ id: vendors.id })
      .from(vendors)
      .where(eq(vendors.providerOrgId, session.organizationId));
    const vendorIds = linkedVendors.map((v) => v.id);

    const accessList = await db
      .select({
        accessId: providerEventAccess.id,
        status: providerEventAccess.status,
        invitedAt: providerEventAccess.invitedAt,
        acceptedAt: providerEventAccess.acceptedAt,
        eventId: events.id,
        eventName: events.name,
        eventDate: events.date,
        eventEndDate: events.endDate,
        eventStatus: events.status,
        eventLocation: events.location,
        plannerOrgName: organizations.name,
        plannerOrgLogo: organizations.logo,
        taskCount: vendorIds.length > 0
          ? sql<number>`(
              SELECT COUNT(DISTINCT ${tasks.id})
              FROM ${tasks}
              INNER JOIN ${taskParticipants} ON ${taskParticipants.taskId} = ${tasks.id}
              WHERE ${tasks.eventId} = ${events.id}
                AND ${taskParticipants.vendorId} IN (${sql.join(vendorIds.map(id => sql`${id}`), sql`, `)})
            )`.as("task_count")
          : sql<number>`0`.as("task_count"),
        pendingTaskCount: vendorIds.length > 0
          ? sql<number>`(
              SELECT COUNT(DISTINCT ${tasks.id})
              FROM ${tasks}
              INNER JOIN ${taskParticipants} ON ${taskParticipants.taskId} = ${tasks.id}
              WHERE ${tasks.eventId} = ${events.id}
                AND ${taskParticipants.vendorId} IN (${sql.join(vendorIds.map(id => sql`${id}`), sql`, `)})
                AND ${tasks.status} NOT IN ('completed', 'cancelled')
            )`.as("pending_task_count")
          : sql<number>`0`.as("pending_task_count"),
      })
      .from(providerEventAccess)
      .innerJoin(events, eq(events.id, providerEventAccess.eventId))
      .innerJoin(organizations, eq(organizations.id, providerEventAccess.plannerOrgId))
      .where(eq(providerEventAccess.providerOrgId, session.organizationId))
      .orderBy(desc(events.date));

    return NextResponse.json({ success: true, data: accessList });
  } catch (error) {
    console.error("GET /api/vendor/events error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch events";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}
