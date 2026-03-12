import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { contactEvents, contacts, events } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { validationError, notFoundError } from "@/lib/api/api-errors";

export const GET = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const contactId = parseInt(params.id, 10);
    if (isNaN(contactId)) throw validationError("Invalid contact ID.", "id");

    const [contact] = await db.select({ id: contacts.id }).from(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.organizationId, session.organizationId), isNull(contacts.deletedAt))).limit(1);
    if (!contact) throw notFoundError("Contact", params.id);

    const linkedEvents = await db
      .select({
        id: events.id,
        name: events.name,
        type: events.type,
        status: events.status,
        date: events.date,
        role: contactEvents.role,
        linkedAt: contactEvents.createdAt,
      })
      .from(contactEvents)
      .innerJoin(events, eq(contactEvents.eventId, events.id))
      .where(eq(contactEvents.contactId, contactId));

    return { data: { object: "list", data: linkedEvents.map((e) => ({ object: "contact_event", ...e })), url: `/api/v1/contacts/${contactId}/events` } };
  },
  { scope: "contacts:read" }
);
