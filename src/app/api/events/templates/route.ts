import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { getEventTemplates, createEventTemplate } from "@/lib/events";

// GET /api/events/templates - List event templates
export async function GET() {
  try {
    const session = await requireRole("viewer");

    const templates = await getEventTemplates(session);

    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch templates";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/events/templates - Create event template
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole("admin");
    const body = await request.json();

    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name is required" } },
        { status: 400 }
      );
    }

    const template = await createEventTemplate(session, {
      name,
      eventType: body.eventType,
      description: body.description,
      defaultBudget: body.defaultBudget,
      isGlobal: body.isGlobal,
      tasks: body.tasks,
    });

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create template";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}
