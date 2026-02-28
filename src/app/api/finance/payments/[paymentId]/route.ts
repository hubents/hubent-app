import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { paymentRecords, financialDocuments, contacts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { updatePaymentRecord, deletePaymentRecord } from "@/lib/finance";

type RouteParams = { params: Promise<{ paymentId: string }> };

// GET /api/finance/payments/[paymentId] - Get a single payment record
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
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

    if (!record) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Payment not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch payment";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// PATCH /api/finance/payments/[paymentId] - Update a payment record
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
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

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update payment";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status }
    );
  }
}

// DELETE /api/finance/payments/[paymentId] - Delete a payment record
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("finance:create");
    const { paymentId } = await params;
    const id = parseInt(paymentId, 10);

    await deletePaymentRecord(session, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete payment";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status }
    );
  }
}
