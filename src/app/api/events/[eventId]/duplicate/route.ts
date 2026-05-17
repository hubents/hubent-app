import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { duplicateEvent } from "@/lib/events";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";

// POST /api/events/[eventId]/duplicate - Duplicate an event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  return apiHandler(async () => {
    const session = await requirePermission("events:create");
    const { eventId: id } = await params;
    const eventId = parseInt(id, 10);

    if (isNaN(eventId)) {
      return badRequest("Invalid event ID", "INVALID_ID");
    }

    const body = await request.json();
    const {
      newName,
      newDate,
      includeTasks,
      includeChecklists,
      includeForms,
      includeLandingForms,
    } = body;

    const newEvent = await duplicateEvent(session, eventId, {
      newName,
      newDate: newDate ? new Date(newDate) : undefined,
      includeTasks: includeTasks !== false,
      includeChecklists: includeChecklists !== false,
      includeForms: includeForms !== false,
      includeLandingForms: includeLandingForms !== false,
    });

    return ok(newEvent);
  }, "POST /api/events/[eventId]/duplicate");
}
