import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import {
  providerEventAccess,
  tasks,
  taskParticipants,
  taskScheduleItems,
  vendors,
} from "@/db/schema";
import { eq, and, inArray, asc } from "drizzle-orm";

type RouteParams = { params: Promise<{ accessId: string }> };

/**
 * GET /api/vendor/events/[accessId]/run-sheet
 * List schedule items from tasks where the provider's vendor is a participant.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { accessId } = await params;
    const aid = parseInt(accessId, 10);

    // Verify access belongs to this provider org
    const access = await db.query.providerEventAccess.findFirst({
      where: and(
        eq(providerEventAccess.id, aid),
        eq(providerEventAccess.providerOrgId, session.organizationId)
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

    // Get schedule items from those tasks (filtered to this event)
    const items = await db
      .select({
        id: taskScheduleItems.id,
        taskId: taskScheduleItems.taskId,
        title: taskScheduleItems.title,
        description: taskScheduleItems.description,
        date: taskScheduleItems.date,
        startTime: taskScheduleItems.startTime,
        endTime: taskScheduleItems.endTime,
        location: taskScheduleItems.location,
        notes: taskScheduleItems.notes,
        sortOrder: taskScheduleItems.sortOrder,
        taskTitle: tasks.title,
      })
      .from(taskScheduleItems)
      .innerJoin(tasks, eq(taskScheduleItems.taskId, tasks.id))
      .where(
        and(
          eq(tasks.eventId, access.eventId),
          inArray(tasks.id, taskIds)
        )
      )
      .orderBy(asc(taskScheduleItems.date), asc(taskScheduleItems.sortOrder));

    // Format response to match tenant format
    const data = items.map((item) => ({
      ...item,
      source: "task" as const,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET /api/vendor/events/[accessId]/run-sheet error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch run sheet";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}
