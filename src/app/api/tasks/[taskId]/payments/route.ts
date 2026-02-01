import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { tasks, taskPayments, vendors } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notifyPaymentRegistered } from "@/lib/push-notifications";

// GET /api/tasks/[taskId]/payments - List payments for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await requireRole("viewer");
    const { taskId } = await params;
    const taskIdNum = parseInt(taskId, 10);

    // Verify task belongs to organization
    const [task] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.id, taskIdNum),
          eq(tasks.organizationId, session.organizationId)
        )
      );

    if (!task) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    const payments = await db
      .select({
        id: taskPayments.id,
        taskId: taskPayments.taskId,
        description: taskPayments.description,
        amount: taskPayments.amount,
        date: taskPayments.date,
        status: taskPayments.status,
        vendorId: taskPayments.vendorId,
        paymentMethod: taskPayments.paymentMethod,
        notes: taskPayments.notes,
        createdBy: taskPayments.createdBy,
        createdAt: taskPayments.createdAt,
        vendorName: vendors.name,
        vendorCategory: vendors.category,
        vendorEmail: vendors.email,
        vendorPhone: vendors.phone,
        vendorAddress: vendors.address,
      })
      .from(taskPayments)
      .leftJoin(vendors, eq(taskPayments.vendorId, vendors.id))
      .where(eq(taskPayments.taskId, taskIdNum));

    return NextResponse.json({ success: true, data: payments });
  } catch (error) {
    console.error("GET /api/tasks/[taskId]/payments error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch payments";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/tasks/[taskId]/payments - Add a payment to a task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await requireRole("planner");
    const { taskId } = await params;
    const taskIdNum = parseInt(taskId, 10);
    const body = await request.json();

    const { description, amount, date, vendorId, paymentMethod, notes } = body;

    if (!description || !amount) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Description and amount are required" } },
        { status: 400 }
      );
    }

    // Verify task belongs to organization
    const [task] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.id, taskIdNum),
          eq(tasks.organizationId, session.organizationId)
        )
      );

    if (!task) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    // Get task title for notification
    const [taskData] = await db
      .select({ title: tasks.title })
      .from(tasks)
      .where(eq(tasks.id, taskIdNum));

    const [payment] = await db
      .insert(taskPayments)
      .values({
        taskId: taskIdNum,
        description,
        amount: amount.toString(),
        date: date ? new Date(date) : new Date(),
        vendorId: vendorId || null,
        paymentMethod: paymentMethod || null,
        notes: notes || null,
        createdBy: session.user.userId,
      })
      .returning();

    // Send push notification for new payment
    notifyPaymentRegistered(
      session.organizationId.toString(),
      description,
      amount.toString(),
      "ARS",
      taskData?.title,
      session.user.userId
    ).catch(err => console.error("Push notification failed:", err));

    return NextResponse.json({ success: true, data: payment });
  } catch (error) {
    console.error("POST /api/tasks/[taskId]/payments error:", error);
    const message = error instanceof Error ? error.message : "Failed to add payment";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[taskId]/payments - Delete a payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await requireRole("planner");
    const { taskId } = await params;
    const taskIdNum = parseInt(taskId, 10);
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("paymentId");

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Payment ID is required" } },
        { status: 400 }
      );
    }

    // Verify task belongs to organization
    const [task] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.id, taskIdNum),
          eq(tasks.organizationId, session.organizationId)
        )
      );

    if (!task) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    await db
      .delete(taskPayments)
      .where(
        and(
          eq(taskPayments.id, parseInt(paymentId, 10)),
          eq(taskPayments.taskId, taskIdNum)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks/[taskId]/payments error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete payment";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 500 }
    );
  }
}
