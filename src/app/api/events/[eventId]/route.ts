import { NextRequest } from "next/server";
import { requirePermission, requireEventSectionAccess } from "@/lib/session";
import { getEvent, updateEvent, deleteEvent, cancelEvent } from "@/lib/events";
import { apiHandler, ok, notFound, badRequest } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ eventId: string }> };

// GET /api/events/[eventId] - Get single event
export async function GET(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const id = parseInt(eventId, 10);
    const session = await requireEventSectionAccess(id, "general", "view");

    const event = await getEvent(session, id);

    if (!event) {
      return notFound("Event not found");
    }

    return ok(event);
  }, "GET /api/events/[eventId]");
}

// PATCH /api/events/[eventId] - Update event
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const id = parseInt(eventId, 10);
    const body = await request.json();

    // Handle cancel action (soft delete)
    if (body.action === "cancel") {
      const adminSession = await requirePermission("events:delete");
      const result = await cancelEvent(adminSession, id);

      if (!result.event) {
        return notFound("Event not found");
      }

      return ok({ ...result.event, _meta: { cancelledTasks: result.cancelledTasks } });
    }

    const session = await requireEventSectionAccess(id, "general", "edit");
    const updated = await updateEvent(session, id, body);

    if (!updated) {
      return notFound("Event not found");
    }

    return ok(updated);
  }, "PATCH /api/events/[eventId]");
}

// DELETE /api/events/[eventId] - Delete event
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("events:delete");
    const { eventId } = await params;

    await deleteEvent(session, parseInt(eventId, 10));

    return ok({ message: "Event deleted" });
  }, "DELETE /api/events/[eventId]");
}
