import { NextRequest, NextResponse } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { assignGuestToTable } from "@/lib/guests";

type RouteParams = { params: Promise<{ eventId: string; tableId: string }> };

// POST /api/events/[eventId]/tables/[tableId]/assign - Assign guest to table
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId, tableId } = await params;
    await requireEventSectionAccess(parseInt(eventId, 10), "guests", "edit");
    const body = await request.json();

    const { guestId } = body;

    if (!guestId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "guestId is required" } },
        { status: 400 }
      );
    }

    const guest = await assignGuestToTable(guestId, parseInt(tableId, 10));

    return NextResponse.json({
      success: true,
      data: guest,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to assign guest";
    return NextResponse.json(
      { success: false, error: { code: "ASSIGN_ERROR", message } },
      { status: 400 }
    );
  }
}

// DELETE /api/events/[eventId]/tables/[tableId]/assign - Remove guest from table
export async function DELETE(request: NextRequest, { params: _params }: RouteParams) {
  try {
    const { eventId } = await _params;
    await requireEventSectionAccess(parseInt(eventId, 10), "guests", "edit");
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get("guestId");

    if (!guestId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "guestId is required" } },
        { status: 400 }
      );
    }

    const guest = await assignGuestToTable(parseInt(guestId, 10), null);

    return NextResponse.json({
      success: true,
      data: guest,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove guest from table";
    return NextResponse.json(
      { success: false, error: { code: "REMOVE_ERROR", message } },
      { status: 400 }
    );
  }
}
