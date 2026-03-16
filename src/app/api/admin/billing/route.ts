import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  invoices,
  subscriptions,
  subscriptionPlans,
  organizations,
} from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/session";
import { eq, sum, count, desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePlatformAdmin();

    const [
      totalRevenue,
      pendingRevenue,
      activeSubsCount,
      trialingCount,
      canceledCount,
      activeSubs,
      monthlyRevenue,
      planBreakdown,
      recentInvoices,
      trialingSubs,
    ] = await Promise.all([
      db.select({ total: sum(invoices.amount) }).from(invoices).where(eq(invoices.status, "paid")),
      db.select({ total: sum(invoices.amount) }).from(invoices).where(eq(invoices.status, "pending")),
      db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, "active")),
      db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, "trialing")),
      db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, "canceled")),

      // Active subs for MRR calc
      db
        .select({ priceMonthly: subscriptionPlans.priceMonthly })
        .from(subscriptions)
        .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .where(eq(subscriptions.status, "active")),

      // Monthly revenue last 6 months
      db.execute(sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', paid_at), 'YYYY-MM') as month,
          COALESCE(SUM(amount), 0) as revenue
        FROM invoices
        WHERE status = 'paid'
          AND paid_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', paid_at)
        ORDER BY DATE_TRUNC('month', paid_at) ASC
      `),

      // Plan breakdown with MRR contribution
      db
        .select({
          planName: subscriptionPlans.name,
          planSlug: subscriptionPlans.slug,
          priceMonthly: subscriptionPlans.priceMonthly,
          count: count(),
        })
        .from(subscriptions)
        .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .where(eq(subscriptions.status, "active"))
        .groupBy(subscriptionPlans.name, subscriptionPlans.slug, subscriptionPlans.priceMonthly),

      // Recent invoices
      db
        .select({
          id: invoices.id,
          amount: invoices.amount,
          status: invoices.status,
          createdAt: invoices.createdAt,
          orgName: organizations.name,
        })
        .from(invoices)
        .leftJoin(organizations, eq(invoices.organizationId, organizations.id))
        .orderBy(desc(invoices.createdAt))
        .limit(10),

      // Trialing subscriptions with details
      db
        .select({
          id: subscriptions.id,
          orgName: organizations.name,
          planName: subscriptionPlans.name,
          trialEndsAt: subscriptions.trialEndsAt,
          createdAt: subscriptions.createdAt,
        })
        .from(subscriptions)
        .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .innerJoin(organizations, eq(subscriptions.organizationId, organizations.id))
        .where(eq(subscriptions.status, "trialing"))
        .orderBy(subscriptions.trialEndsAt)
        .limit(10),
    ]);

    const mrr = activeSubs.reduce((t, s) => t + Number(s.priceMonthly || 0), 0);
    const totalMrr = mrr;

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalRevenue: Number(totalRevenue[0]?.total || 0),
          pendingRevenue: Number(pendingRevenue[0]?.total || 0),
          activeSubscriptions: activeSubsCount[0]?.count || 0,
          trialingSubscriptions: trialingCount[0]?.count || 0,
          canceledSubscriptions: canceledCount[0]?.count || 0,
          mrr,
          arr: mrr * 12,
        },
        monthlyRevenue: (monthlyRevenue.rows || monthlyRevenue || []).map((r: Record<string, unknown>) => ({
          month: String(r.month),
          revenue: Number(r.revenue),
        })),
        planBreakdown: planBreakdown.map((p) => ({
          name: p.planName,
          slug: p.planSlug,
          price: Number(p.priceMonthly || 0),
          count: p.count,
          mrr: Number(p.priceMonthly || 0) * p.count,
          mrrPercent: totalMrr > 0 ? Math.round((Number(p.priceMonthly || 0) * p.count / totalMrr) * 100) : 0,
        })),
        recentInvoices: recentInvoices.map((inv) => ({
          id: inv.id,
          amount: inv.amount,
          status: inv.status,
          createdAt: inv.createdAt?.toISOString(),
          orgName: inv.orgName,
        })),
        trialingSubs: trialingSubs.map((s) => ({
          id: s.id,
          orgName: s.orgName,
          planName: s.planName,
          trialEnd: s.trialEndsAt?.toISOString(),
          daysLeft: s.trialEndsAt
            ? Math.max(0, Math.ceil((new Date(s.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : 0,
        })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get billing data";
    const status = message.includes("Unauthorized") || message.includes("Platform admin") ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
