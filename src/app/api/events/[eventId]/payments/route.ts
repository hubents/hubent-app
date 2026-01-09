import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, taskPayments } from "@/db/schema";
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

    // Get tasks for this event
    const eventTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
      })
      .from(tasks)
      .where(eq(tasks.eventId, eventIdNum));

    const taskIds = eventTasks.map((t) => t.id);

    if (taskIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Get payments for those tasks
    const payments = [];
    for (const task of eventTasks) {
      const taskPaymentsData = await db
        .select()
        .from(taskPayments)
        .where(eq(taskPayments.taskId, task.id));

      for (const payment of taskPaymentsData) {
        payments.push({
          id: payment.id,
          description: payment.description,
          amount: payment.amount,
          status: payment.status || "pending",
          dueDate: payment.date,
          paidDate: payment.status === "paid" ? payment.date : null,
          vendorName: null,
          taskTitle: task.title,
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
