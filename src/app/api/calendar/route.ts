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
  eventScheduleItems,
  providerEventAccess,
} from "@/db/schema";
import { eq, and, gte, lte, isNotNull, inArray } from "drizzle-orm";
import type { CalendarItem, CalendarItemType } from "@/lib/calendar";
import { CALENDAR_COLORS } from "@/lib/calendar";
import { getUserEventAccess } from "@/lib/event-permissions";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const orgId = session.organizationId;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const eventIdParam = searchParams.get("eventId");
    const filterEventId = eventIdParam ? parseInt(eventIdParam, 10) : null;

    if (!from || !to) {
      return NextResponse.json(
        { success: false, error: "Missing 'from' and 'to' query params" },
        { status: 400 }
      );
    }

    const fromDate = new Date(from + "T00:00:00");
    const toDate = new Date(to + "T23:59:59");

    // For eventScoped users, compute allowed event IDs per section
    let allowedEventIds: number[] | null = null; // null = no filter (full access)
    let taskEventIds: number[] | null = null;
    let financeEventIds: number[] | null = null;
    let hasFinanceAccess = true;
    const allowedTypes: CalendarItemType[] = ["event", "task", "meeting", "payment", "task_payment", "document", "lead", "schedule"];

    // Helper: check org-level permission
    const canOrg = (perm: string): boolean => {
      if (session.role === "owner" || session.role === "admin" || session.role === "provider_owner") return true;
      if (session.isImpersonating) return true;
      if (session.user.platformLevel === "super_admin") return true;
      if (session.permissions.includes(perm)) return true;
      const [resource] = perm.split(":");
      return session.permissions.includes(`${resource}:*`);
    };

    if (session.eventScoped) {
      const access = await getUserEventAccess(session.user.userId);
      allowedEventIds = access.map((a) => a.eventId);
      taskEventIds = access
        .filter((a) => a.permissions.tasks && a.permissions.tasks !== "none")
        .map((a) => a.eventId);
      financeEventIds = access
        .filter((a) => a.permissions.finances && a.permissions.finances !== "none")
        .map((a) => a.eventId);
      hasFinanceAccess = financeEventIds.length > 0;

      // Remove types that eventScoped can't access
      if (!hasFinanceAccess) {
        const remove: CalendarItemType[] = ["payment", "task_payment", "document"];
        remove.forEach((t) => {
          const idx = allowedTypes.indexOf(t);
          if (idx >= 0) allowedTypes.splice(idx, 1);
        });
      }
      // eventScoped never sees leads
      const leadIdx = allowedTypes.indexOf("lead");
      if (leadIdx >= 0) allowedTypes.splice(leadIdx, 1);
    } else {
      // Non-eventScoped: filter by org-level permissions
      if (!canOrg("finance:read")) {
        hasFinanceAccess = false;
        ["payment", "task_payment", "document"].forEach((t) => {
          const idx = allowedTypes.indexOf(t as CalendarItemType);
          if (idx >= 0) allowedTypes.splice(idx, 1);
        });
      }
      if (!canOrg("crm:read")) {
        const idx = allowedTypes.indexOf("lead");
        if (idx >= 0) allowedTypes.splice(idx, 1);
      }
      if (!canOrg("tasks:read")) {
        ["task", "meeting", "task_payment"].forEach((t) => {
          const idx = allowedTypes.indexOf(t as CalendarItemType);
          if (idx >= 0) allowedTypes.splice(idx, 1);
        });
        taskEventIds = [];
      }
    }

    // Vendor support: providers access events via providerEventAccess
    const isVendor = session.orgType === "provider";
    let accessIdMap: Record<number, number> = {};

    if (isVendor) {
      const vendorAccess = await db
        .select({ eventId: providerEventAccess.eventId, accessId: providerEventAccess.id })
        .from(providerEventAccess)
        .where(and(
          eq(providerEventAccess.providerOrgId, orgId),
          eq(providerEventAccess.status, "active")
        ));

      allowedEventIds = vendorAccess.map((a) => a.eventId);
      taskEventIds = [...allowedEventIds];
      financeEventIds = [...allowedEventIds];

      vendorAccess.forEach((a) => { accessIdMap[a.eventId] = a.accessId; });

      // Vendors never see leads
      const leadIdx = allowedTypes.indexOf("lead");
      if (leadIdx >= 0) allowedTypes.splice(leadIdx, 1);
    }

    const [
      eventRows,
      taskRows,
      meetingRows,
      paymentRows,
      taskPaymentRows,
      documentRows,
      leadRows,
      scheduleRows,
    ] = await Promise.all([
      // 1. Events — filter by allowedEventIds for eventScoped, and by filterEventId
      (allowedEventIds !== null && allowedEventIds.length === 0)
        ? Promise.resolve([])
        : db
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
              ...(isVendor ? [] : [eq(events.organizationId, orgId)]),
              isNotNull(events.date),
              gte(events.date, fromDate),
              lte(events.date, toDate),
              ...(allowedEventIds !== null ? [inArray(events.id, allowedEventIds)] : []),
              ...(filterEventId !== null ? [eq(events.id, filterEventId)] : [])
            )
          ),

      // 2. Tasks — filter by taskEventIds for eventScoped, and by filterEventId
      (taskEventIds !== null && taskEventIds.length === 0)
        ? Promise.resolve([])
        : db
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
              ...(isVendor ? [] : [eq(tasks.organizationId, orgId)]),
              isNotNull(tasks.dueDate),
              gte(tasks.dueDate, fromDate),
              lte(tasks.dueDate, toDate),
              ...(taskEventIds !== null ? [inArray(tasks.eventId, taskEventIds)] : []),
              ...(filterEventId !== null ? [eq(tasks.eventId, filterEventId)] : [])
            )
          ),

      // 3. Meetings — filter via task's eventId for eventScoped, and by filterEventId
      (taskEventIds !== null && taskEventIds.length === 0)
        ? Promise.resolve([])
        : db
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
              ...(isVendor ? [] : [eq(tasks.organizationId, orgId)]),
              gte(taskMeetings.date, fromDate),
              lte(taskMeetings.date, toDate),
              ...(taskEventIds !== null ? [inArray(tasks.eventId, taskEventIds)] : []),
              ...(filterEventId !== null ? [eq(tasks.eventId, filterEventId)] : [])
            )
          ),

      // 4. Payment schedules — filter by financeEventIds for eventScoped, and by filterEventId
      (!hasFinanceAccess || (financeEventIds !== null && financeEventIds.length === 0))
        ? Promise.resolve([])
        : db
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
              ...(isVendor ? [] : [eq(paymentSchedules.organizationId, orgId)]),
              gte(paymentSchedules.dueDate, fromDate),
              lte(paymentSchedules.dueDate, toDate),
              ...(financeEventIds !== null ? [inArray(paymentSchedules.eventId, financeEventIds)] : []),
              ...(filterEventId !== null ? [eq(paymentSchedules.eventId, filterEventId)] : [])
            )
          ),

      // 5. Task payments — needs both finance AND task access
      (!hasFinanceAccess || (financeEventIds !== null && financeEventIds.length === 0) || (taskEventIds !== null && taskEventIds.length === 0))
        ? Promise.resolve([])
        : db
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
              ...(isVendor ? [] : [eq(tasks.organizationId, orgId)]),
              gte(taskPayments.date, fromDate),
              lte(taskPayments.date, toDate),
              ...(financeEventIds !== null ? [inArray(tasks.eventId, financeEventIds)] : []),
              ...(filterEventId !== null ? [eq(tasks.eventId, filterEventId)] : [])
            )
          ),

      // 6. Financial documents — exclude entirely if no finance access, filter by filterEventId
      !hasFinanceAccess
        ? Promise.resolve([])
        : db
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
              ...(isVendor ? [] : [eq(financialDocuments.organizationId, orgId)]),
              isNotNull(financialDocuments.dueDate),
              gte(financialDocuments.dueDate, fromDate),
              lte(financialDocuments.dueDate, toDate),
              ...(isVendor && allowedEventIds !== null ? [inArray(financialDocuments.eventId, allowedEventIds)] : []),
              ...(filterEventId !== null ? [eq(financialDocuments.eventId, filterEventId)] : [])
            )
          ),

      // 7. Leads — exclude for eventScoped, vendors, when filtering by event, or without crm:read
      (isVendor || session.eventScoped || filterEventId !== null || !canOrg("crm:read"))
        ? Promise.resolve([])
        : db
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

      // 8. Event schedule items — filter by allowedEventIds for eventScoped, and by filterEventId
      (allowedEventIds !== null && allowedEventIds.length === 0)
        ? Promise.resolve([])
        : db
          .select({
            id: eventScheduleItems.id,
            title: eventScheduleItems.title,
            date: eventScheduleItems.date,
            startTime: eventScheduleItems.startTime,
            endTime: eventScheduleItems.endTime,
            eventId: eventScheduleItems.eventId,
          })
          .from(eventScheduleItems)
          .where(
            and(
              ...(isVendor ? [] : [eq(eventScheduleItems.organizationId, orgId)]),
              gte(eventScheduleItems.date, fromDate),
              lte(eventScheduleItems.date, toDate),
              ...(allowedEventIds !== null ? [inArray(eventScheduleItems.eventId, allowedEventIds)] : []),
              ...(filterEventId !== null ? [eq(eventScheduleItems.eventId, filterEventId)] : [])
            )
          ),
    ]);

    const items: CalendarItem[] = [];
    const vendorHref = (eventId: number | null) =>
      eventId && accessIdMap[eventId] ? `/vendor/events/${accessIdMap[eventId]}` : "/vendor/events";

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
        href: isVendor ? vendorHref(row.id) : `/dashboard/events/${row.id}`,
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
        href: isVendor ? vendorHref(row.eventId) : `/dashboard/tasks?taskId=${row.id}`,
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
        href: isVendor ? `/vendor/tasks` : `/dashboard/tasks?taskId=${row.taskId}`,
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
        href: isVendor ? vendorHref(row.eventId) : `/dashboard/finance/payments`,
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
        href: isVendor ? `/vendor/tasks` : `/dashboard/tasks?taskId=${row.taskId}`,
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
        href: isVendor ? `/vendor/finance/${row.type === "invoice" ? "invoices" : "quotes"}` : (docTypeRoutes[row.type] || "/dashboard/finance"),
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

    // Map schedule items
    for (const row of scheduleRows) {
      items.push({
        id: `schedule-${row.id}`,
        type: "schedule",
        title: row.title,
        date: row.date.toISOString(),
        time: row.startTime ?? undefined,
        color: CALENDAR_COLORS.schedule,
        href: isVendor ? vendorHref(row.eventId) : `/dashboard/events/${row.eventId}/schedule`,
        meta: {},
      });
    }

    // Sort by date
    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({ success: true, data: items, allowedTypes });
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
