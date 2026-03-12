import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { eventParticipants, events, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFoundError, validationError } from "@/lib/api/api-errors";

export const GET = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const eventId = parseInt(params.id, 10);
    if (isNaN(eventId)) throw validationError("Invalid event ID.", "id");

    const [event] = await db.select({ id: events.id }).from(events)
      .where(and(eq(events.id, eventId), eq(events.organizationId, session.organizationId))).limit(1);
    if (!event) throw notFoundError("Event", params.id);

    const collaborators = await db
      .select({
        id: eventParticipants.id,
        userId: eventParticipants.userId,
        eventId: eventParticipants.eventId,
        permissions: eventParticipants.permissions,
        addedAt: eventParticipants.addedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(eventParticipants)
      .leftJoin(users, eq(eventParticipants.userId, users.id))
      .where(eq(eventParticipants.eventId, eventId));

    return { data: { object: "list", data: collaborators.map((c) => ({ object: "collaborator", ...c })), url: `/api/v1/events/${eventId}/collaborators` } };
  },
  { scope: "events:read" }
);
