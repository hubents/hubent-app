import { NextRequest } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { updateGuest, updateGuestRsvpStatus, deleteGuest } from "@/lib/guests";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ eventId: string; guestId: string }> };

// PATCH /api/events/[eventId]/guests/[guestId] - Update guest
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId, guestId } = await params;
    await requireEventSectionAccess(parseInt(eventId, 10), "guests", "edit");
    const body = await request.json();

    const guestIdNum = parseInt(guestId, 10);

    // Handle status change separately (goes to rsvp_responses table)
    if (body.status) {
      const validStatuses = ["confirmed", "pending", "declined", "maybe"];
      if (!validStatuses.includes(body.status)) {
        return badRequest("Invalid status");
      }
      await updateGuestRsvpStatus(guestIdNum, body.status);
    }

    // Handle other guest fields
    const guestFields: Record<string, unknown> = {};

    if (body.firstName !== undefined) guestFields.firstName = body.firstName;
    if (body.lastName !== undefined) guestFields.lastName = body.lastName;
    if (body.email !== undefined) guestFields.email = body.email;
    if (body.phone !== undefined) guestFields.phone = body.phone;
    if (body.tableId !== undefined) guestFields.tableId = body.tableId;
    if (body.menuPreference !== undefined) guestFields.menuPreference = body.menuPreference;
    if (body.ageGroup !== undefined) guestFields.ageGroup = body.ageGroup;
    if (body.groupId !== undefined) guestFields.groupId = body.groupId;
    if (body.plusOne !== undefined) guestFields.plusOne = body.plusOne;
    if (body.plusOneName !== undefined) guestFields.plusOneName = body.plusOneName;
    if (body.dietaryRestrictions !== undefined) guestFields.dietaryRestrictions = body.dietaryRestrictions;
    if (body.notes !== undefined) guestFields.notes = body.notes;

    let updated = null;
    if (Object.keys(guestFields).length > 0) {
      updated = await updateGuest(guestIdNum, guestFields);
    }

    return ok(updated);
  }, "PATCH /api/events/[eventId]/guests/[guestId]");
}

// DELETE /api/events/[eventId]/guests/[guestId] - Delete guest
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId, guestId } = await params;
    await requireEventSectionAccess(parseInt(eventId, 10), "guests", "edit");

    await deleteGuest(parseInt(guestId, 10));

    return ok(null);
  }, "DELETE /api/events/[eventId]/guests/[guestId]");
}
