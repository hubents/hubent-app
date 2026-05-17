import { db } from "@/db";
import {
  organizations,
  users,
  subscriptions,
  subscriptionPlans,
  invoices,
} from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/session";
import { eq, count, sum, and, gte, desc, sql } from "drizzle-orm";
import { apiHandler, ok } from "@/lib/api-handler";

export async function GET() {
  return apiHandler(async () => {
    await requirePlatformAdmin();

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Total organizations
    const [totalOrgs] = await db
      .select({ count: count() })
      .from(organizations);

    // Active organizations (not deleted/suspended)
    const [activeOrgs] = await db
      .select({ count: count() })
      .from(organizations)
      .where(eq(organizations.status, "active"));

    // Total users
    const [totalUsers] = await db
      .select({ count: count() })
      .from(users);

    // Active subscriptions
    const [activeSubs] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));

    // Trialing subscriptions
    const [trialingSubs] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "trialing"));

    // Canceled subscriptions
    const [canceledSubs] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "canceled"));

    // MRR
    const activeSubsWithPlan = await db
      .select({ priceMonthly: subscriptionPlans.priceMonthly })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.status, "active"));

    const mrr = activeSubsWithPlan.reduce(
      (total, s) => total + Number(s.priceMonthly || 0),
      0
    );

    // Total revenue (all time)
    const [totalRevenue] = await db
      .select({ total: sum(invoices.amount) })
      .from(invoices)
      .where(eq(invoices.status, "paid"));

    // Revenue last 30 days
    const [recentRevenue] = await db
      .select({ total: sum(invoices.amount) })
      .from(invoices)
      .where(
        and(
          eq(invoices.status, "paid"),
          gte(invoices.paidAt, thirtyDaysAgo)
        )
      );

    // New orgs last 30 days
    const [newOrgs30d] = await db
      .select({ count: count() })
      .from(organizations)
      .where(gte(organizations.createdAt, thirtyDaysAgo));

    // Plan distribution
    const planDistribution = await db
      .select({
        planName: subscriptionPlans.name,
        planSlug: subscriptionPlans.slug,
        count: count(),
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.status, "active"))
      .groupBy(subscriptionPlans.name, subscriptionPlans.slug);

    // Recent signups
    const recentSignups = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        orgType: organizations.orgType,
        createdAt: organizations.createdAt,
      })
      .from(organizations)
      .orderBy(desc(organizations.createdAt))
      .limit(5);

    // Org type distribution (supports both "tenant" and future "planner" values)
    const [plannerCount] = await db
      .select({ count: count() })
      .from(organizations)
      .where(
        sql`${organizations.orgType} IN ('tenant', 'planner')`
      );

    const [providerCount] = await db
      .select({ count: count() })
      .from(organizations)
      .where(eq(organizations.orgType, "provider"));

    return ok({
      overview: {
        totalOrganizations: totalOrgs?.count || 0,
        activeOrganizations: activeOrgs?.count || 0,
        totalUsers: totalUsers?.count || 0,
        mrr,
        arr: mrr * 12,
      },
      subscriptions: {
        active: activeSubs?.count || 0,
        trialing: trialingSubs?.count || 0,
        canceled: canceledSubs?.count || 0,
      },
      revenue: {
        total: Number(totalRevenue?.total || 0),
        last30Days: Number(recentRevenue?.total || 0),
      },
      growth: {
        newOrgsLast30Days: newOrgs30d?.count || 0,
      },
      planDistribution,
      orgTypeDistribution: {
        planners: plannerCount?.count || 0,
        providers: providerCount?.count || 0,
      },
      recentSignups: recentSignups.map((o) => ({
        id: o.id,
        name: o.name,
        orgType: o.orgType,
        createdAt: o.createdAt?.toISOString(),
      })),
    });
  }, "GET /api/admin/metrics");
}
