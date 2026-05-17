import { NextRequest, NextResponse } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { updateGuestGroup, deleteGuestGroup } from "@/lib/guests";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ eventId: string; groupId: string }> };

// PATCH /api/events/[eventId]/guests/groups/[groupId] - Update group
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId, groupId } = await params;
    await requireEventSectionAccess(parseInt(eventId, 10), "guests", "edit");
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.tableNumber !== undefined) updates.tableNumber = body.tableNumber;
    if (body.notes !== undefined) updates.notes = body.notes;

    if (Object.keys(updates).length === 0) {
      return badRequest("No fields to update");
    }

    const updated = await updateGuestGroup(parseInt(groupId, 10), updates);
    return ok(updated);
  }, "PATCH /api/events/[eventId]/guests/groups/[groupId]");
}

// DELETE /api/events/[eventId]/guests/groups/[groupId] - Delete group
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId, groupId } = await params;
    await requireEventSectionAccess(parseInt(eventId, 10), "guests", "edit");

    await deleteGuestGroup(parseInt(groupId, 10));
    return ok(null);
  }, "DELETE /api/events/[eventId]/guests/groups/[groupId]");
}
