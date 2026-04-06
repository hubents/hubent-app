import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { eventParticipants, eventCollaborations, events, users, organizations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFoundError, validationError } from "@/lib/api/api-errors";

export const GET = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const eventId = parseInt(params.id, 10);
    if (isNaN(eventId)) throw validationError("Invalid event ID.", "id");

    const [event] = await db.select({ id: events.id }).from(events)
      .where(and(eq(events.id, eventId), eq(events.organizationId, session.organizationId))).limit(1);
    if (!event) throw notFoundError("Event", params.id);

    // Individual collaborators (team members, contacts)
    const collaborators = await db
      .select({
        id: eventParticipants.id,
        userId: eventParticipants.userId,
        eventId: eventParticipants.eventId,
        type: eventParticipants.type,
        permissions: eventParticipants.permissions,
        addedAt: eventParticipants.invitedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(eventParticipants)
      .leftJoin(users, eq(eventParticipants.userId, users.id))
      .where(eq(eventParticipants.eventId, eventId));

    // Org-level partnerships (event_collaborations)
    const partnerships = await db
      .select({
        id: eventCollaborations.id,
        guestOrgId: eventCollaborations.guestOrgId,
        invitationEmail: eventCollaborations.invitationEmail,
        status: eventCollaborations.status,
        permissions: eventCollaborations.permissions,
        invitedAt: eventCollaborations.invitedAt,
        acceptedAt: eventCollaborations.acceptedAt,
        guestOrgName: organizations.name,
        guestOrgType: organizations.orgType,
      })
      .from(eventCollaborations)
      .leftJoin(organizations, eq(organizations.id, eventCollaborations.guestOrgId))
      .where(eq(eventCollaborations.eventId, eventId));

    return {
      data: {
        object: "list",
        data: [
          ...collaborators.map((c) => ({ object: "collaborator" as const, ...c })),
          ...partnerships.map((p) => ({ object: "partnership" as const, ...p })),
        ],
        url: `/api/v1/events/${eventId}/collaborators`,
      },
    };
  },
  { scope: "events:read" }
);
