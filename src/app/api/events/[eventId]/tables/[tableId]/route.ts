import { NextRequest } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { updateEventTable, deleteEventTable } from "@/lib/guests";
import { apiHandler, ok } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ eventId: string; tableId: string }> };

// PATCH /api/events/[eventId]/tables/[tableId] - Update table
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId, tableId } = await params;
    await requireEventSectionAccess(parseInt(eventId, 10), "guests", "edit");
    const body = await request.json();

    const table = await updateEventTable(parseInt(tableId, 10), body);
    return ok(table);
  }, "PATCH /api/events/[eventId]/tables/[tableId]");
}

// DELETE /api/events/[eventId]/tables/[tableId] - Delete table
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId, tableId } = await params;
    await requireEventSectionAccess(parseInt(eventId, 10), "guests", "edit");

    await deleteEventTable(parseInt(tableId, 10));
    return ok(null);
  }, "DELETE /api/events/[eventId]/tables/[tableId]");
}
