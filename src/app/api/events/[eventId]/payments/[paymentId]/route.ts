import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eventPayments, taskPayments, tasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireEventSectionAccess } from "@/lib/session";
import { updatePaymentRecord, deletePaymentRecord } from "@/lib/finance";

const LEGACY_EVENT_OFFSET = 200000;
const LEGACY_TASK_OFFSET = 300000;

function resolvePaymentSource(id: number): { source: "unified" | "legacy_event" | "legacy_task"; realId: number } {
  if (id >= LEGACY_TASK_OFFSET) return { source: "legacy_task", realId: id - LEGACY_TASK_OFFSET };
  if (id >= LEGACY_EVENT_OFFSET) return { source: "legacy_event", realId: id - LEGACY_EVENT_OFFSET };
  return { source: "unified", realId: id };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; paymentId: string }> }
) {
  try {
    const { eventId, paymentId } = await params;
    const paymentIdNum = parseInt(paymentId, 10);
    const eventIdNum = parseInt(eventId, 10);
    const session = await requireEventSectionAccess(eventIdNum, "finances", "edit");
    const body = await request.json();

    const { source, realId } = resolvePaymentSource(paymentIdNum);

    if (source === "unified") {
      const updated = await updatePaymentRecord(session, realId, {
        amount: body.amount ? parseFloat(body.amount) : undefined,
        paymentMethod: body.paymentMethod,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : undefined,
        reference: body.reference,
        notes: body.notes ?? body.description,
        status: body.status,
        attachmentUrl: body.attachmentUrl,
        attachmentName: body.attachmentName,
      });
      return NextResponse.json({ success: true, data: updated });
    }

    if (source === "legacy_event") {
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (body.description !== undefined) updateData.description = body.description;
      if (body.amount !== undefined) updateData.amount = parseFloat(body.amount).toString();
      if (body.paymentDate !== undefined) updateData.paidDate = new Date(body.paymentDate);
      if (body.status !== undefined) updateData.status = body.status;
      if (body.notes !== undefined) updateData.notes = body.notes;

      const [updated] = await db.update(eventPayments)
        .set(updateData)
        .where(and(eq(eventPayments.id, realId), eq(eventPayments.eventId, eventIdNum)))
        .returning();

      return NextResponse.json({ success: true, data: updated });
    }

    if (source === "legacy_task") {
      const [tp] = await db.select({ taskId: taskPayments.taskId })
        .from(taskPayments)
        .where(eq(taskPayments.id, realId))
        .limit(1);
      if (!tp) {
        return NextResponse.json({ success: false, error: { message: "Payment not found" } }, { status: 404 });
      }
      const [task] = await db.select({ eventId: tasks.eventId, orgId: tasks.organizationId })
        .from(tasks)
        .where(and(eq(tasks.id, tp.taskId), eq(tasks.eventId, eventIdNum), eq(tasks.organizationId, session.organizationId)))
        .limit(1);
      if (!task) {
        return NextResponse.json({ success: false, error: { message: "Payment does not belong to this event" } }, { status: 403 });
      }

      const updateData: Record<string, unknown> = {};
      if (body.description !== undefined) updateData.description = body.description;
      if (body.amount !== undefined) updateData.amount = parseFloat(body.amount).toString();
      if (body.paymentDate !== undefined) updateData.date = new Date(body.paymentDate);
      if (body.status !== undefined) updateData.status = body.status;
      if (body.paymentMethod !== undefined) updateData.paymentMethod = body.paymentMethod;
      if (body.notes !== undefined) updateData.notes = body.notes;

      const [updated] = await db.update(taskPayments)
        .set(updateData)
        .where(eq(taskPayments.id, realId))
        .returning();

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: { message: "Unknown payment source" } }, { status: 400 });
  } catch (error) {
    console.error("Error updating event payment:", error);
    const message = error instanceof Error ? error.message : "Failed to update payment";
    return NextResponse.json({ success: false, error: { code: "UPDATE_ERROR", message } }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; paymentId: string }> }
) {
  try {
    const { eventId, paymentId } = await params;
    const paymentIdNum = parseInt(paymentId, 10);
    const eventIdNum = parseInt(eventId, 10);
    const session = await requireEventSectionAccess(eventIdNum, "finances", "edit");

    const { source, realId } = resolvePaymentSource(paymentIdNum);

    if (source === "unified") {
      await deletePaymentRecord(session, realId);
      return NextResponse.json({ success: true });
    }

    if (source === "legacy_event") {
      await db.delete(eventPayments)
        .where(and(eq(eventPayments.id, realId), eq(eventPayments.eventId, eventIdNum)));
      return NextResponse.json({ success: true });
    }

    if (source === "legacy_task") {
      const [tp] = await db.select({ taskId: taskPayments.taskId })
        .from(taskPayments)
        .where(eq(taskPayments.id, realId))
        .limit(1);
      if (!tp) {
        return NextResponse.json({ success: false, error: { message: "Payment not found" } }, { status: 404 });
      }
      const [task] = await db.select({ eventId: tasks.eventId, orgId: tasks.organizationId })
        .from(tasks)
        .where(and(eq(tasks.id, tp.taskId), eq(tasks.eventId, eventIdNum), eq(tasks.organizationId, session.organizationId)))
        .limit(1);
      if (!task) {
        return NextResponse.json({ success: false, error: { message: "Payment does not belong to this event" } }, { status: 403 });
      }
      await db.delete(taskPayments).where(eq(taskPayments.id, realId));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: { message: "Unknown payment source" } }, { status: 400 });
  } catch (error) {
    console.error("Error deleting event payment:", error);
    const message = error instanceof Error ? error.message : "Failed to delete payment";
    return NextResponse.json({ success: false, error: { code: "DELETE_ERROR", message } }, { status: 400 });
  }
}
