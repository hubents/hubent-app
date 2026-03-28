import { NextRequest, NextResponse } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { updateGuestGroup, deleteGuestGroup } from "@/lib/guests";

type RouteParams = { params: Promise<{ eventId: string; groupId: string }> };

// PATCH /api/events/[eventId]/guests/groups/[groupId] - Update group
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId, groupId } = await params;
    await requireEventSectionAccess(parseInt(eventId, 10), "guests", "edit");
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.tableNumber !== undefined) updates.tableNumber = body.tableNumber;
    if (body.notes !== undefined) updates.notes = body.notes;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "No fields to update" } },
        { status: 400 }
      );
    }

    const updated = await updateGuestGroup(parseInt(groupId, 10), updates);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update group";
    const status = message.includes("Forbidden") ? 403 : message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status }
    );
  }
}

// DELETE /api/events/[eventId]/guests/groups/[groupId] - Delete group
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId, groupId } = await params;
    await requireEventSectionAccess(parseInt(eventId, 10), "guests", "edit");

    await deleteGuestGroup(parseInt(groupId, 10));

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete group";
    const status = message.includes("Forbidden") ? 403 : message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status }
    );
  }
}
