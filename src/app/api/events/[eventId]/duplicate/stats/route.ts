import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { tasks, taskChecklistItems, formInstances } from "@/db/schema";
import { eq, and, sql, ne } from "drizzle-orm";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  return apiHandler(async () => {
    const session = await requirePermission("events:read");
    const { eventId: id } = await params;
    const eventId = parseInt(id, 10);

    if (isNaN(eventId)) {
      return badRequest("Invalid event ID", "INVALID_ID");
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

    return ok({
      taskCount: Number(taskResult.count),
      checklistCount: Number(checklistResult.count),
      taskFormCount: Number(taskFormResult.count),
      landingFormCount: Number(landingFormResult.count),
    });
  }, "GET /api/events/[eventId]/duplicate/stats");
}
