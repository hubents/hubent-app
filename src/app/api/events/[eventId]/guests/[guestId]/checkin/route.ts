import { NextRequest, NextResponse } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { checkInGuest } from "@/lib/guests";

type RouteParams = { params: Promise<{ eventId: string; guestId: string }> };

// POST /api/events/[eventId]/guests/[guestId]/checkin - Check in a guest
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId, guestId } = await params;
    const session = await requireEventSectionAccess(parseInt(eventId, 10), "guests", "edit");
    const body = await request.json().catch(() => ({}));

    const checkin = await checkInGuest(
      parseInt(guestId, 10),
      session.user?.userId,
      body.notes
    );

    return NextResponse.json({
      success: true,
      data: checkin,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check in guest";
    return NextResponse.json(
      { success: false, error: { code: "CHECKIN_ERROR", message } },
      { status: 400 }
    );
  }
}
