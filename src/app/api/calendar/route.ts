import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { requireAuth } from "@/lib/session";
import {
  events,
  tasks,
  taskMeetings,
  paymentSchedules,
  taskPayments,
  financialDocuments,
  leads,
} from "@/db/schema";
import { eq, and, gte, lte, isNotNull } from "drizzle-orm";
import type { CalendarItem } from "@/lib/calendar";
import { CALENDAR_COLORS } from "@/lib/calendar";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const orgId = session.organizationId;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { success: false, error: "Missing 'from' and 'to' query params" },
        { status: 400 }
      );
    }

    const fromDate = new Date(from + "T00:00:00");
    const toDate = new Date(to + "T23:59:59");

    const [
      eventRows,
      taskRows,
      meetingRows,
      paymentRows,
      taskPaymentRows,
      documentRows,
      leadRows,
    ] = await Promise.all([
      // 1. Events
      db
        .select({
          id: events.id,
          name: events.name,
          date: events.date,
          endDate: events.endDate,
          location: events.location,
          status: events.status,
          type: events.type,
        })
        .from(events)
        .where(
          and(
            eq(events.organizationId, orgId),
            isNotNull(events.date),
            gte(events.date, fromDate),
            lte(events.date, toDate)
          )
        ),

      // 2. Tasks with dueDate
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          dueDate: tasks.dueDate,
          status: tasks.status,
          priority: tasks.priority,
          eventId: tasks.eventId,
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.organizationId, orgId),
            isNotNull(tasks.dueDate),
            gte(tasks.dueDate, fromDate),
            lte(tasks.dueDate, toDate)
          )
        ),

      // 3. Meetings (join with tasks to filter by org)
      db
        .select({
          id: taskMeetings.id,
          title: taskMeetings.title,
          date: taskMeetings.date,
          startTime: taskMeetings.startTime,
          endTime: taskMeetings.endTime,
          location: taskMeetings.location,
          taskId: taskMeetings.taskId,
        })
        .from(taskMeetings)
        .innerJoin(tasks, eq(taskMeetings.taskId, tasks.id))
        .where(
          and(
            eq(tasks.organizationId, orgId),
            gte(taskMeetings.date, fromDate),
            lte(taskMeetings.date, toDate)
          )
        ),

      // 4. Payment schedules
      db
        .select({
          id: paymentSchedules.id,
          name: paymentSchedules.name,
          dueDate: paymentSchedules.dueDate,
          amount: paymentSchedules.amount,
          isPaid: paymentSchedules.isPaid,
          eventId: paymentSchedules.eventId,
        })
        .from(paymentSchedules)
        .where(
          and(
            eq(paymentSchedules.organizationId, orgId),
            gte(paymentSchedules.dueDate, fromDate),
            lte(paymentSchedules.dueDate, toDate)
          )
        ),

      // 5. Task payments (join with tasks to filter by org)
      db
        .select({
          id: taskPayments.id,
          description: taskPayments.description,
          date: taskPayments.date,
          amount: taskPayments.amount,
          status: taskPayments.status,
          taskId: taskPayments.taskId,
        })
        .from(taskPayments)
        .innerJoin(tasks, eq(taskPayments.taskId, tasks.id))
        .where(
          and(
            eq(tasks.organizationId, orgId),
            gte(taskPayments.date, fromDate),
            lte(taskPayments.date, toDate)
          )
        ),

      // 6. Financial documents (due date)
      db
        .select({
          id: financialDocuments.id,
          number: financialDocuments.number,
          type: financialDocuments.type,
          status: financialDocuments.status,
          dueDate: financialDocuments.dueDate,
          total: financialDocuments.total,
          currency: financialDocuments.currency,
          direction: financialDocuments.direction,
        })
        .from(financialDocuments)
        .where(
          and(
            eq(financialDocuments.organizationId, orgId),
            isNotNull(financialDocuments.dueDate),
            gte(financialDocuments.dueDate, fromDate),
            lte(financialDocuments.dueDate, toDate)
          )
        ),

      // 7. Leads (expected close date)
      db
        .select({
          id: leads.id,
          title: leads.title,
          expectedCloseDate: leads.expectedCloseDate,
          status: leads.status,
          value: leads.value,
          currency: leads.currency,
        })
        .from(leads)
        .where(
          and(
            eq(leads.organizationId, orgId),
            isNotNull(leads.expectedCloseDate),
            gte(leads.expectedCloseDate, fromDate),
            lte(leads.expectedCloseDate, toDate)
          )
        ),
    ]);

    const items: CalendarItem[] = [];

    // Map events
    for (const row of eventRows) {
      if (!row.date) continue;
      items.push({
        id: `event-${row.id}`,
        type: "event",
        title: row.name,
        date: row.date.toISOString(),
        endDate: row.endDate?.toISOString(),
        color: CALENDAR_COLORS.event,
        href: `/dashboard/events/${row.id}`,
        meta: {
          status: row.status ?? undefined,
          location: row.location ?? undefined,
        },
      });
    }

    // Map tasks
    for (const row of taskRows) {
      if (!row.dueDate) continue;
      items.push({
        id: `task-${row.id}`,
        type: "task",
        title: row.title,
        date: row.dueDate.toISOString(),
        color: CALENDAR_COLORS.task,
        href: `/dashboard/tasks?taskId=${row.id}`,
        meta: {
          status: row.status ?? undefined,
          priority: row.priority ?? undefined,
        },
      });
    }

    // Map meetings
    for (const row of meetingRows) {
      items.push({
        id: `meeting-${row.id}`,
        type: "meeting",
        title: row.title,
        date: row.date.toISOString(),
        time: row.startTime ?? undefined,
        color: CALENDAR_COLORS.meeting,
        href: `/dashboard/tasks?taskId=${row.taskId}`,
        meta: {
          location: row.location ?? undefined,
        },
      });
    }

    // Map payment schedules
    for (const row of paymentRows) {
      items.push({
        id: `payment-${row.id}`,
        type: "payment",
        title: row.name,
        date: row.dueDate.toISOString(),
        color: CALENDAR_COLORS.payment,
        href: `/dashboard/finance/payments`,
        meta: {
          status: row.isPaid ? "paid" : "pending",
          amount: row.amount ? parseFloat(row.amount) : undefined,
        },
      });
    }

    // Map task payments
    for (const row of taskPaymentRows) {
      items.push({
        id: `task_payment-${row.id}`,
        type: "task_payment",
        title: row.description,
        date: row.date.toISOString(),
        color: CALENDAR_COLORS.task_payment,
        href: `/dashboard/tasks?taskId=${row.taskId}`,
        meta: {
          status: row.status ?? undefined,
          amount: row.amount ? parseFloat(row.amount) : undefined,
        },
      });
    }

    // Map financial documents
    const docTypeLabels: Record<string, string> = {
      invoice: "Factura",
      quote: "Presupuesto",
      proforma: "Proforma",
      delivery_note: "Albarán",
      credit_note: "Nota crédito",
    };
    const docTypeRoutes: Record<string, string> = {
      invoice: "/dashboard/finance/invoices",
      quote: "/dashboard/finance/quotes",
      proforma: "/dashboard/finance/proformas",
      delivery_note: "/dashboard/finance/delivery-notes",
      credit_note: "/dashboard/finance/invoices",
    };
    for (const row of documentRows) {
      if (!row.dueDate) continue;
      const label = docTypeLabels[row.type] || row.type;
      items.push({
        id: `document-${row.id}`,
        type: "document",
        title: `${label} ${row.number}`,
        date: row.dueDate.toISOString(),
        color: CALENDAR_COLORS.document,
        href: docTypeRoutes[row.type] || "/dashboard/finance",
        meta: {
          status: row.status ?? undefined,
          amount: row.total ? parseFloat(row.total) : undefined,
          currency: row.currency ?? "EUR",
        },
      });
    }

    // Map leads
    for (const row of leadRows) {
      if (!row.expectedCloseDate) continue;
      items.push({
        id: `lead-${row.id}`,
        type: "lead",
        title: row.title,
        date: row.expectedCloseDate.toISOString(),
        color: CALENDAR_COLORS.lead,
        href: `/dashboard/crm?leadId=${row.id}`,
        meta: {
          status: row.status ?? undefined,
          amount: row.value ? parseFloat(row.value) : undefined,
          currency: row.currency ?? "EUR",
        },
      });
    }

    // Sort by date
    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({ success: true, data: items });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error loading calendar";
    if (message.includes("Unauthorized") || message.includes("Please log in")) {
      return NextResponse.json({ success: false, error: message }, { status: 401 });
    }
    console.error("Calendar API error:", error);
    return NextResponse.json(
      { success: false, error: "Error al cargar calendario" },
      { status: 500 }
    );
  }
}
