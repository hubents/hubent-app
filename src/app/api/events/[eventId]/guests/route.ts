import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { getGuests, createGuest, bulkCreateGuests, getGuestGroups, createGuestGroup } from "@/lib/guests";

type RouteParams = { params: Promise<{ eventId: string }> };

// GET /api/events/[eventId]/guests - List guests
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission("events:read");
    const { eventId } = await params;
    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get("type"); // "guests" or "groups"
    const groupId = searchParams.get("groupId");
    const rsvpStatus = searchParams.get("rsvpStatus");

    if (type === "groups") {
      const groups = await getGuestGroups(parseInt(eventId, 10));
      return NextResponse.json({
        success: true,
        data: groups,
      });
    }

    const result = await getGuests(parseInt(eventId, 10), {
      groupId: groupId ? parseInt(groupId, 10) : undefined,
      rsvpStatus: rsvpStatus || undefined,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      stats: result.stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch guests";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/events/[eventId]/guests - Create guest or group
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requirePermission("events:update");
    const { eventId } = await params;
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

      const group = await createGuestGroup(parseInt(eventId, 10), {
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
      const created = await bulkCreateGuests(parseInt(eventId, 10), body.guests);
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

    const guest = await createGuest(parseInt(eventId, 10), body);

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
