import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getEventParticipant } from "@/lib/event-permissions";
import { db } from "@/db";
import { events, eventCollaborations, providerEventAccess } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type RouteParams = { params: Promise<{ eventId: string }> };

const DEFAULT_COLLAB_PERMISSIONS = {
  general: "view",
  calendar: "view",
  tasks: "view",
  partners: "none",
  finances: "none",
  rsvp: "none",
  guests: "none",
  runsheet: "none",
};

/**
 * GET /api/events/[eventId]/collaborators/me
 * Get the current user's participant record and permissions for this event
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { eventId } = await params;
    const id = parseInt(eventId, 10);

    if (!session.eventScoped) {
      // Check if event belongs to the user's org (host) or if they're a guest
      const ownedEvent = await db.query.events.findFirst({
        where: (e, { eq: eqFn, and: andFn }) =>
          andFn(eqFn(e.id, id), eqFn(e.organizationId, session.organizationId)),
        columns: { id: true },
      });

      if (ownedEvent) {
        // Host org: full access
        return NextResponse.json({
          success: true,
          data: {
            isParticipant: true,
            fullAccess: true,
            isCollaborator: false,
            permissions: {
              general: "edit",
              tasks: "edit",
              guests: "edit",
              rsvp: "edit",
              vendors: "edit",
              partners: "edit",
              finances: "edit",
              settings: "edit",
              calendar: "edit",
              runsheet: "edit",
            },
          },
        });
      }

      // Guest org: return event_collaborations permissions
      const [collab] = await db
        .select({ permissions: eventCollaborations.permissions })
        .from(eventCollaborations)
        .where(
          and(
            eq(eventCollaborations.eventId, id),
            eq(eventCollaborations.guestOrgId, session.organizationId),
            eq(eventCollaborations.status, "active"),
          ),
        )
        .limit(1);

      if (collab) {
        return NextResponse.json({
          success: true,
          data: {
            isParticipant: true,
            fullAccess: false,
            isCollaborator: true,
            permissions: collab.permissions || DEFAULT_COLLAB_PERMISSIONS,
          },
        });
      }

      // Legacy fallback: provider_event_access
      const [legacyAccess] = await db
        .select({ id: providerEventAccess.id })
        .from(providerEventAccess)
        .where(
          and(
            eq(providerEventAccess.eventId, id),
            eq(providerEventAccess.providerOrgId, session.organizationId),
            eq(providerEventAccess.status, "active"),
          ),
        )
        .limit(1);

      if (legacyAccess) {
        return NextResponse.json({
          success: true,
          data: {
            isParticipant: true,
            fullAccess: false,
            isCollaborator: true,
            permissions: DEFAULT_COLLAB_PERMISSIONS,
          },
        });
      }

      // Not owner and not guest: full access (org user viewing unknown event -- API gates will handle)
      return NextResponse.json({
        success: true,
        data: {
          isParticipant: true,
          fullAccess: true,
          isCollaborator: false,
          permissions: {
            general: "edit",
            tasks: "edit",
            guests: "edit",
            rsvp: "edit",
            vendors: "edit",
            partners: "edit",
            finances: "edit",
            settings: "edit",
            calendar: "edit",
            runsheet: "edit",
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
          tasks: "none",
          guests: "none",
          rsvp: "none",
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
