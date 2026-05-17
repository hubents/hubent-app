import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { getEventParticipant } from "@/lib/event-permissions";
import { db } from "@/db";
import { events, eventCollaborations, providerEventAccess } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiHandler, ok } from "@/lib/api-handler";

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
export async function GET(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { eventId } = await params;
    const id = parseInt(eventId, 10);

    if (!session.eventScoped) {
      // Check if event belongs to the user's org (host) or if they're a guest
      const [ownedEvent] = await db
        .select({ id: events.id })
        .from(events)
        .where(and(eq(events.id, id), eq(events.organizationId, session.organizationId)))
        .limit(1);

      if (ownedEvent) {
        // Host org: full access
        return ok({
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
        return ok({
          isParticipant: true,
          fullAccess: false,
          isCollaborator: true,
          permissions: collab.permissions || DEFAULT_COLLAB_PERMISSIONS,
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
        return ok({
          isParticipant: true,
          fullAccess: false,
          isCollaborator: true,
          permissions: DEFAULT_COLLAB_PERMISSIONS,
        });
      }

      // Not owner and not guest: full access (org user viewing unknown event -- API gates will handle)
      return ok({
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
      });
    }

    const participant = await getEventParticipant(session.user.userId, id);

    if (!participant) {
      return ok({
        isParticipant: false,
        fullAccess: false,
        permissions: null,
      });
    }

    return ok({
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
    });
  }, "GET /api/events/[eventId]/collaborators/me");
}
