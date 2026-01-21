import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { updateEventTable, deleteEventTable } from "@/lib/guests";

type RouteParams = { params: Promise<{ eventId: string; tableId: string }> };

// PATCH /api/events/[eventId]/tables/[tableId] - Update table
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireRole("planner");
    const { tableId } = await params;
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
    await requireRole("planner");
    const { tableId } = await params;

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
