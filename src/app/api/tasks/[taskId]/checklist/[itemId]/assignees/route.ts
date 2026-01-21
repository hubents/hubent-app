import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { 
  tasks, 
  taskChecklistItems, 
  taskChecklistAssignees, 
  taskParticipants,
  users,
  vendors,
  contacts 
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notifyChecklistAssigned } from "@/lib/push-notifications";

// GET /api/tasks/[taskId]/checklist/[itemId]/assignees - List assignees for an item
export async function GET(
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

    const assigneesRaw = await db
      .select({
        id: taskChecklistAssignees.id,
        participantId: taskChecklistAssignees.participantId,
        assignedAt: taskChecklistAssignees.assignedAt,
        participantType: taskParticipants.type,
        userId: taskParticipants.userId,
        vendorId: taskParticipants.vendorId,
        contactId: taskParticipants.contactId,
      })
      .from(taskChecklistAssignees)
      .innerJoin(taskParticipants, eq(taskChecklistAssignees.participantId, taskParticipants.id))
      .where(eq(taskChecklistAssignees.checklistItemId, itemIdNum));

    // Enrich with names
    const assignees = [];
    for (const a of assigneesRaw) {
      let name = "Sin nombre";

      if (a.userId) {
        const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, a.userId)).limit(1);
        name = user?.name || "Usuario";
      } else if (a.vendorId) {
        const [vendor] = await db.select({ name: vendors.name }).from(vendors).where(eq(vendors.id, a.vendorId)).limit(1);
        name = vendor?.name || "Proveedor";
      } else if (a.contactId) {
        const [contact] = await db.select({ name: contacts.name }).from(contacts).where(eq(contacts.id, a.contactId)).limit(1);
        name = contact?.name || "Contacto";
      }

      assignees.push({
        id: a.id,
        participantId: a.participantId,
        type: a.participantType,
        name,
        isUser: !!a.userId,
        isVendor: !!a.vendorId,
        isContact: !!a.contactId,
        assignedAt: a.assignedAt,
      });
    }

    return NextResponse.json({ success: true, data: assignees });
  } catch (error) {
    console.error("GET assignees error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch assignees" }, { status: 500 });
  }
}

// POST /api/tasks/[taskId]/checklist/[itemId]/assignees - Add assignee to item
export async function POST(
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

    const body = await request.json();
    const { participantId } = body;

    if (!participantId) {
      return NextResponse.json({ success: false, error: "participantId is required" }, { status: 400 });
    }

    // Verify checklist item exists
    const [item] = await db
      .select({ id: taskChecklistItems.id, title: taskChecklistItems.title, taskId: taskChecklistItems.taskId })
      .from(taskChecklistItems)
      .where(and(
        eq(taskChecklistItems.id, itemIdNum),
        eq(taskChecklistItems.taskId, taskIdNum)
      ))
      .limit(1);

    if (!item) {
      return NextResponse.json({ success: false, error: "Checklist item not found" }, { status: 404 });
    }

    // Verify participant belongs to this task
    const [participant] = await db
      .select({
        id: taskParticipants.id,
        userId: taskParticipants.userId,
        vendorId: taskParticipants.vendorId,
        contactId: taskParticipants.contactId,
      })
      .from(taskParticipants)
      .where(and(
        eq(taskParticipants.id, participantId),
        eq(taskParticipants.taskId, taskIdNum)
      ))
      .limit(1);

    if (!participant) {
      return NextResponse.json({ success: false, error: "Participant not found in this task" }, { status: 404 });
    }

    // Check if already assigned
    const [existing] = await db
      .select({ id: taskChecklistAssignees.id })
      .from(taskChecklistAssignees)
      .where(and(
        eq(taskChecklistAssignees.checklistItemId, itemIdNum),
        eq(taskChecklistAssignees.participantId, participantId)
      ))
      .limit(1);

    if (existing) {
      return NextResponse.json({ success: false, error: "Already assigned" }, { status: 400 });
    }

    // Add assignee
    const [newAssignee] = await db
      .insert(taskChecklistAssignees)
      .values({
        checklistItemId: itemIdNum,
        participantId,
        assignedBy: session.user.id,
      })
      .returning();

    // Get task title for notification
    const [task] = await db
      .select({ title: tasks.title })
      .from(tasks)
      .where(eq(tasks.id, taskIdNum))
      .limit(1);

    // Send push notification if participant is a user
    if (participant.userId && participant.userId !== session.user.id) {
      try {
        await notifyChecklistAssigned(
          taskIdNum,
          task?.title || "Tarea",
          item.title,
          participant.userId,
          session.user.name || "Alguien"
        );
      } catch (notifError) {
        console.error("Failed to send notification:", notifError);
      }
    }

    return NextResponse.json({ success: true, data: newAssignee });
  } catch (error) {
    console.error("POST assignees error:", error);
    return NextResponse.json({ success: false, error: "Failed to add assignee" }, { status: 500 });
  }
}

// DELETE /api/tasks/[taskId]/checklist/[itemId]/assignees - Remove assignee
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

    const { searchParams } = new URL(request.url);
    const assigneeId = searchParams.get("assigneeId");
    const participantId = searchParams.get("participantId");

    if (!assigneeId && !participantId) {
      return NextResponse.json({ success: false, error: "assigneeId or participantId required" }, { status: 400 });
    }

    if (assigneeId) {
      await db
        .delete(taskChecklistAssignees)
        .where(eq(taskChecklistAssignees.id, parseInt(assigneeId, 10)));
    } else if (participantId) {
      await db
        .delete(taskChecklistAssignees)
        .where(and(
          eq(taskChecklistAssignees.checklistItemId, itemIdNum),
          eq(taskChecklistAssignees.participantId, parseInt(participantId, 10))
        ));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE assignees error:", error);
    return NextResponse.json({ success: false, error: "Failed to remove assignee" }, { status: 500 });
  }
}
