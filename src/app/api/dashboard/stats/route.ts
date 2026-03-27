import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { requireAuth } from "@/lib/session";
import { events, tasks, organizations, providerEventAccess, financialDocuments, organizationFinanceSettings, vendors, taskParticipants } from "@/db/schema";
import { eq, and, count, inArray, sum, sql } from "drizzle-orm";
import { getUserEventAccess } from "@/lib/event-permissions";
import { withMonitoring } from "@/lib/monitoring";
import { isMarketplaceType } from "@/lib/tenant-type";

/**
 * Unified dashboard stats endpoint.
 * Returns planner-style stats by default, or provider-style stats
 * when the org is a marketplace/provider type.
 */
export const GET = withMonitoring(async (_request: NextRequest) => {
  const session = await requireAuth();
  const orgId = session.organizationId;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  });

  // Provider/marketplace org: return collaboration-focused stats
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

  const recentEvents = await db.query.events.findMany({
    where: and(
      eq(events.organizationId, orgId),
      ...(allowedEventIds !== null ? [inArray(events.id, allowedEventIds)] : [])
    ),
    orderBy: (events, { desc }) => [desc(events.createdAt)],
    limit: 5,
  });

  const pendingTasksList = await db.query.tasks.findMany({
    where: and(
      eq(tasks.organizationId, orgId),
      eq(tasks.status, "pending"),
      ...(allowedEventIds !== null ? [inArray(tasks.eventId, allowedEventIds)] : [])
    ),
    orderBy: (tasks, { asc }) => [asc(tasks.dueDate)],
    limit: 5,
  });

  return NextResponse.json({
    type: "planner",
    totalEvents: eventsResult[0]?.count || 0,
    pendingTasks: tasksResult[0]?.count || 0,
    pendingPayments: 0,
    activeLeads: 0,
    recentEvents: recentEvents.map((e) => ({
      id: e.id,
      name: e.name,
      date: e.date,
      status: e.status,
      guestCount: e.guestCount,
    })),
    pendingTasksList: pendingTasksList.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate,
    })),
  });
}, { name: "GET /api/dashboard/stats" });

async function getProviderStats(
  orgId: number,
  org: { name: string; verificationStatus: string | null; instagramHandle: string | null; providerCategory: string | null }
) {
  const [eventCount] = await db
    .select({ count: count() })
    .from(providerEventAccess)
    .where(
      and(
        eq(providerEventAccess.providerOrgId, orgId),
        sql`${providerEventAccess.status} IN ('active', 'pending')`
      )
    );

  const activeAccess = await db
    .select({ eventId: providerEventAccess.eventId })
    .from(providerEventAccess)
    .where(
      and(
        eq(providerEventAccess.providerOrgId, orgId),
        eq(providerEventAccess.status, "active")
      )
    );
  const activeEventIds = activeAccess.map((a) => a.eventId);

  const linkedVendors = await db
    .select({ id: vendors.id })
    .from(vendors)
    .where(eq(vendors.providerOrgId, orgId));
  const vendorIds = linkedVendors.map((v) => v.id);

  let taskCountValue = 0;
  if (activeEventIds.length > 0 && vendorIds.length > 0) {
    const [taskCount] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${tasks.id})` })
      .from(tasks)
      .innerJoin(taskParticipants, eq(taskParticipants.taskId, tasks.id))
      .where(
        and(
          inArray(tasks.eventId, activeEventIds),
          inArray(taskParticipants.vendorId, vendorIds),
          sql`${tasks.status} NOT IN ('completed', 'cancelled')`
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

  return NextResponse.json({
    type: "provider",
    organization: {
      name: org.name,
      verificationStatus: org.verificationStatus,
      instagramHandle: org.instagramHandle,
      providerCategory: org.providerCategory,
    },
    stats: {
      activeEvents: eventCount?.count ?? 0,
      pendingTasks: taskCountValue,
      totalRevenue: Number(revenue?.total ?? 0),
      pendingInvoices: pendingInvoices?.count ?? 0,
      currency: financeSettings?.defaultCurrency || "EUR",
    },
  });
}
