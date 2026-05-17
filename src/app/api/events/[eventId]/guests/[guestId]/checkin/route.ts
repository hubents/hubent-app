import { NextRequest } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { checkInGuest } from "@/lib/guests";
import { apiHandler, ok } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ eventId: string; guestId: string }> };

// POST /api/events/[eventId]/guests/[guestId]/checkin - Check in a guest
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { eventId, guestId } = await params;
    const session = await requireEventSectionAccess(parseInt(eventId, 10), "guests", "edit");
    const body = await request.json().catch(() => ({}));

    const checkin = await checkInGuest(
      parseInt(guestId, 10),
      session.user?.userId,
      body.notes
    );

    return ok(checkin);
  }, "POST /api/events/[eventId]/guests/[guestId]/checkin");
}
