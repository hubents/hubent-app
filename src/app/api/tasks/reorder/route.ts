import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";

interface ReorderItem {
  taskId: number;
  sortOrder: number;
}

// POST /api/tasks/reorder - Reorder tasks within a column (per event)
export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("tasks:update");
    const body = await request.json();
    const { items, eventId } = body as { items: ReorderItem[]; eventId?: number | null };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return badRequest("Items array is required");
    }

    // Update each task's sortOrder
    for (const item of items) {
      // Build conditions: must belong to organization
      const conditions = [
        eq(tasks.id, item.taskId),
        eq(tasks.organizationId, session.organizationId),
      ];

      // If eventId is provided, also verify task belongs to that event
      if (eventId !== undefined) {
        if (eventId === null) {
          // General tasks (no event) - use isNull() for proper null comparison
          conditions.push(isNull(tasks.eventId));
        } else {
          conditions.push(eq(tasks.eventId, eventId));
        }
      }

      await db
        .update(tasks)
        .set({
          sortOrder: item.sortOrder,
          updatedAt: new Date(),
        })
        .where(and(...conditions));
    }

    return ok(null);
  }, "POST /api/tasks/reorder");
}
