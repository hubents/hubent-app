import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, taskPayments, eventPayments, paymentRecords, financialDocuments } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireEventSectionAccess } from "@/lib/session";
import { createPaymentRecord } from "@/lib/finance";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const session = await requireEventSectionAccess(eventIdNum, "finances", "view");

    const payments: Array<{
      id: number;
      description: string;
      amount: string;
      status: string;
      dueDate: Date | string | null;
      paidDate: Date | string | null;
      paidTo: string | null;
      paidBy: string | null;
      vendorName: string | null;
      taskTitle: string | null;
      source: string;
      paymentMethod: string | null;
      reference: string | null;
      documentNumber: string | null;
      attachmentUrl: string | null;
    }> = [];

    // 1. Get unified paymentRecords for this event
    const unifiedPayments = await db
      .select({
        id: paymentRecords.id,
        amount: paymentRecords.amount,
        status: paymentRecords.status,
        paymentDate: paymentRecords.paymentDate,
        paymentMethod: paymentRecords.paymentMethod,
        reference: paymentRecords.reference,
        notes: paymentRecords.notes,
        direction: paymentRecords.direction,
        attachmentUrl: paymentRecords.attachmentUrl,
        vendorId: paymentRecords.vendorId,
        documentId: paymentRecords.documentId,
        documentNumber: financialDocuments.number,
      })
      .from(paymentRecords)
      .leftJoin(financialDocuments, eq(paymentRecords.documentId, financialDocuments.id))
      .where(
        and(
          eq(paymentRecords.organizationId, session.organizationId),
          eq(paymentRecords.eventId, eventIdNum)
        )
      )
      .orderBy(desc(paymentRecords.paymentDate));

    for (const p of unifiedPayments) {
      payments.push({
        id: p.id,
        description: p.notes || (p.documentNumber ? `Pago ${p.documentNumber}` : "Pago"),
        amount: p.amount,
        status: p.status || "complete",
        dueDate: null,
        paidDate: p.paymentDate,
        paidTo: null,
        paidBy: null,
        vendorName: null,
        taskTitle: null,
        source: "unified",
        paymentMethod: p.paymentMethod,
        reference: p.reference,
        documentNumber: p.documentNumber,
        attachmentUrl: p.attachmentUrl,
      });
    }

    // 2. Legacy: direct event payments (only if not yet migrated)
    const directPayments = await db
      .select()
      .from(eventPayments)
      .where(eq(eventPayments.eventId, eventIdNum));

    for (const payment of directPayments) {
      payments.push({
        id: payment.id + 200000,
        description: payment.description,
        amount: payment.amount,
        status: payment.status || "pending",
        dueDate: payment.dueDate,
        paidDate: payment.paidDate,
        paidTo: payment.paidTo,
        paidBy: payment.paidBy,
        vendorName: null,
        taskTitle: null,
        source: "legacy_event",
        paymentMethod: null,
        reference: null,
        documentNumber: null,
        attachmentUrl: null,
      });
    }

    // 3. Legacy: task payments
    const eventTasks = await db
      .select({ id: tasks.id, title: tasks.title })
      .from(tasks)
      .where(eq(tasks.eventId, eventIdNum));

    for (const task of eventTasks) {
      const taskPaymentsData = await db
        .select()
        .from(taskPayments)
        .where(eq(taskPayments.taskId, task.id));

      for (const payment of taskPaymentsData) {
        payments.push({
          id: payment.id + 300000,
          description: payment.description,
          amount: payment.amount,
          status: payment.status || "pending",
          dueDate: payment.date,
          paidDate: payment.status === "paid" ? payment.date : null,
          paidTo: null,
          paidBy: null,
          vendorName: null,
          taskTitle: task.title,
          source: "legacy_task",
          paymentMethod: null,
          reference: null,
          documentNumber: null,
          attachmentUrl: null,
        });
      }
    }

    return NextResponse.json({ success: true, data: payments });
  } catch (error) {
    console.error("Error fetching payments:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch payments";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const session = await requireEventSectionAccess(eventIdNum, "finances", "edit");
    const body = await request.json();

    // Create in unified paymentRecords
    const record = await createPaymentRecord(session, {
      eventId: eventIdNum,
      documentId: body.documentId,
      vendorId: body.vendorId,
      contactId: body.contactId,
      amount: parseFloat(body.amount),
      currency: body.currency || "EUR",
      direction: body.direction || "outgoing",
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
      paymentMethod: body.paymentMethod,
      reference: body.reference,
      notes: body.description || body.notes,
      status: body.status || "complete",
      attachmentUrl: body.attachmentUrl,
      attachmentName: body.attachmentName,
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error("Error creating payment:", error);
    const message = error instanceof Error ? error.message : "Failed to create payment";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}
