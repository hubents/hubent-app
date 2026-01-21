import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { taskChecklistItems, taskChecklistAssignees } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// PATCH /api/tasks/[taskId]/checklist/[itemId] - Update checklist item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { taskId, itemId } = await params;
    const taskIdNum = parseInt(taskId, 10);
    const itemIdNum = parseInt(itemId, 10);

    if (isNaN(taskIdNum) || isNaN(itemIdNum)) {
      return NextResponse.json({ success: false, error: "Invalid IDs" }, { status: 400 });
    }

    // Verify item exists and belongs to task
    const [existingItem] = await db
      .select()
      .from(taskChecklistItems)
      .where(and(
        eq(taskChecklistItems.id, itemIdNum),
        eq(taskChecklistItems.taskId, taskIdNum)
      ))
      .limit(1);

    if (!existingItem) {
      return NextResponse.json({ success: false, error: "Checklist item not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, isCompleted, dueDate, sortOrder } = body;

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) {
      updates.title = title.trim();
    }

    if (isCompleted !== undefined) {
      updates.isCompleted = isCompleted;
      if (isCompleted && !existingItem.isCompleted) {
        updates.completedAt = new Date();
        updates.completedBy = session.user.id;
      } else if (!isCompleted) {
        updates.completedAt = null;
        updates.completedBy = null;
      }
    }

    if (dueDate !== undefined) {
      updates.dueDate = dueDate ? new Date(dueDate) : null;
    }

    if (sortOrder !== undefined) {
      updates.sortOrder = sortOrder;
    }

    const [updatedItem] = await db
      .update(taskChecklistItems)
      .set(updates)
      .where(eq(taskChecklistItems.id, itemIdNum))
      .returning();

    return NextResponse.json({ success: true, data: updatedItem });
  } catch (error) {
    console.error("PATCH /api/tasks/[taskId]/checklist/[itemId] error:", error);
    return NextResponse.json({ success: false, error: "Failed to update checklist item" }, { status: 500 });
  }
}

// DELETE /api/tasks/[taskId]/checklist/[itemId] - Delete checklist item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { taskId, itemId } = await params;
    const taskIdNum = parseInt(taskId, 10);
    const itemIdNum = parseInt(itemId, 10);

    if (isNaN(taskIdNum) || isNaN(itemIdNum)) {
      return NextResponse.json({ success: false, error: "Invalid IDs" }, { status: 400 });
    }

    // Verify item exists and belongs to task
    const [existingItem] = await db
      .select({ id: taskChecklistItems.id })
      .from(taskChecklistItems)
      .where(and(
        eq(taskChecklistItems.id, itemIdNum),
        eq(taskChecklistItems.taskId, taskIdNum)
      ))
      .limit(1);

    if (!existingItem) {
      return NextResponse.json({ success: false, error: "Checklist item not found" }, { status: 404 });
    }

    // Delete item (assignees will cascade)
    await db
      .delete(taskChecklistItems)
      .where(eq(taskChecklistItems.id, itemIdNum));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks/[taskId]/checklist/[itemId] error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete checklist item" }, { status: 500 });
  }
}
