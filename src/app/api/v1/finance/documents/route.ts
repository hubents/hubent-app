import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { financialDocuments, contacts } from "@/db/schema";
import { eq, and, desc, gt, count, ilike, sql } from "drizzle-orm";
import { parsePaginationParams, buildPaginatedResponse, parseFilterParams } from "@/lib/api/api-utils";
import { validationError } from "@/lib/api/api-errors";
import { dispatchWebhookEvent } from "@/lib/api/api-webhooks";
import { z } from "zod";

const createDocumentSchema = z.object({
  type: z.enum(["quote", "proforma", "invoice", "delivery_note", "credit_note"]),
  contact_id: z.number().int().optional(),
  event_id: z.number().int().optional(),
  vendor_id: z.number().int().optional(),
  direction: z.enum(["incoming", "outgoing"]).optional(),
  issue_date: z.string().datetime().optional(),
  due_date: z.string().datetime().optional(),
  valid_until: z.string().datetime().optional(),
  currency: z.string().optional(),
  payment_method: z.string().optional(),
  payment_terms: z.string().optional(),
  notes: z.string().optional(),
  terms_and_conditions: z.string().optional(),
});

export const GET = withApiAuth(
  async (request: NextRequest, { session }) => {
    const { searchParams } = new URL(request.url);
    const { limit, startingAfter } = parsePaginationParams(searchParams);
    const filters = parseFilterParams(searchParams, ["type", "status", "direction", "event_id", "contact_id", "search"]);

    let whereClause = eq(financialDocuments.organizationId, session.organizationId);

    if (filters.type) {
      whereClause = and(whereClause, eq(financialDocuments.type, filters.type as "quote" | "proforma" | "invoice" | "delivery_note" | "credit_note"))!;
    }
    if (filters.status) {
      whereClause = and(whereClause, eq(financialDocuments.status, filters.status as "draft" | "approved" | "sent" | "paid" | "cancelled" | "accepted" | "rejected" | "delivered" | "payment_promise" | "partial"))!;
    }
    if (filters.direction) {
      whereClause = and(whereClause, eq(financialDocuments.direction, filters.direction))!;
    }
    if (filters.event_id) {
      whereClause = and(whereClause, eq(financialDocuments.eventId, parseInt(filters.event_id, 10)))!;
    }
    if (filters.contact_id) {
      whereClause = and(whereClause, eq(financialDocuments.contactId, parseInt(filters.contact_id, 10)))!;
    }
    if (startingAfter) {
      whereClause = and(whereClause, gt(financialDocuments.id, startingAfter))!;
    }

    const [totalResult] = await db.select({ count: count() }).from(financialDocuments)
      .where(eq(financialDocuments.organizationId, session.organizationId));

    const results = await db
      .select({
        id: financialDocuments.id,
        type: financialDocuments.type,
        number: financialDocuments.number,
        status: financialDocuments.status,
        contactId: financialDocuments.contactId,
        eventId: financialDocuments.eventId,
        vendorId: financialDocuments.vendorId,
        direction: financialDocuments.direction,
        issueDate: financialDocuments.issueDate,
        dueDate: financialDocuments.dueDate,
        subtotal: financialDocuments.subtotal,
        taxAmount: financialDocuments.taxAmount,
        total: financialDocuments.total,
        paidAmount: financialDocuments.paidAmount,
        currency: financialDocuments.currency,
        paymentMethod: financialDocuments.paymentMethod,
        createdAt: financialDocuments.createdAt,
        contactName: contacts.name,
      })
      .from(financialDocuments)
      .leftJoin(contacts, eq(financialDocuments.contactId, contacts.id))
      .where(whereClause)
      .orderBy(desc(financialDocuments.createdAt))
      .limit(limit);

    return {
      data: buildPaginatedResponse(
        results.map((d) => ({ object: "financial_document" as const, ...d })),
        totalResult?.count ?? 0,
        "/api/v1/finance/documents",
        limit
      ),
    };
  },
  { scope: "finance:read" }
);

export const POST = withApiAuth(
  async (request: NextRequest, { session }) => {
    const body = await request.json();
    const parsed = createDocumentSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.issues[0].message, parsed.error.issues[0].path.join("."));

    const d = parsed.data;

    // Generate document number
    const prefixes: Record<string, string> = { quote: "PRES", proforma: "PROF", invoice: "FAC", delivery_note: "ALB", credit_note: "FR" };
    const year = new Date().getFullYear();
    const prefix = prefixes[d.type];
    const [lastDoc] = await db
      .select({ number: financialDocuments.number })
      .from(financialDocuments)
      .where(and(eq(financialDocuments.organizationId, session.organizationId), eq(financialDocuments.type, d.type), sql`EXTRACT(YEAR FROM ${financialDocuments.createdAt}) = ${year}`))
      .orderBy(desc(financialDocuments.createdAt))
      .limit(1);
    let nextNum = 1;
    if (lastDoc?.number) {
      const match = lastDoc.number.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    const number = `${prefix}-${year}-${String(nextNum).padStart(4, "0")}`;

    const [doc] = await db.insert(financialDocuments).values({
      organizationId: session.organizationId,
      type: d.type,
      number,
      status: "draft",
      contactId: d.contact_id,
      eventId: d.event_id,
      vendorId: d.vendor_id,
      direction: d.direction || "outgoing",
      issueDate: d.issue_date ? new Date(d.issue_date) : new Date(),
      dueDate: d.due_date ? new Date(d.due_date) : null,
      validUntil: d.valid_until ? new Date(d.valid_until) : null,
      currency: d.currency || "EUR",
      paymentMethod: d.payment_method,
      paymentTerms: d.payment_terms,
      notes: d.notes,
      termsAndConditions: d.terms_and_conditions,
    }).returning();

    void dispatchWebhookEvent(session.organizationId, "finance.document_created", { ...doc }).catch(() => {});

    return { status: 201, data: { object: "financial_document", ...doc } };
  },
  { scope: "finance:write", idempotent: true }
);
