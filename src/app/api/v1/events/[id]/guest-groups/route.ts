import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { guestGroups, events } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFoundError, validationError } from "@/lib/api/api-errors";
import { z } from "zod";

export const GET = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const eventId = parseInt(params.id, 10);
    if (isNaN(eventId)) throw validationError("Invalid event ID.", "id");

    const [event] = await db.select({ id: events.id }).from(events)
      .where(and(eq(events.id, eventId), eq(events.organizationId, session.organizationId))).limit(1);
    if (!event) throw notFoundError("Event", params.id);

    const groups = await db.select().from(guestGroups).where(eq(guestGroups.eventId, eventId));

    return { data: { object: "list", data: groups.map((g) => ({ object: "guest_group", ...g })), url: `/api/v1/events/${eventId}/guest-groups` } };
  },
  { scope: "guests:read" }
);

const createGroupSchema = z.object({
  name: z.string().min(1),
  table_number: z.number().int().optional(),
  notes: z.string().optional(),
});

export const POST = withApiAuth(
  async (request: NextRequest, { session, params }) => {
    const eventId = parseInt(params.id, 10);
    if (isNaN(eventId)) throw validationError("Invalid event ID.", "id");

    const [event] = await db.select({ id: events.id }).from(events)
      .where(and(eq(events.id, eventId), eq(events.organizationId, session.organizationId))).limit(1);
    if (!event) throw notFoundError("Event", params.id);

    const body = await request.json();
    const parsed = createGroupSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.issues[0].message, parsed.error.issues[0].path.join("."));

    const d = parsed.data;
    const [group] = await db.insert(guestGroups).values({
      eventId,
      name: d.name,
      tableNumber: d.table_number,
      notes: d.notes,
    }).returning();

    return { status: 201, data: { object: "guest_group", ...group } };
  },
  { scope: "guests:write", idempotent: true }
);
