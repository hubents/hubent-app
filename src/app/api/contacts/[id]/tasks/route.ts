import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { linkContactToTask, unlinkContactFromTask } from "@/lib/contacts";
import { db } from "@/db";
import { contactTasks, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";

// GET - List tasks linked to a contact
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    await requirePermission("crm:read");

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

    return ok(linkedTasks);
  }, "GET /api/contacts/[id]/tasks");
}

// POST - Link contact to task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    await requirePermission("crm:manage");

    const { id } = await params;
    const contactId = parseInt(id, 10);
    const body = await request.json();
    const { taskId, role } = body;

    if (!taskId) {
      return badRequest("taskId is required");
    }

    const link = await linkContactToTask(contactId, taskId, role);

    return ok(link);
  }, "POST /api/contacts/[id]/tasks");
}

// DELETE - Unlink contact from task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    await requirePermission("crm:manage");

    const { id } = await params;
    const contactId = parseInt(id, 10);
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return badRequest("taskId is required");
    }

    await unlinkContactFromTask(contactId, parseInt(taskId, 10));

    return ok(null);
  }, "DELETE /api/contacts/[id]/tasks");
}
