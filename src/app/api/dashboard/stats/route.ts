import { NextRequest } from "next/server";
import { db } from "@/db";
import { requireAuth } from "@/lib/session";
import { events, tasks, organizations, providerEventAccess, eventCollaborations, financialDocuments, organizationFinanceSettings, vendors, taskParticipants, contacts, clients, users } from "@/db/schema";
import { eq, and, count, inArray, sum, sql, desc } from "drizzle-orm";
import { getUserEventAccess } from "@/lib/event-permissions";
import { withMonitoring } from "@/lib/monitoring";
import { apiHandler, ok } from "@/lib/api-handler";
import { isMarketplaceType } from "@/lib/tenant-type";

/**
 * Unified dashboard stats endpoint.
 * Returns planner-style stats by default, or provider-style stats
 * when the org is a Partners-visible / provider type.
 */
export const GET = withMonitoring(async (_request: NextRequest) => {
  return apiHandler(async () => {
  const session = await requireAuth();
  const orgId = session.organizationId;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  });

  // Provider org (Partners-visible): return collaboration-focused stats
  if (org && isMarketplaceType(org.orgType || "") && org.orgType === "provider") {
    return getProviderStats(orgId, {
      name: org.name,
      verificationStatus: org.verificationStatus,
      instagramHandle: org.instagramHandle,
      providerCategory: org.providerCategory,
    });
  }

  // Default planner stats
  let allowedEventIds: number[] | null = null;
  if (session.eventScoped) {
    const access = await getUserEventAccess(session.user.userId);
    allowedEventIds = access.map((a) => a.eventId);
  }

  const eventsResult = await db
    .select({ count: count() })
    .from(events)
    .where(
      and(
        eq(events.organizationId, orgId),
        sql`${events.status} != 'cancelled'`,
        ...(allowedEventIds !== null ? [inArray(events.id, allowedEventIds)] : [])
      )
    );

  const tasksResult = await db
    .select({ count: count() })
    .from(tasks)
    .where(
      and(
        eq(tasks.organizationId, orgId),
        eq(tasks.status, "pending"),
        ...(allowedEventIds !== null ? [inArray(tasks.eventId, allowedEventIds)] : [])
      )
    );

  const recentEvents = await db
    .select({
      id: events.id,
      name: events.name,
      date: events.date,
      status: events.status,
      guestCount: events.guestCount,
      location: events.location,
      budget: events.budget,
      type: events.type,
      clientName: clients.name,
      assignedToName: users.name,
    })
    .from(events)
    .leftJoin(clients, eq(events.clientId, clients.id))
    .leftJoin(users, eq(events.createdBy, users.id))
    .where(
      and(
        eq(events.organizationId, orgId),
        ...(allowedEventIds !== null ? [inArray(events.id, allowedEventIds)] : [])
      )
    )
    .orderBy(
      sql`CASE WHEN ${events.date} > NOW() THEN 0 ELSE 1 END`,
      sql`CASE WHEN ${events.date} > NOW() THEN ${events.date} END ASC NULLS LAST`,
      desc(events.createdAt)
    )
    .limit(5);

  // Batch task progress for the 5 recent events
  const recentEventIds = recentEvents.map((e) => e.id);
  const taskCountRows = recentEventIds.length > 0
    ? await db
        .select({
          eventId: tasks.eventId,
          total: count(),
          completed: sql<number>`SUM(CASE WHEN ${tasks.status} = 'completed' THEN 1 ELSE 0 END)::int`,
        })
        .from(tasks)
        .where(inArray(tasks.eventId, recentEventIds))
        .groupBy(tasks.eventId)
    : [];
  const taskCountMap = new Map(taskCountRows.map((r) => [r.eventId, r]));

  const pendingTasksList = await db.query.tasks.findMany({
    where: and(
      eq(tasks.organizationId, orgId),
      eq(tasks.status, "pending"),
      ...(allowedEventIds !== null ? [inArray(tasks.eventId, allowedEventIds)] : [])
    ),
    orderBy: (tasks, { asc }) => [asc(tasks.dueDate)],
    limit: 5,
  });

  // ─── Revenue: balance YTD + 12-month series for sparkline ───────
  // Sums paid outgoing invoices (excluding refund/credit-note children)
  // grouped by issue month. We derive this month vs previous month delta
  // and an array of {month: 'YYYY-MM', total: number} for the last 12 months.
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const seriesStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const paidRows = await db
    .select({
      issueDate: financialDocuments.issueDate,
      total: financialDocuments.total,
    })
    .from(financialDocuments)
    .where(
      and(
        eq(financialDocuments.organizationId, orgId),
        eq(financialDocuments.type, "invoice"),
        eq(financialDocuments.status, "paid"),
        sql`${financialDocuments.sourceDocumentId} IS NULL`,
        sql`${financialDocuments.issueDate} >= ${seriesStart}`
      )
    );

  const byMonth = new Map<string, number>();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, 0);
  }
  let balanceYtd = 0;
  for (const r of paidRows) {
    if (!r.issueDate) continue;
    const d = new Date(r.issueDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const amount = Number(r.total ?? 0);
    if (byMonth.has(key)) byMonth.set(key, (byMonth.get(key) || 0) + amount);
    if (d >= yearStart) balanceYtd += amount;
  }
  const sparkSeries = Array.from(byMonth.entries()).map(([month, total]) => ({ month, total }));
  const thisMonthTotal = sparkSeries[sparkSeries.length - 1]?.total ?? 0;
  const prevMonthTotal = sparkSeries[sparkSeries.length - 2]?.total ?? 0;
  const deltaPct =
    prevMonthTotal > 0
      ? ((thisMonthTotal - prevMonthTotal) / prevMonthTotal) * 100
      : null;

  // Pending payments: sum of sent/draft invoices not yet paid
  const pendingInvoicesRows = await db
    .select({ total: sum(financialDocuments.total) })
    .from(financialDocuments)
    .where(
      and(
        eq(financialDocuments.organizationId, orgId),
        eq(financialDocuments.type, "invoice"),
        sql`${financialDocuments.status} IN ('draft', 'sent')`,
        sql`${financialDocuments.sourceDocumentId} IS NULL`
      )
    );
  const pendingPaymentsAmt = Number(pendingInvoicesRows[0]?.total ?? 0);

  // Active leads: contacts marked as leads
  const leadsResult = await db
    .select({ count: count() })
    .from(contacts)
    .where(
      and(
        eq(contacts.organizationId, orgId),
        eq(contacts.isLead, true)
      )
    );

  // Recent pending invoices for Cronograma "Pagos" tab
  const recentInvoices = await db
    .select({
      id: financialDocuments.id,
      number: financialDocuments.number,
      total: financialDocuments.total,
      status: financialDocuments.status,
      issueDate: financialDocuments.issueDate,
      contactName: contacts.name,
    })
    .from(financialDocuments)
    .leftJoin(contacts, eq(financialDocuments.contactId, contacts.id))
    .where(
      and(
        eq(financialDocuments.organizationId, orgId),
        eq(financialDocuments.type, "invoice"),
        sql`${financialDocuments.sourceDocumentId} IS NULL`
      )
    )
    .orderBy(sql`${financialDocuments.issueDate} DESC NULLS LAST`)
    .limit(10);

  const plannerFinanceSettings = await db.query.organizationFinanceSettings.findFirst({
    where: eq(organizationFinanceSettings.organizationId, orgId),
    columns: { defaultCurrency: true },
  });

  // Onboarding checks for planners
  const [contactCountRows, quoteCountRows] = await Promise.all([
    db.select({ count: count() }).from(contacts).where(eq(contacts.organizationId, orgId)),
    db.select({ count: count() }).from(financialDocuments).where(
      and(eq(financialDocuments.organizationId, orgId), eq(financialDocuments.type, "quote"))
    ),
  ]);
  const contactCount = Number(contactCountRows[0]?.count ?? 0);
  const quoteCount   = Number(quoteCountRows[0]?.count ?? 0);
  const eventCount   = Number(eventsResult[0]?.count ?? 0);

  return ok({
    type: "planner",
    totalEvents: eventsResult[0]?.count || 0,
    pendingTasks: tasksResult[0]?.count || 0,
    pendingPayments: pendingPaymentsAmt,
    activeLeads: leadsResult[0]?.count || 0,
    onboarding: { eventCount, contactCount, quoteCount },
    revenue: {
      balanceYtd,
      thisMonth: thisMonthTotal,
      prevMonth: prevMonthTotal,
      deltaPct,
      series: sparkSeries,
      currency: plannerFinanceSettings?.defaultCurrency || "EUR",
    },
    recentEvents: recentEvents.map((e) => {
      const tc = taskCountMap.get(e.id);
      const totalTasks = Number(tc?.total ?? 0);
      const completedTasks = Number(tc?.completed ?? 0);
      return {
        id: e.id,
        name: e.name,
        date: e.date,
        status: e.status,
        guestCount: e.guestCount,
        location: e.location,
        budget: e.budget !== null && e.budget !== undefined ? Number(e.budget) : null,
        type: e.type,
        clientName: e.clientName ?? null,
        assignedTo: e.assignedToName ?? null,
        taskProgress: totalTasks > 0 ? completedTasks / totalTasks : null,
      };
    }),
    pendingTasksList: pendingTasksList.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate,
    })),
    recentInvoices: recentInvoices.map((inv) => ({
      id: inv.id,
      concept: inv.number || `Factura #${inv.id}`,
      date: inv.issueDate
        ? new Date(inv.issueDate).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
        : "—",
      client: inv.contactName || "—",
      amount: Number(inv.total ?? 0),
      status: inv.status === "paid" ? "Pagada"
        : inv.status === "sent" ? "Pendiente"
        : inv.status === "partial" ? "Parcial"
        : inv.status === "cancelled" ? "Cancelada"
        : "Borrador",
    })),
  });
  }, "GET /api/dashboard/stats");
}, { name: "GET /api/dashboard/stats" });

