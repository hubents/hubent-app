import { NextRequest } from "next/server";
import { getRsvpLandingPageBySlug, submitRsvp, getGuest } from "@/lib/guests";
import { apiHandler, ok, notFound, badRequest } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ slug: string }> };

// GET /api/rsvp/[slug] - Get RSVP landing page (public)
export async function GET(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { slug } = await params;

    const page = await getRsvpLandingPageBySlug(slug);

    if (!page) {
      return notFound("RSVP page not found");
    }

    return ok(page);
  }, "GET /api/rsvp/[slug]");
}

// POST /api/rsvp/[slug] - Submit RSVP response (public)
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const { slug } = await params;
    const body = await request.json();

    const { guestId, status, plusOneConfirmed, message: rsvpMessage } = body;

    if (!guestId || !status) {
      return badRequest("guestId and status are required");
    }

    // Verify guest exists and belongs to this event
    const guest = await getGuest(guestId);
    if (!guest) {
      return notFound("Guest not found");
    }

    const response = await submitRsvp(guestId, {
      status,
      plusOneConfirmed,
      message: rsvpMessage,
    });

    return ok(response);
  }, "POST /api/rsvp/[slug]");
}
