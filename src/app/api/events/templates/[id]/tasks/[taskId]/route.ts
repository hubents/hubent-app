import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { updateTaskTemplate, deleteTaskTemplate } from "@/lib/events";

// PATCH /api/events/templates/[id]/tasks/[taskId] - Update task template
export async function PATCH(
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
    const updated = await updateTaskTemplate(taskTemplateId, body);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task template not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update task template";
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// DELETE /api/events/templates/[id]/tasks/[taskId] - Delete task template
export async function DELETE(
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

    await deleteTaskTemplate(taskTemplateId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete task template";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
