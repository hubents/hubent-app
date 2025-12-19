import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { getEvent, updateEvent, deleteEvent } from "@/lib/events";

type RouteParams = { params: Promise<{ eventId: string }> };

// GET /api/events/[eventId] - Get single event
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("viewer");
    const { eventId } = await params;

    const event = await getEvent(session, parseInt(eventId, 10));

    if (!event) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Event not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: event,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch event";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// PATCH /api/events/[eventId] - Update event
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { eventId } = await params;
    const body = await request.json();

    const updated = await updateEvent(session, parseInt(eventId, 10), body);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Event not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update event";
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// DELETE /api/events/[eventId] - Delete event
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("admin");
    const { eventId } = await params;

    await deleteEvent(session, parseInt(eventId, 10));

    return NextResponse.json({
      success: true,
      data: { message: "Event deleted" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete event";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
