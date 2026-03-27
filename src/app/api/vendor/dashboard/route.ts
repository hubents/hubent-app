import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { organizations, providerEventAccess, tasks, events, financialDocuments, organizationFinanceSettings, vendors, taskParticipants } from "@/db/schema";
import { eq, and, count, sum, sql, inArray } from "drizzle-orm";
import { isMarketplaceType } from "@/lib/tenant-type";

/**
 * GET /api/vendor/dashboard
 * Returns provider-specific dashboard stats
 */
export async function GET() {
  try {
    const session = await requireAuth();

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.organizationId),
    });

    if (!org) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Organization not found" } },
        { status: 404 }
      );
    }

    if (org.orgType !== "provider") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Not a provider organization" } },
        { status: 403 }
      );
    }

    // Count events (active + pending via provider_event_access)
    const [eventCount] = await db
      .select({ count: count() })
      .from(providerEventAccess)
      .where(
        and(
          eq(providerEventAccess.providerOrgId, session.organizationId),
          sql`${providerEventAccess.status} IN ('active', 'pending')`
        )
      );

    // Count pending tasks from shared events (where provider has active access)
    const activeAccess = await db
      .select({ eventId: providerEventAccess.eventId })
      .from(providerEventAccess)
      .where(
        and(
          eq(providerEventAccess.providerOrgId, session.organizationId),
          eq(providerEventAccess.status, "active")
        )
      );
    const activeEventIds = activeAccess.map((a) => a.eventId);

    // Get vendor IDs linked to this provider org
    const linkedVendors = await db
      .select({ id: vendors.id })
      .from(vendors)
      .where(eq(vendors.providerOrgId, session.organizationId));
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

    // Revenue from paid invoices (exclude mirrors)
    const [revenue] = await db
      .select({ total: sum(financialDocuments.total) })
      .from(financialDocuments)
      .where(
        and(
          eq(financialDocuments.organizationId, session.organizationId),
          eq(financialDocuments.type, "invoice"),
          eq(financialDocuments.status, "paid"),
          sql`${financialDocuments.sourceDocumentId} IS NULL`
        )
      );

    // Count pending invoices (exclude mirrors)
    const [pendingInvoices] = await db
      .select({ count: count() })
      .from(financialDocuments)
      .where(
        and(
          eq(financialDocuments.organizationId, session.organizationId),
          eq(financialDocuments.type, "invoice"),
          sql`${financialDocuments.status} IN ('draft', 'sent')`,
          sql`${financialDocuments.sourceDocumentId} IS NULL`
        )
      );

    // Get currency setting
    const financeSettings = await db.query.organizationFinanceSettings.findFirst({
      where: eq(organizationFinanceSettings.organizationId, session.organizationId),
      columns: { defaultCurrency: true },
    });

    return NextResponse.json({
      success: true,
      data: {
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
      },
    });
  } catch (error) {
    console.error("GET /api/vendor/dashboard error:", error);
    const message = error instanceof Error ? error.message : "Failed to load dashboard";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}
