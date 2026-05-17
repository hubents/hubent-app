import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { getEventTemplates, createEventTemplate } from "@/lib/events";
import { apiHandler, ok, created, badRequest } from "@/lib/api-handler";

// GET /api/events/templates - List event templates
export async function GET() {
  return apiHandler(async () => {
    const session = await requirePermission("events:read");
    const templates = await getEventTemplates(session);
    return ok(templates);
  }, "GET /api/events/templates");
}

// POST /api/events/templates - Create event template
export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("events:create");
    const body = await request.json();

    const { name } = body;

    if (!name) {
      return badRequest("Name is required");
    }

    const template = await createEventTemplate(session, {
      name,
      eventType: body.eventType,
      description: body.description,
      defaultBudget: body.defaultBudget,
      isGlobal: body.isGlobal,
      tasks: body.tasks,
    });

    return created(template);
  }, "POST /api/events/templates");
}
