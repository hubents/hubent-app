import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { financialDocuments, documentItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFoundError, validationError } from "@/lib/api/api-errors";
import { dispatchWebhookEvent } from "@/lib/api/api-webhooks";

export const GET = withApiAuth(
  async (_request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid document ID.", "id");

    const [doc] = await db.select().from(financialDocuments)
      .where(and(eq(financialDocuments.id, id), eq(financialDocuments.organizationId, session.organizationId))).limit(1);

    if (!doc) throw notFoundError("FinancialDocument", params.id);

    const items = await db.select().from(documentItems).where(eq(documentItems.documentId, id));

    return { data: { object: "financial_document", ...doc, items: items.map((i) => ({ object: "document_item", ...i })) } };
  },
  { scope: "finance:read" }
);

export const PATCH = withApiAuth(
  async (request: NextRequest, { session, params }) => {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw validationError("Invalid document ID.", "id");

    const body = await request.json();
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status !== undefined) updateData.status = body.status;
    if (body.contact_id !== undefined) updateData.contactId = body.contact_id;
    if (body.event_id !== undefined) updateData.eventId = body.event_id;
    if (body.due_date !== undefined) updateData.dueDate = body.due_date ? new Date(body.due_date) : null;
    if (body.valid_until !== undefined) updateData.validUntil = body.valid_until ? new Date(body.valid_until) : null;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.payment_method !== undefined) updateData.paymentMethod = body.payment_method;
    if (body.payment_terms !== undefined) updateData.paymentTerms = body.payment_terms;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.terms_and_conditions !== undefined) updateData.termsAndConditions = body.terms_and_conditions;
    if (body.global_discount !== undefined) updateData.globalDiscount = body.global_discount;
    if (body.global_discount_type !== undefined) updateData.globalDiscountType = body.global_discount_type;

    const [updated] = await db.update(financialDocuments).set(updateData)
      .where(and(eq(financialDocuments.id, id), eq(financialDocuments.organizationId, session.organizationId))).returning();

    if (!updated) throw notFoundError("FinancialDocument", params.id);

    void dispatchWebhookEvent(session.organizationId, "finance.document_updated", { ...updated }).catch(() => {});
    if (body.status !== undefined) {
      void dispatchWebhookEvent(session.organizationId, "finance.document_status_changed", { id: updated.id, status: updated.status }).catch(() => {});
    }

    return { data: { object: "financial_document", ...updated } };
  },
  { scope: "finance:write", idempotent: true }
);
