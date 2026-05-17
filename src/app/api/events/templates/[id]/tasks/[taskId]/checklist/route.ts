import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { addChecklistToTaskTemplate, deleteChecklistFromTaskTemplate } from "@/lib/events";
import { apiHandler, ok, created, badRequest } from "@/lib/api-handler";

// POST /api/events/templates/[id]/tasks/[taskId]/checklist - Add checklist item
export async function POST(
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
    const { title } = body;

    if (!title?.trim()) {
      return badRequest("Title is required");
    }

    const checklist = await addChecklistToTaskTemplate(taskTemplateId, title.trim());
    return created(checklist);
  }, "POST /api/events/templates/[id]/tasks/[taskId]/checklist");
}

// DELETE /api/events/templates/[id]/tasks/[taskId]/checklist - Delete checklist item
export async function DELETE(
  request: NextRequest,
  _routeContext: { params: Promise<{ id: string; taskId: string }> }
) {
  return apiHandler(async () => {
    await requirePermission("events:read");

    const { searchParams } = new URL(request.url);
    const checklistId = parseInt(searchParams.get("checklistId") || "", 10);

    if (isNaN(checklistId)) {
      return badRequest("Invalid checklist ID", "INVALID_ID");
    }

    await deleteChecklistFromTaskTemplate(checklistId);
    return ok(null);
  }, "DELETE /api/events/templates/[id]/tasks/[taskId]/checklist");
}
