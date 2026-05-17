import { NextRequest } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { assignGuestToTable } from "@/lib/guests";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ eventId: string; tableId: string }> };

// POST /api/events/[eventId]/tables/[tableId]/assign - Assign guest to table
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId, tableId } = await params;
    await requireEventSectionAccess(parseInt(eventId, 10), "guests", "edit");
    const body = await request.json();

    const { guestId } = body;

    if (!guestId) {
      return badRequest("guestId is required");
    }

    const guest = await assignGuestToTable(guestId, parseInt(tableId, 10));
    return ok(guest);
  }, "POST /api/events/[eventId]/tables/[tableId]/assign");
}

// DELETE /api/events/[eventId]/tables/[tableId]/assign - Remove guest from table
export async function DELETE(request: NextRequest, { params: _params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await _params;
    await requireEventSectionAccess(parseInt(eventId, 10), "guests", "edit");
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get("guestId");

    if (!guestId) {
      return badRequest("guestId is required");
    }

    const guest = await assignGuestToTable(parseInt(guestId, 10), null);
    return ok(guest);
  }, "DELETE /api/events/[eventId]/tables/[tableId]/assign");
}
