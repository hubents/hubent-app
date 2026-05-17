import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { saveEventAsTemplate } from "@/lib/events";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";

// POST /api/events/[eventId]/save-as-template - Save event as template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePermission("events:create");
    const { eventId: id } = await params;
    const eventId = parseInt(id, 10);

    if (isNaN(eventId)) {
      return badRequest("Invalid event ID", "INVALID_ID");
    }

    const body = await request.json();
    const { templateName, description, isGlobal } = body;

    if (!templateName?.trim()) {
      return badRequest("Template name is required");
    }

    const template = await saveEventAsTemplate(session, eventId, {
      templateName: templateName.trim(),
      description,
      isGlobal: isGlobal || false,
    });

    return ok(template);
  }, "POST /api/events/[eventId]/save-as-template");
}