async function getProviderStats(
  orgId: number,
  org: { name: string; verificationStatus: string | null; instagramHandle: string | null; providerCategory: string | null }
) {
  // Count collaborated events from new table + legacy table
  const [collabCount] = await db
    .select({ count: count() })
    .from(eventCollaborations)
    .where(
      and(
        eq(eventCollaborations.guestOrgId, orgId),
        sql`${eventCollaborations.status} IN ('active', 'pending')`
      )
    );

  const [legacyCount] = await db
    .select({ count: count() })
    .from(providerEventAccess)
    .where(
      and(
        eq(providerEventAccess.providerOrgId, orgId),
        sql`${providerEventAccess.status} IN ('active', 'pending')`
      )
    );

  const totalCollabEvents = (collabCount?.count ?? 0) + (legacyCount?.count ?? 0);

  // Get active event IDs from both tables
  const collabActive = await db
    .select({ eventId: eventCollaborations.eventId })
    .from(eventCollaborations)
    .where(
      and(
        eq(eventCollaborations.guestOrgId, orgId),
        eq(eventCollaborations.status, "active")
      )
    );
  const legacyActive = await db
    .select({ eventId: providerEventAccess.eventId })
    .from(providerEventAccess)
    .where(
      and(
        eq(providerEventAccess.providerOrgId, orgId),
        eq(providerEventAccess.status, "active")
      )
    );
  const activeEventIds = [...new Set([
    ...collabActive.map(a => a.eventId),
    ...legacyActive.map(a => a.eventId),
  ])];

  // Count pending tasks via collaboratorOrgId + legacy vendorId
  let taskCountValue = 0;
  if (activeEventIds.length > 0) {
    const linkedVendors = await db
      .select({ id: vendors.id })
      .from(vendors)
      .where(eq(vendors.providerOrgId, orgId));
    const vendorIds = linkedVendors.map((v) => v.id);

    const [taskCount] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${tasks.id})` })
      .from(tasks)
      .innerJoin(taskParticipants, eq(taskParticipants.taskId, tasks.id))
      .where(
        and(
          inArray(tasks.eventId, activeEventIds),
          sql`${tasks.status} NOT IN ('completed', 'cancelled')`,
          sql`(
            ${taskParticipants.collaboratorOrgId} = ${orgId}
            ${vendorIds.length > 0 ? sql`OR ${taskParticipants.vendorId} IN (${sql.join(vendorIds.map(id => sql`${id}`), sql`, `)})` : sql``}
          )`
        )
      );
    taskCountValue = Number(taskCount?.count ?? 0);
  }

  const [revenue] = await db
    .select({ total: sum(financialDocuments.total) })
    .from(financialDocuments)
    .where(
      and(
        eq(financialDocuments.organizationId, orgId),
        eq(financialDocuments.type, "invoice"),
        eq(financialDocuments.status, "paid"),
        sql`${financialDocuments.sourceDocumentId} IS NULL`
      )
    );

  const [pendingInvoices] = await db
    .select({ count: count() })
    .from(financialDocuments)
    .where(
      and(
        eq(financialDocuments.organizationId, orgId),
        eq(financialDocuments.type, "invoice"),
        sql`${financialDocuments.status} IN ('draft', 'sent')`,
        sql`${financialDocuments.sourceDocumentId} IS NULL`
      )
    );

  const financeSettings = await db.query.organizationFinanceSettings.findFirst({
    where: eq(organizationFinanceSettings.organizationId, orgId),
    columns: { defaultCurrency: true },
  });

  // Own events (created by this org)
  const ownEventsRows = await db
    .select({
      id: events.id,
      name: events.name,
      date: events.date,
      status: events.status,
      guestCount: events.guestCount,
      location: events.location,
      budget: events.budget,
      type: events.type,
      assignedToName: users.name,
    })
    .from(events)
    .leftJoin(users, eq(events.createdBy, users.id))
    .where(eq(events.organizationId, orgId))
    .orderBy(desc(events.date))
    .limit(5);

  const ownEventCount = await db
    .select({ count: count() })
    .from(events)
    .where(eq(events.organizationId, orgId));

  // Batch task progress for own events
  const ownEventIds = ownEventsRows.map((e) => e.id);
  const ownTaskCountRows = ownEventIds.length > 0
    ? await db
        .select({
          eventId: tasks.eventId,
          total: count(),
          completed: sql<number>`SUM(CASE WHEN ${tasks.status} = 'completed' THEN 1 ELSE 0 END)::int`,
        })
        .from(tasks)
        .where(inArray(tasks.eventId, ownEventIds))
        .groupBy(tasks.eventId)
    : [];
  const ownTaskCountMap = new Map(ownTaskCountRows.map((r) => [r.eventId, r]));

  // Own pending tasks
  const ownPendingTasks = await db.query.tasks.findMany({
    where: and(
      eq(tasks.organizationId, orgId),
      eq(tasks.status, "pending"),
    ),
    orderBy: (tasks, { asc }) => [asc(tasks.dueDate)],
    limit: 5,
  });

  // Own invoices
  const ownInvoices = await db
    .select({
      id: financialDocuments.id,
      number: financialDocuments.number,
      total: financialDocuments.total,
      status: financialDocuments.status,
      issueDate: financialDocuments.issueDate,
      contactName: contacts.name,
    })
    .from(financialDocuments)
    .leftJoin(contacts, eq(financialDocuments.contactId, contacts.id))
    .where(
      and(
        eq(financialDocuments.organizationId, orgId),
        eq(financialDocuments.type, "invoice"),
        sql`${financialDocuments.sourceDocumentId} IS NULL`
      )
    )
    .orderBy(sql`${financialDocuments.issueDate} DESC NULLS LAST`)
    .limit(10);

  // Revenue sparkline (same 12-month logic as planner)
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const seriesStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const paidRows = await db
    .select({
      issueDate: financialDocuments.issueDate,
      total: financialDocuments.total,
    })
    .from(financialDocuments)
    .where(
      and(
        eq(financialDocuments.organizationId, orgId),
        eq(financialDocuments.type, "invoice"),
        eq(financialDocuments.status, "paid"),
        sql`${financialDocuments.sourceDocumentId} IS NULL`,
        sql`${financialDocuments.issueDate} >= ${seriesStart}`
      )
    );

  const byMonth = new Map<string, number>();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, 0);
  }
  let balanceYtd = 0;
  for (const r of paidRows) {
    if (!r.issueDate) continue;
    const d = new Date(r.issueDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const amount = Number(r.total ?? 0);
    if (byMonth.has(key)) byMonth.set(key, (byMonth.get(key) || 0) + amount);
    if (d >= yearStart) balanceYtd += amount;
  }
  const sparkSeries = Array.from(byMonth.entries()).map(([month, total]) => ({ month, total }));
  const thisMonthTotal = sparkSeries[sparkSeries.length - 1]?.total ?? 0;
  const prevMonthTotal = sparkSeries[sparkSeries.length - 2]?.total ?? 0;
  const deltaPct =
    prevMonthTotal > 0
      ? ((thisMonthTotal - prevMonthTotal) / prevMonthTotal) * 100
      : null;

  const ownEventCountVal = ownEventCount[0]?.count ?? 0;

  // Get profile completeness from organizations table
  const orgDetails = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { profileCompleteness: true },
  });

  // Count reviews received
  const reviewRows = await db.execute(
    sql`SELECT COUNT(*)::int AS cnt FROM org_reviews WHERE organization_id = ${orgId}`
  );
  const reviewCount = Number((reviewRows.rows?.[0] as { cnt?: number })?.cnt ?? 0);

  // Onboarding checks
  const [portfolioRows, invoiceRows, fiscalRows] = await Promise.all([
    db.execute(sql`SELECT COUNT(*)::int AS cnt FROM org_portfolio WHERE organization_id = ${orgId}`),
    db.execute(sql`SELECT COUNT(*)::int AS cnt FROM financial_documents WHERE organization_id = ${orgId} AND type = 'invoice'`),
    db.execute(sql`SELECT fiscal_name FROM organizations WHERE id = ${orgId}`),
  ]);
  const portfolioCount = Number((portfolioRows.rows?.[0] as { cnt?: number })?.cnt ?? 0);
  const invoiceCount   = Number((invoiceRows.rows?.[0]   as { cnt?: number })?.cnt ?? 0);
  const hasFiscalData  = !!((fiscalRows.rows?.[0] as { fiscal_name?: string })?.fiscal_name);

  return ok({
    type: "provider",
    organization: {
      name: org.name,
      verificationStatus: org.verificationStatus,
      instagramHandle: org.instagramHandle,
      providerCategory: org.providerCategory,
      profileCompleteness: orgDetails?.profileCompleteness ?? 0,
      reviewCount,
      portfolioCount,
      invoiceCount,
      hasFiscalData,
    },
    stats: {
      activeEvents: totalCollabEvents + ownEventCountVal,
      pendingTasks: taskCountValue,
      totalRevenue: Number(revenue?.total ?? 0),
      pendingInvoices: pendingInvoices?.count ?? 0,
      currency: financeSettings?.defaultCurrency || "EUR",
    },
    recentEvents: ownEventsRows.map((e) => {
      const tc = ownTaskCountMap.get(e.id);
      const totalTasks = Number(tc?.total ?? 0);
      const completedTasks = Number(tc?.completed ?? 0);
      return {
        id: e.id,
        name: e.name,
        date: e.date,
        status: e.status,
        guestCount: e.guestCount,
        location: e.location,
        budget: e.budget !== null && e.budget !== undefined ? Number(e.budget) : null,
        type: e.type,
        clientName: null,
        assignedTo: e.assignedToName ?? null,
        taskProgress: totalTasks > 0 ? completedTasks / totalTasks : null,
      };
    }),
    pendingTasksList: ownPendingTasks.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate,
    })),
    recentInvoices: ownInvoices.map((inv) => ({
      id: inv.id,
      concept: inv.number || `Factura #${inv.id}`,
      date: inv.issueDate
        ? new Date(inv.issueDate).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
        : "—",
      client: inv.contactName || "—",
      amount: Number(inv.total ?? 0),
      status: inv.status === "paid" ? "Pagada"
        : inv.status === "sent" ? "Pendiente"
        : inv.status === "partial" ? "Parcial"
        : inv.status === "cancelled" ? "Cancelada"
        : "Borrador",
    })),
    revenue: {
      balanceYtd,
      thisMonth: thisMonthTotal,
      prevMonth: prevMonthTotal,
      deltaPct,
      series: sparkSeries,
      currency: financeSettings?.defaultCurrency || "EUR",
    },
  });
}
