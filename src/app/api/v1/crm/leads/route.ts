import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { leads, leadStages, contacts } from "@/db/schema";
import { eq, and, desc, gt, count, ilike } from "drizzle-orm";
import { parsePaginationParams, buildPaginatedResponse, parseFilterParams } from "@/lib/api/api-utils";
import { validationError } from "@/lib/api/api-errors";
import { dispatchWebhookEvent } from "@/lib/api/api-webhooks";
import { z } from "zod";

const createLeadSchema = z.object({
  title: z.string().min(1).max(300),
  status: z.enum(["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]).optional(),
  value: z.string().optional(),
  contact_id: z.number().int().optional(),
  stage_id: z.number().int().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});

export const GET = withApiAuth(
  async (request: NextRequest, { session }) => {
    const { searchParams } = new URL(request.url);
    const { limit, startingAfter } = parsePaginationParams(searchParams);
    const filters = parseFilterParams(searchParams, ["status", "stage_id", "search"]);

    let whereClause = eq(leads.organizationId, session.organizationId);

    if (filters.status) {
      whereClause = and(whereClause, eq(leads.status, filters.status as "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost"))!;
    }
    if (filters.stage_id) {
      whereClause = and(whereClause, eq(leads.stageId, parseInt(filters.stage_id, 10)))!;
    }
    if (filters.search) {
      whereClause = and(whereClause, ilike(leads.title, `%${filters.search}%`))!;
    }
    if (startingAfter) {
      whereClause = and(whereClause, gt(leads.id, startingAfter))!;
    }

    const [totalResult] = await db.select({ count: count() }).from(leads)
      .where(eq(leads.organizationId, session.organizationId));

    const results = await db
      .select({
        id: leads.id,
        title: leads.title,
        status: leads.status,
        value: leads.value,
        contactId: leads.contactId,
        stageId: leads.stageId,
        source: leads.source,
        notes: leads.description,
        createdAt: leads.createdAt,
        updatedAt: leads.updatedAt,
        contactName: contacts.name,
        stageName: leadStages.name,
      })
      .from(leads)
      .leftJoin(contacts, eq(leads.contactId, contacts.id))
      .leftJoin(leadStages, eq(leads.stageId, leadStages.id))
      .where(whereClause)
      .orderBy(desc(leads.createdAt))
      .limit(limit);

    return {
      data: buildPaginatedResponse(
        results.map((l) => ({ object: "lead" as const, ...l })),
        totalResult?.count ?? 0,
        "/api/v1/crm/leads",
        limit
      ),
    };
  },
  { scope: "crm:read" }
);

export const POST = withApiAuth(
  async (request: NextRequest, { session }) => {
    const body = await request.json();
    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.issues[0].message, parsed.error.issues[0].path.join("."));

    const d = parsed.data;
    const [lead] = await db.insert(leads).values({
      organizationId: session.organizationId,
      title: d.title,
      status: d.status || "new",
      value: d.value,
      contactId: d.contact_id,
      stageId: d.stage_id,
      source: d.source,
      description: d.notes,
    }).returning();

    void dispatchWebhookEvent(session.organizationId, "lead.created", { ...lead }).catch(() => {});

    return { status: 201, data: { object: "lead", ...lead } };
  },
  { scope: "crm:write", idempotent: true }
);
