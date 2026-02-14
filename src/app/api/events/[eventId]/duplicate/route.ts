import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { duplicateEvent } from "@/lib/events";

// POST /api/events/[eventId]/duplicate - Duplicate an event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await requirePermission("events:create");
    const { eventId: id } = await params;
    const eventId = parseInt(id, 10);

    if (isNaN(eventId)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "Invalid event ID" } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { newName, newDate, includeTasks, includeChecklists } = body;

    const newEvent = await duplicateEvent(session, eventId, {
      newName,
      newDate: newDate ? new Date(newDate) : undefined,
      includeTasks: includeTasks !== false,
      includeChecklists: includeChecklists !== false,
    });

    return NextResponse.json({ success: true, data: newEvent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to duplicate event";
    return NextResponse.json(
      { success: false, error: { code: "DUPLICATE_ERROR", message } },
      { status: 400 }
    );
  }
}
