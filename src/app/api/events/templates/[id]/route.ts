import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { 
  getEventTemplate, 
  updateEventTemplate, 
  deleteEventTemplate 
} from "@/lib/events";

// GET /api/events/templates/[id] - Get single template with tasks and checklists
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission("events:read");
    const { id } = await params;
    const templateId = parseInt(id, 10);

    if (isNaN(templateId)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "Invalid template ID" } },
        { status: 400 }
      );
    }

    const template = await getEventTemplate(session, templateId);

    if (!template) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Template not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch template";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// PATCH /api/events/templates/[id] - Update template
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission("events:update");
    const { id } = await params;
    const templateId = parseInt(id, 10);

    if (isNaN(templateId)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "Invalid template ID" } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updated = await updateEventTemplate(session, templateId, body);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Template not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update template";
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// DELETE /api/events/templates/[id] - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("events:update");
    const { id } = await params;
    const templateId = parseInt(id, 10);

    if (isNaN(templateId)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "Invalid template ID" } },
        { status: 400 }
      );
    }

    await deleteEventTemplate(templateId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete template";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
