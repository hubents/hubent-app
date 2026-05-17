import { NextRequest } from "next/server";
import { requirePermission, requireFeature } from "@/lib/session";
import { addTaskToTemplate } from "@/lib/events";
import { apiHandler, created, badRequest } from "@/lib/api-handler";

// POST /api/events/templates/[id]/tasks - Add task to template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    await requireFeature("auto_processes");
    await requirePermission("events:read");
    const { id } = await params;
    const templateId = parseInt(id, 10);

    if (isNaN(templateId)) {
      return badRequest("Invalid template ID", "INVALID_ID");
    }

    const body = await request.json();
    const { title, description, htmlContent, category, daysBeforeEvent, daysAfterEvent, priority, checklists } = body;

    if (!title?.trim()) {
      return badRequest("Title is required");
    }

    const taskTemplate = await addTaskToTemplate(templateId, {
      title: title.trim(),
      description,
      htmlContent,
      category,
      daysBeforeEvent,
      daysAfterEvent,
      priority,
      checklists,
    });

    return created(taskTemplate);
  }, "POST /api/events/templates/[id]/tasks");
}
