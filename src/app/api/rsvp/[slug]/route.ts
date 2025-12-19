import { NextRequest, NextResponse } from "next/server";
import { getRsvpLandingPageBySlug, submitRsvp, getGuest } from "@/lib/guests";

type RouteParams = { params: Promise<{ slug: string }> };

// GET /api/rsvp/[slug] - Get RSVP landing page (public)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    const page = await getRsvpLandingPageBySlug(slug);

    if (!page) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "RSVP page not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: page,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch RSVP page";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/rsvp/[slug] - Submit RSVP response (public)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const body = await request.json();

    const { guestId, status, plusOneConfirmed, message: rsvpMessage } = body;

    if (!guestId || !status) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "guestId and status are required" } },
        { status: 400 }
      );
    }

    // Verify guest exists and belongs to this event
    const guest = await getGuest(guestId);
    if (!guest) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Guest not found" } },
        { status: 404 }
      );
    }

    const response = await submitRsvp(guestId, {
      status,
      plusOneConfirmed,
      message: rsvpMessage,
    });

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit RSVP";
    return NextResponse.json(
      { success: false, error: { code: "SUBMIT_ERROR", message } },
      { status: 400 }
    );
  }
}
