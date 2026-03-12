import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { guests, guestGroups, events, rsvpResponses } from "@/db/schema";
import { eq, and, count, desc, gt } from "drizzle-orm";
import { validationError, notFoundError } from "@/lib/api/api-errors";
import { dispatchWebhookEvent } from "@/lib/api/api-webhooks";
import { parsePaginationParams, buildPaginatedResponse } from "@/lib/api/api-utils";
import { z } from "zod";

async function verifyEventAccess(eventId: number, orgId: number) {
  const [event] = await db.select({ id: events.id }).from(events)
    .where(and(eq(events.id, eventId), eq(events.organizationId, orgId))).limit(1);
  if (!event) throw notFoundError("Event", String(eventId));
  return event;
}

export const GET = withApiAuth(
  async (request: NextRequest, { session, params }) => {
    const eventId = parseInt(params.id, 10);
    if (isNaN(eventId)) throw validationError("Invalid event ID.", "id");
    await verifyEventAccess(eventId, session.organizationId);

    const { searchParams } = new URL(request.url);
    const { limit, startingAfter } = parsePaginationParams(searchParams);

    let whereClause = eq(guests.eventId, eventId);
    if (startingAfter) {
      whereClause = and(whereClause, gt(guests.id, startingAfter))!;
    }

    const [totalResult] = await db.select({ count: count() }).from(guests).where(eq(guests.eventId, eventId));

    const results = await db
      .select({
        id: guests.id,
        firstName: guests.firstName,
        lastName: guests.lastName,
        email: guests.email,
        phone: guests.phone,
        ageGroup: guests.ageGroup,
        menuPreference: guests.menuPreference,
        plusOne: guests.plusOne,
        plusOneName: guests.plusOneName,
        dietaryRestrictions: guests.dietaryRestrictions,
        notes: guests.notes,
        groupId: guests.groupId,
        tableId: guests.tableId,
        createdAt: guests.createdAt,
      })
      .from(guests)
      .where(whereClause)
      .orderBy(desc(guests.createdAt))
      .limit(limit);

    return {
      data: buildPaginatedResponse(
        results.map((g) => ({ object: "guest" as const, ...g })),
        totalResult?.count ?? 0,
        `/api/v1/events/${eventId}/guests`,
        limit
      ),
    };
  },
  { scope: "guests:read" }
);

const createGuestSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  age_group: z.enum(["adult", "child", "baby"]).optional(),
  menu_preference: z.string().optional(),
  plus_one: z.boolean().optional(),
  plus_one_name: z.string().optional(),
  dietary_restrictions: z.string().optional(),
  notes: z.string().optional(),
  group_id: z.number().int().optional(),
});

export const POST = withApiAuth(
  async (request: NextRequest, { session, params }) => {
    const eventId = parseInt(params.id, 10);
    if (isNaN(eventId)) throw validationError("Invalid event ID.", "id");
    await verifyEventAccess(eventId, session.organizationId);

    const body = await request.json();
    const parsed = createGuestSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.issues[0].message, parsed.error.issues[0].path.join("."));

    const d = parsed.data;
    const [guest] = await db.insert(guests).values({
      eventId,
      firstName: d.first_name,
      lastName: d.last_name,
      email: d.email,
      phone: d.phone,
      ageGroup: d.age_group || "adult",
      menuPreference: d.menu_preference,
      plusOne: d.plus_one || false,
      plusOneName: d.plus_one_name,
      dietaryRestrictions: d.dietary_restrictions,
      notes: d.notes,
      groupId: d.group_id,
    }).returning();

    void dispatchWebhookEvent(session.organizationId, "guest.created", { ...guest, event_id: eventId }).catch(() => {});

    return { status: 201, data: { object: "guest", ...guest } };
  },
  { scope: "guests:write", idempotent: true }
);
