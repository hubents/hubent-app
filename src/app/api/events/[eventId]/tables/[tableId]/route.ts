import { NextRequest, NextResponse } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { updateEventTable, deleteEventTable } from "@/lib/guests";

type RouteParams = { params: Promise<{ eventId: string; tableId: string }> };

// PATCH /api/events/[eventId]/tables/[tableId] - Update table
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId, tableId } = await params;
    await requireEventSectionAccess(parseInt(eventId, 10), "guests", "edit");
    const body = await request.json();

    const table = await updateEventTable(parseInt(tableId, 10), body);

    return NextResponse.json({
      success: true,
      data: table,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update table";
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// DELETE /api/events/[eventId]/tables/[tableId] - Delete table
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId, tableId } = await params;
    await requireEventSectionAccess(parseInt(eventId, 10), "guests", "edit");

    await deleteEventTable(parseInt(tableId, 10));

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete table";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
