import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { addTaskToTemplate } from "@/lib/events";

// POST /api/events/templates/[id]/tasks - Add task to template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
    const { id } = await params;
    const templateId = parseInt(id, 10);

    if (isNaN(templateId)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "Invalid template ID" } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, description, htmlContent, category, daysBeforeEvent, daysAfterEvent, priority, checklists } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Title is required" } },
        { status: 400 }
      );
    }

    const taskTemplate = await addTaskToTemplate(templateId, {
      title: title.trim(),
      description,
      htmlContent,
      category,
      daysBeforeEvent,
      daysAfterEvent,
      priority,
      checklists,
    });

    return NextResponse.json({ success: true, data: taskTemplate });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add task to template";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}
