import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { updateTaskTemplate, deleteTaskTemplate } from "@/lib/events";
import { apiHandler, ok, badRequest, notFound } from "@/lib/api-handler";

// PATCH /api/events/templates/[id]/tasks/[taskId] - Update task template
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  return apiHandler(async () => {
    await requirePermission("events:read");
    const { taskId } = await params;
    const taskTemplateId = parseInt(taskId, 10);

    if (isNaN(taskTemplateId)) {
      return badRequest("Invalid task template ID", "INVALID_ID");
    }

    const body = await request.json();
    const updated = await updateTaskTemplate(taskTemplateId, body);

    if (!updated) {
      return notFound("Task template not found");
    }

    return ok(updated);
  }, "PATCH /api/events/templates/[id]/tasks/[taskId]");
}

// DELETE /api/events/templates/[id]/tasks/[taskId] - Delete task template
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  return apiHandler(async () => {
    await requirePermission("events:read");
    const { taskId } = await params;
    const taskTemplateId = parseInt(taskId, 10);

    if (isNaN(taskTemplateId)) {
      return badRequest("Invalid task template ID", "INVALID_ID");
    }

    await deleteTaskTemplate(taskTemplateId);
    return ok(null);
  }, "DELETE /api/events/templates/[id]/tasks/[taskId]");
}
