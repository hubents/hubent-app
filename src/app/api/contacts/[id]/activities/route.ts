import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { getContactActivities, createContactActivity } from "@/lib/contacts";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/contacts/[id]/activities - List contact activities
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission("crm:read");
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const activities = await getContactActivities(parseInt(id, 10), limit);

    return NextResponse.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error("GET /api/contacts/[id]/activities error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch activities";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/contacts/[id]/activities - Add activity to contact
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("crm:manage");
    const { id } = await params;
    const body = await request.json();

    const { type, title } = body;

    if (!type || !title) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Type and title are required" } },
        { status: 400 }
      );
    }

    const validTypes = ["note", "call", "email", "meeting", "task_created", "event_linked", "lead_converted", "status_change", "other"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid activity type" } },
        { status: 400 }
      );
    }

    const activity = await createContactActivity(parseInt(id, 10), {
      type,
      title,
      description: body.description,
      metadata: body.metadata,
      createdBy: session.user.userId,
    });

    return NextResponse.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    console.error("POST /api/contacts/[id]/activities error:", error);
    const message = error instanceof Error ? error.message : "Failed to add activity";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}
