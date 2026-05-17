import { NextRequest } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { getEventTables, createEventTable } from "@/lib/guests";
import { apiHandler, ok, created, badRequest } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ eventId: string }> };

// GET /api/events/[eventId]/tables - List tables with guests
export async function GET(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const id = parseInt(eventId, 10);
    await requireEventSectionAccess(id, "guests", "view");

    const tables = await getEventTables(id);
    return ok(tables);
  }, "GET /api/events/[eventId]/tables");
}

// POST /api/events/[eventId]/tables - Create table
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const id = parseInt(eventId, 10);
    await requireEventSectionAccess(id, "guests", "edit");
    const body = await request.json();

    const { name, shape, capacity, positionX, positionY, width, height, color } = body;

    if (!name) {
      return badRequest("Name is required");
    }

    const table = await createEventTable(id, {
      name,
      shape,
      capacity,
      positionX,
      positionY,
      width,
      height,
      color,
    });

    return created(table);
  }, "POST /api/events/[eventId]/tables");
}
