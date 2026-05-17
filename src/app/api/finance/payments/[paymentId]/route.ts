import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { paymentRecords, financialDocuments, contacts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { updatePaymentRecord, deletePaymentRecord } from "@/lib/finance";
import { apiHandler, ok, notFound } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ paymentId: string }> };

// GET /api/finance/payments/[paymentId] - Get a single payment record
export async function GET(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("finance:read");
    const { paymentId } = await params;
    const id = parseInt(paymentId, 10);

    const [record] = await db
      .select({
        id: paymentRecords.id,
        organizationId: paymentRecords.organizationId,
        documentId: paymentRecords.documentId,
        taskId: paymentRecords.taskId,
        vendorId: paymentRecords.vendorId,
        contactId: paymentRecords.contactId,
        eventId: paymentRecords.eventId,
        bankAccountId: paymentRecords.bankAccountId,
        amount: paymentRecords.amount,
        currency: paymentRecords.currency,
        direction: paymentRecords.direction,
        paymentDate: paymentRecords.paymentDate,
        paymentMethod: paymentRecords.paymentMethod,
        reference: paymentRecords.reference,
        stripePaymentId: paymentRecords.stripePaymentId,
        notes: paymentRecords.notes,
        status: paymentRecords.status,
        attachmentUrl: paymentRecords.attachmentUrl,
        attachmentName: paymentRecords.attachmentName,
        createdBy: paymentRecords.createdBy,
        createdAt: paymentRecords.createdAt,
        documentNumber: financialDocuments.number,
        documentType: financialDocuments.type,
        documentTotal: financialDocuments.total,
        contactName: contacts.name,
      })
      .from(paymentRecords)
      .leftJoin(financialDocuments, eq(paymentRecords.documentId, financialDocuments.id))
      .leftJoin(contacts, eq(paymentRecords.contactId, contacts.id))
      .where(
        and(
          eq(paymentRecords.id, id),
          eq(paymentRecords.organizationId, session.organizationId)
        )
      )
      .limit(1);

    if (!record) return notFound("Payment not found");

    return ok(record);
  }, "GET /api/finance/payments/[paymentId]");
}

// PATCH /api/finance/payments/[paymentId] - Update a payment record
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("finance:create");
    const { paymentId } = await params;
    const id = parseInt(paymentId, 10);
    const body = await request.json();

    const updated = await updatePaymentRecord(session, id, {
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : undefined,
      reference: body.reference,
      notes: body.notes,
      status: body.status,
      attachmentUrl: body.attachmentUrl,
      attachmentName: body.attachmentName,
    });

    return ok(updated);
  }, "PATCH /api/finance/payments/[paymentId]");
}

// DELETE /api/finance/payments/[paymentId] - Delete a payment record
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("finance:create");
    const { paymentId } = await params;
    const id = parseInt(paymentId, 10);

    await deletePaymentRecord(session, id);

    return ok({ deleted: true });
  }, "DELETE /api/finance/payments/[paymentId]");
}
