import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  organizations,
  users,
  subscriptions,
  subscriptionPlans,
} from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/session";
import { eq, count, and, lt, desc, sql, ne } from "drizzle-orm";
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
      tenantsNow,
      tenantsPrev,
      providersNow,
      usersNow,
      usersPrev,
      activeSubsNow,
      activeSubsPrev,
      revenue,
      recentTenants,
      dailySignups,
      planDistribution,
    ] = await Promise.all([
      runHealthChecks(),
      Promise.resolve(logger.getErrorLogs(5)),

      // Current counts
      db.select({ count: count() }).from(organizations).where(ne(organizations.orgType, "provider")),
      db.select({ count: count() }).from(organizations).where(
        and(ne(organizations.orgType, "provider"), lt(organizations.createdAt, thirtyDaysAgo))
      ),
      db.select({ count: count() }).from(organizations).where(eq(organizations.orgType, "provider")),
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

      // Recent tenants
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
        .where(ne(organizations.orgType, "provider"))
        .orderBy(desc(organizations.createdAt))
        .limit(5),

      // Daily signups last 30 days
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
    ]);

    const mrr = revenue.reduce((t, s) => t + Number(s.priceMonthly || 0), 0);

    // Calculate deltas
    function calcDelta(current: number, previous: number): number {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    }

    const tenantsCount = tenantsNow[0]?.count || 0;
    const tenantsPrevCount = tenantsPrev[0]?.count || 0;
    const usersCount = usersNow[0]?.count || 0;
    const usersPrevCount = usersPrev[0]?.count || 0;
    const activeSubsCount = activeSubsNow[0]?.count || 0;
    const activeSubsPrevCount = activeSubsPrev[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          tenants: { value: tenantsCount, delta: calcDelta(tenantsCount, tenantsPrevCount) },
          providers: { value: providersNow[0]?.count || 0 },
          users: { value: usersCount, delta: calcDelta(usersCount, usersPrevCount) },
          activeSubscriptions: { value: activeSubsCount, delta: calcDelta(activeSubsCount, activeSubsPrevCount) },
          mrr: { value: mrr },
          arr: { value: mrr * 12 },
        },
        health,
        recentTenants: recentTenants.map((t) => ({
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
