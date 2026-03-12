import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { eventScheduleItems, events } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { validationError, notFoundError } from "@/lib/api/api-errors";
import { z } from "zod";

export const GET = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const eventId = parseInt(params.id, 10);
    if (isNaN(eventId)) throw validationError("Invalid event ID.", "id");

    const [event] = await db.select({ id: events.id }).from(events)
      .where(and(eq(events.id, eventId), eq(events.organizationId, session.organizationId))).limit(1);
    if (!event) throw notFoundError("Event", params.id);

    const items = await db
      .select()
      .from(eventScheduleItems)
      .where(and(eq(eventScheduleItems.eventId, eventId), eq(eventScheduleItems.organizationId, session.organizationId)))
      .orderBy(asc(eventScheduleItems.date), asc(eventScheduleItems.sortOrder));

    return { data: { object: "list", data: items.map((i) => ({ object: "schedule_item", ...i })), url: `/api/v1/events/${eventId}/schedule` } };
  },
  { scope: "events:read" }
);

const createScheduleItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  date: z.string().datetime(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  color: z.string().optional(),
  sort_order: z.number().int().optional(),
});

export const POST = withApiAuth(
  async (request: NextRequest, { session, params }) => {
    const eventId = parseInt(params.id, 10);
    if (isNaN(eventId)) throw validationError("Invalid event ID.", "id");

    const [event] = await db.select({ id: events.id }).from(events)
      .where(and(eq(events.id, eventId), eq(events.organizationId, session.organizationId))).limit(1);
    if (!event) throw notFoundError("Event", params.id);

    const body = await request.json();
    const parsed = createScheduleItemSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.issues[0].message, parsed.error.issues[0].path.join("."));

    const d = parsed.data;
    const [item] = await db.insert(eventScheduleItems).values({
      eventId,
      organizationId: session.organizationId,
      title: d.title,
      description: d.description,
      date: new Date(d.date),
      startTime: d.start_time,
      endTime: d.end_time,
      location: d.location,
      notes: d.notes,
      color: d.color,
      sortOrder: d.sort_order ?? 0,
    }).returning();

    return { status: 201, data: { object: "schedule_item", ...item } };
  },
  { scope: "events:write", idempotent: true }
);
