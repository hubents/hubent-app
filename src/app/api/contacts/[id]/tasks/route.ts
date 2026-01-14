import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { linkContactToTask, unlinkContactFromTask } from "@/lib/contacts";
import { db } from "@/db";
import { contactTasks, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET - List tasks linked to a contact
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("viewer");

    const { id } = await params;
    const contactId = parseInt(id, 10);

    const linkedTasks = await db
      .select({
        id: contactTasks.id,
        taskId: contactTasks.taskId,
        role: contactTasks.role,
        taskTitle: tasks.title,
        taskStatus: tasks.status,
        taskDueDate: tasks.dueDate,
      })
      .from(contactTasks)
      .innerJoin(tasks, eq(contactTasks.taskId, tasks.id))
      .where(eq(contactTasks.contactId, contactId));

    return NextResponse.json({ success: true, data: linkedTasks });
  } catch (error) {
    console.error("Error fetching contact tasks:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch tasks" }, { status: 500 });
  }
}

// POST - Link contact to task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("planner");

    const { id } = await params;
    const contactId = parseInt(id, 10);
    const body = await request.json();
    const { taskId, role } = body;

    if (!taskId) {
      return NextResponse.json({ success: false, error: "taskId is required" }, { status: 400 });
    }

    const link = await linkContactToTask(contactId, taskId, role);

    return NextResponse.json({ success: true, data: link });
  } catch (error) {
    console.error("Error linking contact to task:", error);
    return NextResponse.json({ success: false, error: "Failed to link contact" }, { status: 500 });
  }
}

// DELETE - Unlink contact from task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("planner");

    const { id } = await params;
    const contactId = parseInt(id, 10);
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ success: false, error: "taskId is required" }, { status: 400 });
    }

    await unlinkContactFromTask(contactId, parseInt(taskId, 10));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unlinking contact from task:", error);
    return NextResponse.json({ success: false, error: "Failed to unlink contact" }, { status: 500 });
  }
}
