import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireEventSectionAccess } from "@/lib/session";
import { getEvent, updateEvent, deleteEvent, cancelEvent } from "@/lib/events";

type RouteParams = { params: Promise<{ eventId: string }> };

// GET /api/events/[eventId] - Get single event
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const id = parseInt(eventId, 10);
    const session = await requireEventSectionAccess(id, "general", "view");

    const event = await getEvent(session, id);

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
    const { eventId } = await params;
    const id = parseInt(eventId, 10);
    const body = await request.json();

    // Handle cancel action (soft delete)
    if (body.action === "cancel") {
      const adminSession = await requirePermission("events:delete");
      const result = await cancelEvent(adminSession, id);
      
      if (!result.event) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Event not found" } },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.event,
        meta: { cancelledTasks: result.cancelledTasks },
      });
    }

    const session = await requireEventSectionAccess(id, "general", "edit");
    const updated = await updateEvent(session, id, body);

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
    const session = await requirePermission("events:delete");
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
