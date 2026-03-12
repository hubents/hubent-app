import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq, and, desc, gt, lt, count, ilike, sql } from "drizzle-orm";
import { parsePaginationParams, buildPaginatedResponse, parseFilterParams } from "@/lib/api/api-utils";
import { validationError } from "@/lib/api/api-errors";
import { dispatchWebhookEvent } from "@/lib/api/api-webhooks";
import { z } from "zod";

const createEventSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(["wedding", "pre_wedding", "post_wedding", "birthday", "corporate", "social", "other"]).optional(),
  status: z.enum(["draft", "confirmed", "in_progress", "completed", "cancelled"]).optional(),
  date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  location: z.string().optional(),
  budget: z.string().optional(),
  guest_count: z.number().int().optional(),
  cover_image: z.string().optional(),
});

export const GET = withApiAuth(
  async (request: NextRequest, { session }) => {
    const { searchParams } = new URL(request.url);
    const { limit, startingAfter } = parsePaginationParams(searchParams);
    const filters = parseFilterParams(searchParams, ["status", "type", "search", "date"]);

    let whereClause = eq(events.organizationId, session.organizationId);

    if (filters.status) {
      whereClause = and(whereClause, eq(events.status, filters.status as "draft" | "confirmed" | "in_progress" | "completed" | "cancelled"))!;
    }
    if (filters.type) {
      whereClause = and(whereClause, eq(events.type, filters.type as "wedding" | "pre_wedding" | "post_wedding" | "birthday" | "corporate" | "social" | "other"))!;
    }
    if (filters.search) {
      whereClause = and(whereClause, ilike(events.name, `%${filters.search}%`))!;
    }
    if (startingAfter) {
      whereClause = and(whereClause, gt(events.id, startingAfter))!;
    }
    if (filters["date.gte"]) {
      whereClause = and(whereClause, gt(events.date, new Date(filters["date.gte"])))!;
    }
    if (filters["date.lte"]) {
      whereClause = and(whereClause, lt(events.date, new Date(filters["date.lte"])))!;
    }

    const [totalResult] = await db
      .select({ count: count() })
      .from(events)
      .where(eq(events.organizationId, session.organizationId));

    const results = await db
      .select({
        id: events.id,
        name: events.name,
        description: events.description,
        type: events.type,
        status: events.status,
        date: events.date,
        endDate: events.endDate,
        location: events.location,
        budget: events.budget,
        guestCount: events.guestCount,
        coverImage: events.coverImage,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
      })
      .from(events)
      .where(whereClause)
      .orderBy(desc(events.createdAt))
      .limit(limit);

    return {
      data: buildPaginatedResponse(
        results.map((e) => ({ object: "event" as const, ...e })),
        totalResult?.count ?? 0,
        "/api/v1/events",
        limit
      ),
    };
  },
  { scope: "events:read" }
);

export const POST = withApiAuth(
  async (request: NextRequest, { session }) => {
    const body = await request.json();
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError(parsed.error.issues[0].message, parsed.error.issues[0].path.join("."));
    }

    const data = parsed.data;
    const [newEvent] = await db
      .insert(events)
      .values({
        organizationId: session.organizationId,
        name: data.name,
        description: data.description,
        type: data.type || "other",
        status: data.status || "draft",
        date: data.date ? new Date(data.date) : null,
        endDate: data.end_date ? new Date(data.end_date) : null,
        location: data.location,
        budget: data.budget,
        guestCount: data.guest_count,
        coverImage: data.cover_image,
      })
      .returning();

    void dispatchWebhookEvent(session.organizationId, "event.created", { id: newEvent.id, ...newEvent }).catch(() => {});

    return {
      status: 201,
      data: { object: "event", ...newEvent },
    };
  },
  { scope: "events:write", idempotent: true }
);
