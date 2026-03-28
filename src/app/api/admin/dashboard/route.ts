import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  organizations,
  users,
  subscriptions,
  subscriptionPlans,
} from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/session";
import { eq, count, and, lt, desc, sql } from "drizzle-orm";
import { runHealthChecks } from "@/lib/monitoring/health-checks";
import { logger } from "@/lib/monitoring/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePlatformAdmin();

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    // Run health checks + DB queries in parallel
    const [
      health,
      recentErrors,
      orgsNow,
      orgsPrev,
      usersNow,
      usersPrev,
      activeSubsNow,
      activeSubsPrev,
      revenue,
      recentOrganizations,
      dailySignups,
      planDistribution,
      orgTypeDistribution,
    ] = await Promise.all([
      runHealthChecks(),
      Promise.resolve(logger.getErrorLogs(5)),

      // All organizations (unified — no type filter)
      db.select({ count: count() }).from(organizations),
      db.select({ count: count() }).from(organizations).where(lt(organizations.createdAt, thirtyDaysAgo)),

      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(users).where(lt(users.createdAt, thirtyDaysAgo)),
      db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, "active")),
      db.select({ count: count() }).from(subscriptions).where(
        and(eq(subscriptions.status, "active"), lt(subscriptions.createdAt, thirtyDaysAgo))
      ),

      // MRR
      db
        .select({ priceMonthly: subscriptionPlans.priceMonthly })
        .from(subscriptions)
        .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .where(eq(subscriptions.status, "active")),

      // Recent organizations — ALL types (planners + providers)
      db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          orgType: organizations.orgType,
          status: organizations.status,
          createdAt: organizations.createdAt,
        })
        .from(organizations)
        .orderBy(desc(organizations.createdAt))
        .limit(6),

      // Daily signups last 30 days (all org types)
      db.execute(sql`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM organizations
        WHERE created_at >= ${thirtyDaysAgo.toISOString()}
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC
      `),

      // Plan distribution
      db
        .select({
          planName: subscriptionPlans.name,
          planSlug: subscriptionPlans.slug,
          count: count(),
          priceMonthly: subscriptionPlans.priceMonthly,
        })
        .from(subscriptions)
        .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .where(eq(subscriptions.status, "active"))
        .groupBy(subscriptionPlans.name, subscriptionPlans.slug, subscriptionPlans.priceMonthly),

      // Org type distribution for the donut chart
      db
        .select({ orgType: organizations.orgType, count: count() })
        .from(organizations)
        .groupBy(organizations.orgType),
    ]);

    const mrr = revenue.reduce((t, s) => t + Number(s.priceMonthly || 0), 0);

    function calcDelta(current: number, previous: number): number {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    }

    const orgsCount = orgsNow[0]?.count || 0;
    const orgsPrevCount = orgsPrev[0]?.count || 0;
    const usersCount = usersNow[0]?.count || 0;
    const usersPrevCount = usersPrev[0]?.count || 0;
    const activeSubsCount = activeSubsNow[0]?.count || 0;
    const activeSubsPrevCount = activeSubsPrev[0]?.count || 0;

    // Build org type distribution with labels
    const ORG_TYPE_LABELS: Record<string, string> = {
      tenant: "Planificadores",
      provider: "Proveedores",
      client: "Clientes",
    };
    const orgTypeDistributionMapped = orgTypeDistribution.map((row) => ({
      type: row.orgType || "tenant",
      count: row.count,
      label: ORG_TYPE_LABELS[row.orgType || "tenant"] || row.orgType || "Otro",
    }));

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          organizations: { value: orgsCount, delta: calcDelta(orgsCount, orgsPrevCount) },
          users: { value: usersCount, delta: calcDelta(usersCount, usersPrevCount) },
          activeSubscriptions: { value: activeSubsCount, delta: calcDelta(activeSubsCount, activeSubsPrevCount) },
          mrr: { value: mrr },
          arr: { value: mrr * 12 },
        },
        health,
        recentOrganizations: recentOrganizations.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          orgType: t.orgType,
          status: t.status,
          createdAt: t.createdAt?.toISOString(),
        })),
        dailySignups: (dailySignups.rows || dailySignups || []).map((r: Record<string, unknown>) => ({
          date: String(r.date).slice(0, 10),
          count: Number(r.count),
        })),
        planDistribution: planDistribution.map((p) => ({
          name: p.planName,
          slug: p.planSlug,
          count: p.count,
          mrr: Number(p.priceMonthly || 0) * p.count,
        })),
        orgTypeDistribution: orgTypeDistributionMapped,
        recentErrors: recentErrors.map((e) => ({
          timestamp: e.timestamp,
          level: e.level,
          message: e.message,
          path: e.context.path,
          statusCode: e.context.statusCode,
        })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get dashboard data";
    const status = message.includes("Unauthorized") || message.includes("Platform admin") ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
