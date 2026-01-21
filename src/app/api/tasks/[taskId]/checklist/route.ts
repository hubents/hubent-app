import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks, taskChecklistItems, taskChecklistAssignees, taskParticipants, users, vendors, contacts } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

// GET /api/tasks/[taskId]/checklist - List all checklist items with assignees
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const taskIdNum = parseInt(taskId, 10);
    if (isNaN(taskIdNum)) {
      return NextResponse.json({ success: false, error: "Invalid task ID" }, { status: 400 });
    }

    // Get checklist items
    const items = await db
      .select()
      .from(taskChecklistItems)
      .where(eq(taskChecklistItems.taskId, taskIdNum))
      .orderBy(asc(taskChecklistItems.sortOrder), asc(taskChecklistItems.id));

    // Get assignees for all items
    const itemIds = items.map(i => i.id);
    
    let assigneesWithDetails: Array<{
      id: number;
      checklistItemId: number;
      participantId: number;
      assignedAt: Date | null;
      participantType: string | null;
      userId: string | null;
      vendorId: number | null;
      contactId: number | null;
      userName: string | null;
      vendorName: string | null;
      contactName: string | null;
    }> = [];

    if (itemIds.length > 0) {
      // Get all assignees with participant details
      const assigneesRaw = await db
        .select({
          id: taskChecklistAssignees.id,
          checklistItemId: taskChecklistAssignees.checklistItemId,
          participantId: taskChecklistAssignees.participantId,
          assignedAt: taskChecklistAssignees.assignedAt,
          participantType: taskParticipants.type,
          userId: taskParticipants.userId,
          vendorId: taskParticipants.vendorId,
          contactId: taskParticipants.contactId,
        })
        .from(taskChecklistAssignees)
        .innerJoin(taskParticipants, eq(taskChecklistAssignees.participantId, taskParticipants.id))
        .where(eq(taskParticipants.taskId, taskIdNum));

      // Enrich with names
      for (const assignee of assigneesRaw) {
        let userName: string | null = null;
        let vendorName: string | null = null;
        let contactName: string | null = null;

        if (assignee.userId) {
          const [user] = await db
            .select({ name: users.name })
            .from(users)
            .where(eq(users.id, assignee.userId))
            .limit(1);
          userName = user?.name || null;
        }

        if (assignee.vendorId) {
          const [vendor] = await db
            .select({ name: vendors.name })
            .from(vendors)
            .where(eq(vendors.id, assignee.vendorId))
            .limit(1);
          vendorName = vendor?.name || null;
        }

        if (assignee.contactId) {
          const [contact] = await db
            .select({ name: contacts.name })
            .from(contacts)
            .where(eq(contacts.id, assignee.contactId))
            .limit(1);
          contactName = contact?.name || null;
        }

        assigneesWithDetails.push({
          ...assignee,
          userName,
          vendorName,
          contactName,
        });
      }
    }

    // Group assignees by item
    const itemsWithAssignees = items.map(item => ({
      ...item,
      assignees: assigneesWithDetails
        .filter(a => a.checklistItemId === item.id)
        .map(a => ({
          id: a.id,
          participantId: a.participantId,
          type: a.participantType,
          name: a.userName || a.vendorName || a.contactName || "Sin nombre",
          isUser: !!a.userId,
          isVendor: !!a.vendorId,
          isContact: !!a.contactId,
          assignedAt: a.assignedAt,
        })),
    }));

    return NextResponse.json({ success: true, data: itemsWithAssignees });
  } catch (error) {
    console.error("GET /api/tasks/[taskId]/checklist error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch checklist" }, { status: 500 });
  }
}

// POST /api/tasks/[taskId]/checklist - Create a new checklist item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const taskIdNum = parseInt(taskId, 10);
    if (isNaN(taskIdNum)) {
      return NextResponse.json({ success: false, error: "Invalid task ID" }, { status: 400 });
    }

    // Verify task exists
    const [task] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.id, taskIdNum))
      .limit(1);

    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, dueDate, assigneeIds } = body;

    if (!title?.trim()) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
    }

    // Get max sort order
    const [maxOrder] = await db
      .select({ maxSort: taskChecklistItems.sortOrder })
      .from(taskChecklistItems)
      .where(eq(taskChecklistItems.taskId, taskIdNum))
      .orderBy(asc(taskChecklistItems.sortOrder))
      .limit(1);

    const newSortOrder = (maxOrder?.maxSort || 0) + 1;

    // Create checklist item
    const [newItem] = await db
      .insert(taskChecklistItems)
      .values({
        taskId: taskIdNum,
        title: title.trim(),
        dueDate: dueDate ? new Date(dueDate) : null,
        sortOrder: newSortOrder,
        createdBy: session.user.id,
      })
      .returning();

    // Add assignees if provided
    if (assigneeIds && Array.isArray(assigneeIds) && assigneeIds.length > 0) {
      const assigneeValues = assigneeIds.map((participantId: number) => ({
        checklistItemId: newItem.id,
        participantId,
        assignedBy: session.user?.id,
      }));

      await db.insert(taskChecklistAssignees).values(assigneeValues);
    }

    return NextResponse.json({ success: true, data: newItem });
  } catch (error) {
    console.error("POST /api/tasks/[taskId]/checklist error:", error);
    return NextResponse.json({ success: false, error: "Failed to create checklist item" }, { status: 500 });
  }
}
