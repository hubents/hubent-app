import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { addChecklistToTaskTemplate, deleteChecklistFromTaskTemplate } from "@/lib/events";

// POST /api/events/templates/[id]/tasks/[taskId]/checklist - Add checklist item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    await requireRole("admin");
    const { taskId } = await params;
    const taskTemplateId = parseInt(taskId, 10);

    if (isNaN(taskTemplateId)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "Invalid task template ID" } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Title is required" } },
        { status: 400 }
      );
    }

    const checklist = await addChecklistToTaskTemplate(taskTemplateId, title.trim());

    return NextResponse.json({ success: true, data: checklist });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add checklist item";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// DELETE /api/events/templates/[id]/tasks/[taskId]/checklist - Delete checklist item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    await requireRole("admin");
    
    const { searchParams } = new URL(request.url);
    const checklistId = parseInt(searchParams.get("checklistId") || "", 10);

    if (isNaN(checklistId)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "Invalid checklist ID" } },
        { status: 400 }
      );
    }

    await deleteChecklistFromTaskTemplate(checklistId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete checklist item";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
