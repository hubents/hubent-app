import { NextRequest } from "next/server";
import { requireEventSectionAccess, requireFeature } from "@/lib/session";
import { getGuests, createGuest, bulkCreateGuests, getGuestGroups, createGuestGroup } from "@/lib/guests";
import { apiHandler, ok, created, badRequest } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ eventId: string }> };

// GET /api/events/[eventId]/guests - List guests
export async function GET(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const id = parseInt(eventId, 10);
    await requireEventSectionAccess(id, "guests", "view");
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type"); // "guests" or "groups"
    const groupId = searchParams.get("groupId");
    const rsvpStatus = searchParams.get("rsvpStatus");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    if (type === "groups") {
      const groups = await getGuestGroups(id);
      return ok(groups);
    }

    const result = await getGuests(id, {
      page,
      limit,
      groupId: groupId ? parseInt(groupId, 10) : undefined,
      rsvpStatus: rsvpStatus || undefined,
    });

    return ok({ data: result.data, stats: result.stats, meta: result.meta });
  }, "GET /api/events/[eventId]/guests");
}

// POST /api/events/[eventId]/guests - Create guest or group
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId } = await params;
    const id = parseInt(eventId, 10);
    await requireFeature("guest_lists");
    await requireEventSectionAccess(id, "guests", "edit");
    const body = await request.json();

    const { type } = body;

    // Create guest group
    if (type === "group") {
      const { name, tableNumber, notes } = body;

      if (!name) {
        return badRequest("Name is required");
      }

      const group = await createGuestGroup(id, { name, tableNumber, notes });
      return created(group);
    }

    // Bulk create guests
    if (type === "bulk" && Array.isArray(body.guests)) {
      const bulkResult = await bulkCreateGuests(id, body.guests);
      return created(bulkResult);
    }

    // Create single guest
    const { firstName } = body;

    if (!firstName) {
      return badRequest("First name is required");
    }

    const guest = await createGuest(id, body);
    return created(guest);
  }, "POST /api/events/[eventId]/guests");
}
