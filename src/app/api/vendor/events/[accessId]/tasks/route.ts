import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { providerEventAccess, tasks, taskParticipants, vendors } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

type RouteParams = { params: Promise<{ accessId: string }> };

/**
 * GET /api/vendor/events/[accessId]/tasks
 * List tasks for a provider's event where the linked vendor is a participant.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { accessId } = await params;
    const aid = parseInt(accessId, 10);

    // Verify access belongs to this provider org and is active
    const access = await db.query.providerEventAccess.findFirst({
      where: and(
        eq(providerEventAccess.id, aid),
        eq(providerEventAccess.providerOrgId, session.organizationId),
        eq(providerEventAccess.status, "active")
      ),
    });

    if (!access) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Access not found" } },
        { status: 404 }
      );
    }

    // Find vendor IDs in the planner's org linked to this provider org
    const linkedVendors = await db
      .select({ id: vendors.id })
      .from(vendors)
      .where(
        and(
          eq(vendors.organizationId, access.plannerOrgId),
          eq(vendors.providerOrgId, session.organizationId)
        )
      );

    const vendorIds = linkedVendors.map((v) => v.id);

    if (vendorIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Find task IDs where vendor is a participant
    const participations = await db
      .select({ taskId: taskParticipants.taskId })
      .from(taskParticipants)
      .where(inArray(taskParticipants.vendorId, vendorIds));

    const taskIds = [...new Set(participations.map((p) => p.taskId))];

    if (taskIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Get tasks for this event that the vendor participates in
    const eventTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        category: tasks.category,
        dueDate: tasks.dueDate,
        createdAt: tasks.createdAt,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.eventId, access.eventId),
          inArray(tasks.id, taskIds)
        )
      );

    return NextResponse.json({ success: true, data: eventTasks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch tasks";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}
