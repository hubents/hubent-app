import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, taskPayments, eventPayments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);

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
    }> = [];

    // Get direct event payments
    const directPayments = await db
      .select()
      .from(eventPayments)
      .where(eq(eventPayments.eventId, eventIdNum));

    for (const payment of directPayments) {
      payments.push({
        id: payment.id,
        description: payment.description,
        amount: payment.amount,
        status: payment.status || "pending",
        dueDate: payment.dueDate,
        paidDate: payment.paidDate,
        paidTo: payment.paidTo,
        paidBy: payment.paidBy,
        vendorName: null,
        taskTitle: null,
        source: "direct",
      });
    }

    // Get tasks for this event
    const eventTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
      })
      .from(tasks)
      .where(eq(tasks.eventId, eventIdNum));

    // Get payments from tasks
    for (const task of eventTasks) {
      const taskPaymentsData = await db
        .select()
        .from(taskPayments)
        .where(eq(taskPayments.taskId, task.id));

      for (const payment of taskPaymentsData) {
        payments.push({
          id: payment.id + 100000, // Offset to avoid ID collision
          description: payment.description,
          amount: payment.amount,
          status: payment.status || "pending",
          dueDate: payment.date,
          paidDate: payment.status === "paid" ? payment.date : null,
          paidTo: null,
          paidBy: null,
          vendorName: null,
          taskTitle: task.title,
          source: "task",
        });
      }
    }

    return NextResponse.json({ success: true, data: payments });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);
    const body = await request.json();

    const [newPayment] = await db
      .insert(eventPayments)
      .values({
        eventId: eventIdNum,
        description: body.description,
        amount: body.amount,
        status: body.status || "pending",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        paidTo: body.paidTo || null,
        paidBy: body.paidBy || null,
        createdBy: session.user.id,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        id: newPayment.id,
        description: newPayment.description,
        amount: newPayment.amount,
        status: newPayment.status,
        dueDate: newPayment.dueDate,
        paidDate: newPayment.paidDate,
        paidTo: newPayment.paidTo,
        paidBy: newPayment.paidBy,
        vendorName: null,
        taskTitle: null,
        source: "direct",
      },
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
