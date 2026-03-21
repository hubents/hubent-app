import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { tasks, taskChecklistItems, formInstances } from "@/db/schema";
import { eq, and, sql, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const session = await requirePermission("events:read");
    const { eventId: id } = await params;
    const eventId = parseInt(id, 10);

    if (isNaN(eventId)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_ID", message: "Invalid event ID" },
        },
        { status: 400 },
      );
    }

    const [taskResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(
        and(
          eq(tasks.eventId, eventId),
          eq(tasks.organizationId, session.organizationId),
        ),
      );

    const [checklistResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(taskChecklistItems)
      .innerJoin(tasks, eq(taskChecklistItems.taskId, tasks.id))
      .where(
        and(
          eq(tasks.eventId, eventId),
          eq(tasks.organizationId, session.organizationId),
        ),
      );

    const [taskFormResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(formInstances)
      .innerJoin(tasks, eq(formInstances.taskId, tasks.id))
      .where(
        and(
          eq(tasks.eventId, eventId),
          eq(formInstances.type, "task"),
          eq(formInstances.organizationId, session.organizationId),
        ),
      );

    const [landingFormResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(formInstances)
      .where(
        and(
          eq(formInstances.eventId, eventId),
          ne(formInstances.type, "task"),
          eq(formInstances.organizationId, session.organizationId),
        ),
      );

    return NextResponse.json({
      success: true,
      data: {
        taskCount: Number(taskResult.count),
        checklistCount: Number(checklistResult.count),
        taskFormCount: Number(taskFormResult.count),
        landingFormCount: Number(landingFormResult.count),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get event stats";
    return NextResponse.json(
      { success: false, error: { code: "STATS_ERROR", message } },
      { status: 400 },
    );
  }
}
