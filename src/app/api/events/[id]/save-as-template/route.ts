import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { saveEventAsTemplate } from "@/lib/events";

// POST /api/events/[id]/save-as-template - Save event as template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole("admin");
    const { id } = await params;
    const eventId = parseInt(id, 10);

    if (isNaN(eventId)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "Invalid event ID" } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { templateName, description, isGlobal } = body;

    if (!templateName?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Template name is required" } },
        { status: 400 }
      );
    }

    const template = await saveEventAsTemplate(session, eventId, {
      templateName: templateName.trim(),
      description,
      isGlobal: isGlobal || false,
    });

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save event as template";
    return NextResponse.json(
      { success: false, error: { code: "SAVE_ERROR", message } },
      { status: 400 }
    );
  }
}
