import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { paymentRecords, contacts } from "@/db/schema";
import { eq, and, desc, gt, count } from "drizzle-orm";
import { parsePaginationParams, buildPaginatedResponse, parseFilterParams } from "@/lib/api/api-utils";
import { validationError } from "@/lib/api/api-errors";
import { dispatchWebhookEvent } from "@/lib/api/api-webhooks";
import { z } from "zod";

const createPaymentSchema = z.object({
  document_id: z.number().int().optional(),
  event_id: z.number().int().optional(),
  contact_id: z.number().int().optional(),
  vendor_id: z.number().int().optional(),
  bank_account_id: z.number().int().optional(),
  amount: z.string(),
  currency: z.string().optional(),
  direction: z.enum(["incoming", "outgoing"]).optional(),
  payment_date: z.string().datetime().optional(),
  payment_method: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const GET = withApiAuth(
  async (request: NextRequest, { session }) => {
    const { searchParams } = new URL(request.url);
    const { limit, startingAfter } = parsePaginationParams(searchParams);
    const filters = parseFilterParams(searchParams, ["direction", "event_id", "document_id", "contact_id"]);

    let whereClause = eq(paymentRecords.organizationId, session.organizationId);

    if (filters.direction) {
      whereClause = and(whereClause, eq(paymentRecords.direction, filters.direction))!;
    }
    if (filters.event_id) {
      whereClause = and(whereClause, eq(paymentRecords.eventId, parseInt(filters.event_id, 10)))!;
    }
    if (filters.document_id) {
      whereClause = and(whereClause, eq(paymentRecords.documentId, parseInt(filters.document_id, 10)))!;
    }
    if (startingAfter) {
      whereClause = and(whereClause, gt(paymentRecords.id, startingAfter))!;
    }

    const [totalResult] = await db.select({ count: count() }).from(paymentRecords)
      .where(eq(paymentRecords.organizationId, session.organizationId));

    const results = await db
      .select({
        id: paymentRecords.id,
        documentId: paymentRecords.documentId,
        eventId: paymentRecords.eventId,
        contactId: paymentRecords.contactId,
        vendorId: paymentRecords.vendorId,
        amount: paymentRecords.amount,
        currency: paymentRecords.currency,
        direction: paymentRecords.direction,
        paymentDate: paymentRecords.paymentDate,
        paymentMethod: paymentRecords.paymentMethod,
        reference: paymentRecords.reference,
        notes: paymentRecords.notes,
        status: paymentRecords.status,
        createdAt: paymentRecords.createdAt,
        contactName: contacts.name,
      })
      .from(paymentRecords)
      .leftJoin(contacts, eq(paymentRecords.contactId, contacts.id))
      .where(whereClause)
      .orderBy(desc(paymentRecords.createdAt))
      .limit(limit);

    return {
      data: buildPaginatedResponse(
        results.map((p) => ({ object: "payment" as const, ...p })),
        totalResult?.count ?? 0,
        "/api/v1/finance/payments",
        limit
      ),
    };
  },
  { scope: "finance:read" }
);

export const POST = withApiAuth(
  async (request: NextRequest, { session }) => {
    const body = await request.json();
    const parsed = createPaymentSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.issues[0].message, parsed.error.issues[0].path.join("."));

    const d = parsed.data;
    const [payment] = await db.insert(paymentRecords).values({
      organizationId: session.organizationId,
      documentId: d.document_id,
      eventId: d.event_id,
      contactId: d.contact_id,
      vendorId: d.vendor_id,
      bankAccountId: d.bank_account_id,
      amount: d.amount,
      currency: d.currency || "EUR",
      direction: d.direction || "incoming",
      paymentDate: d.payment_date ? new Date(d.payment_date) : new Date(),
      paymentMethod: d.payment_method,
      reference: d.reference,
      notes: d.notes,
    }).returning();

    void dispatchWebhookEvent(session.organizationId, "finance.payment_created", { ...payment }).catch(() => {});

    return { status: 201, data: { object: "payment", ...payment } };
  },
  { scope: "finance:write", idempotent: true }
);
