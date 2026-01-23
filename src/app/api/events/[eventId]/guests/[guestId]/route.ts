import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { updateGuest, updateGuestRsvpStatus, deleteGuest } from "@/lib/guests";

type RouteParams = { params: Promise<{ eventId: string; guestId: string }> };

// PATCH /api/events/[eventId]/guests/[guestId] - Update guest
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireRole("planner");
    const { guestId } = await params;
    const body = await request.json();

    const guestIdNum = parseInt(guestId, 10);

    // Handle status change separately (goes to rsvp_responses table)
    if (body.status) {
      const validStatuses = ["confirmed", "pending", "declined", "maybe"];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid status" } },
          { status: 400 }
        );
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

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update guest";
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[eventId]/guests/[guestId] - Delete guest
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireRole("planner");
    const { guestId } = await params;

    await deleteGuest(parseInt(guestId, 10));

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete guest";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 500 }
    );
  }
}
