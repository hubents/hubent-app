import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface ReorderItem {
  taskId: number;
  sortOrder: number;
}

// POST /api/tasks/reorder - Reorder tasks within a column (per event)
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole("planner");
    const body = await request.json();
    const { items, eventId } = body as { items: ReorderItem[]; eventId?: number | null };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Items array is required" } },
        { status: 400 }
      );
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
          // General tasks (no event)
          conditions.push(eq(tasks.eventId, null as unknown as number));
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/tasks/reorder error:", error);
    const message = error instanceof Error ? error.message : "Failed to reorder tasks";
    return NextResponse.json(
      { success: false, error: { code: "REORDER_ERROR", message } },
      { status: 500 }
    );
  }
}
