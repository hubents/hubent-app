import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import {
  getEventTemplate,
  updateEventTemplate,
  deleteEventTemplate
} from "@/lib/events";
import { apiHandler, ok, badRequest, notFound } from "@/lib/api-handler";

// GET /api/events/templates/[id] - Get single template with tasks and checklists
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePermission("events:read");
    const { id } = await params;
    const templateId = parseInt(id, 10);

    if (isNaN(templateId)) {
      return badRequest("Invalid template ID", "INVALID_ID");
    }

    const template = await getEventTemplate(session, templateId);

    if (!template) {
      return notFound("Template not found");
    }

    return ok(template);
  }, "GET /api/events/templates/[id]");
}

// PATCH /api/events/templates/[id] - Update template
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePermission("events:update");
    const { id } = await params;
    const templateId = parseInt(id, 10);

    if (isNaN(templateId)) {
      return badRequest("Invalid template ID", "INVALID_ID");
    }

    const body = await request.json();
    const updated = await updateEventTemplate(session, templateId, body);

    if (!updated) {
      return notFound("Template not found");
    }

    return ok(updated);
  }, "PATCH /api/events/templates/[id]");
}

// DELETE /api/events/templates/[id] - Delete template
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    await requirePermission("events:update");
    const { id } = await params;
    const templateId = parseInt(id, 10);

    if (isNaN(templateId)) {
      return badRequest("Invalid template ID", "INVALID_ID");
    }

    await deleteEventTemplate(templateId);
    return ok(null);
  }, "DELETE /api/events/templates/[id]");
}
