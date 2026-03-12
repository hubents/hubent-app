import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { eventDocuments, events } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { validationError, notFoundError } from "@/lib/api/api-errors";

export const GET = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const eventId = parseInt(params.id, 10);
    if (isNaN(eventId)) throw validationError("Invalid event ID.", "id");

    const [event] = await db.select({ id: events.id }).from(events)
      .where(and(eq(events.id, eventId), eq(events.organizationId, session.organizationId))).limit(1);
    if (!event) throw notFoundError("Event", params.id);

    const docs = await db.select().from(eventDocuments).where(eq(eventDocuments.eventId, eventId));

    return { data: { object: "list", data: docs.map((d) => ({ object: "event_document", ...d })), url: `/api/v1/events/${eventId}/documents` } };
  },
  { scope: "events:read" }
);
