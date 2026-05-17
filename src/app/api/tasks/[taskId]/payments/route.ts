import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { tasks, taskPayments, vendors } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notifyPaymentRegistered } from "@/lib/push-notifications";
import { canAccessTask } from "@/lib/tenant";
import { apiHandler, ok, badRequest, notFound, forbidden } from "@/lib/api-handler";

// GET /api/tasks/[taskId]/payments - List payments for a task
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePermission("finance:read");
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
      return notFound("Task not found");
    }

    // For eventScoped roles, verify task-level access
    if (session.eventScoped) {
      const access = await canAccessTask(session, taskIdNum);
      if (!access.allowed) {
        return forbidden(access.reason || "Sin acceso");
      }
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

    return ok(payments);
  }, "GET /api/tasks/[taskId]/payments");
}

// POST /api/tasks/[taskId]/payments - Add a payment to a task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePermission("finance:create");
    const { taskId } = await params;
    const taskIdNum = parseInt(taskId, 10);
    const body = await request.json();

    const { description, amount, date, vendorId, paymentMethod, notes } = body;

    if (!description || !amount) {
      return badRequest("Description and amount are required");
    }

    // Verify task belongs to organization and get title for notification
    const [task] = await db
      .select({ id: tasks.id, title: tasks.title })
      .from(tasks)
      .where(
        and(
          eq(tasks.id, taskIdNum),
          eq(tasks.organizationId, session.organizationId)
        )
      );

    if (!task) {
      return notFound("Task not found");
    }

    // For eventScoped roles, verify task-level access
    if (session.eventScoped) {
      const access = await canAccessTask(session, taskIdNum);
      if (!access.allowed) {
        return forbidden(access.reason || "Sin acceso");
      }
    }

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
      task.title,
      session.user.userId
    ).catch(err => console.error("Push notification failed:", err));

    return ok(payment);
  }, "POST /api/tasks/[taskId]/payments");
}

// DELETE /api/tasks/[taskId]/payments - Delete a payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePermission("finance:create");
    const { taskId } = await params;
    const taskIdNum = parseInt(taskId, 10);
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("paymentId");

    if (!paymentId) {
      return badRequest("Payment ID is required");
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
      return notFound("Task not found");
    }

    // For eventScoped roles, verify task-level access
    if (session.eventScoped) {
      const access = await canAccessTask(session, taskIdNum);
      if (!access.allowed) {
        return forbidden(access.reason || "Sin acceso");
      }
    }

    await db
      .delete(taskPayments)
      .where(
        and(
          eq(taskPayments.id, parseInt(paymentId, 10)),
          eq(taskPayments.taskId, taskIdNum)
        )
      );

    return ok(null);
  }, "DELETE /api/tasks/[taskId]/payments");
}
