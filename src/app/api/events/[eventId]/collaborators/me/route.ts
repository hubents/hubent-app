import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { getEventParticipant } from "@/lib/event-permissions";

type RouteParams = { params: Promise<{ eventId: string }> };

/**
 * GET /api/events/[eventId]/collaborators/me
 * Get the current user's participant record and permissions for this event
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("events:read");
    const { eventId } = await params;
    const id = parseInt(eventId, 10);

    // If user is not event-scoped, they have full access
    if (!session.eventScoped) {
      return NextResponse.json({
        success: true,
        data: {
          isParticipant: true,
          fullAccess: true,
          permissions: {
            general: "edit",
            tasks: "edit",
            guests: "edit",
            rsvp: "edit",
            vendors: "view",
            finances: "view",
            settings: "edit",
          },
        },
      });
    }

    const participant = await getEventParticipant(session.user.userId, id);

    if (!participant) {
      return NextResponse.json({
        success: true,
        data: {
          isParticipant: false,
          fullAccess: false,
          permissions: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        isParticipant: true,
        fullAccess: false,
        participantId: participant.id,
        type: participant.type,
        role: participant.role,
        permissions: participant.permissions || {
          general: "view",
          tasks: "view",
          guests: "view",
          rsvp: "view",
          vendors: "none",
          finances: "none",
          settings: "none",
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error";
    const status = message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}
