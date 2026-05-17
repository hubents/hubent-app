import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { getContactActivities, createContactActivity } from "@/lib/contacts";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/contacts/[id]/activities - List contact activities
export async function GET(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    await requirePermission("crm:read");
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const activities = await getContactActivities(parseInt(id, 10), limit);

    return ok(activities);
  }, "GET /api/contacts/[id]/activities");
}

// POST /api/contacts/[id]/activities - Add activity to contact
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");
    const { id } = await params;
    const body = await request.json();

    const { type, title } = body;

    if (!type || !title) {
      return badRequest("Type and title are required");
    }

    const validTypes = ["note", "call", "email", "meeting", "task_created", "event_linked", "lead_converted", "status_change", "other"];
    if (!validTypes.includes(type)) {
      return badRequest("Invalid activity type");
    }

    const activity = await createContactActivity(parseInt(id, 10), {
      type,
      title,
      description: body.description,
      metadata: body.metadata,
      createdBy: session.user.userId,
    });

    return ok(activity);
  }, "POST /api/contacts/[id]/activities");
}
