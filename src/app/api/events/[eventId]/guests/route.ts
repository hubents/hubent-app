import { NextRequest, NextResponse } from "next/server";
import { requireEventSectionAccess, requireFeature } from "@/lib/session";
import { getGuests, createGuest, bulkCreateGuests, getGuestGroups, createGuestGroup } from "@/lib/guests";

type RouteParams = { params: Promise<{ eventId: string }> };

// GET /api/events/[eventId]/guests - List guests
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
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
      return NextResponse.json({
        success: true,
        data: groups,
      });
    }

    const result = await getGuests(id, {
      page,
      limit,
      groupId: groupId ? parseInt(groupId, 10) : undefined,
      rsvpStatus: rsvpStatus || undefined,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      stats: result.stats,
      meta: result.meta,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch guests";
    const status = message.includes("Forbidden") ? 403 : message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}

// POST /api/events/[eventId]/guests - Create guest or group
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
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
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "Name is required" } },
          { status: 400 }
        );
      }

      const group = await createGuestGroup(id, {
        name,
        tableNumber,
        notes,
      });

      return NextResponse.json({
        success: true,
        data: group,
      });
    }

    // Bulk create guests
    if (type === "bulk" && Array.isArray(body.guests)) {
      const created = await bulkCreateGuests(id, body.guests);
      return NextResponse.json({
        success: true,
        data: created,
      });
    }

    // Create single guest
    const { firstName } = body;

    if (!firstName) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "First name is required" } },
        { status: 400 }
      );
    }

    const guest = await createGuest(id, body);

    return NextResponse.json({
      success: true,
      data: guest,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create guest";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}
