import { db } from "@/db";
import {
  organizations,
  organizationMembers,
  events,
  subscriptions,
  subscriptionPlans,
  featureFlags,
} from "@/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import type { UsageInfo, PlanInfo } from "@/types";

/**
 * Get real usage counters for an organization
 */
export async function getUsage(orgId: number): Promise<UsageInfo> {
  // Count active members
  const [membersResult] = await db
    .select({ count: count() })
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, orgId));

  // Count active events (not cancelled/completed)
  const [eventsResult] = await db
    .select({ count: count() })
    .from(events)
    .where(
      and(
        eq(events.organizationId, orgId),
        sql`${events.status} NOT IN ('cancelled', 'completed')`
      )
    );

  return {
    users: membersResult?.count ?? 0,
    events: eventsResult?.count ?? 0,
    storage: 0, // TODO: implement storage tracking
  };
}

/**
 * Check if an organization has a specific feature enabled
 */
export async function orgHasFeature(orgId: number, featureKey: string): Promise<boolean> {
  // Get org's plan
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, orgId),
  });

  let planId = sub?.planId;

  if (!planId) {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
      columns: { planId: true },
    });
    planId = org?.planId ?? undefined;
  }

  if (!planId) return false;

  // Check if feature flag exists and includes this plan
  const flag = await db.query.featureFlags.findFirst({
    where: eq(featureFlags.key, featureKey),
  });

  if (!flag || !flag.enabled) return false;
  if (!flag.planIds) return false;

  return flag.planIds.includes(planId);
}

/**
 * Get complete entitlements for an organization (for API response)
 */
export async function getOrgEntitlements(orgId: number) {
  const { getOrgPlanInfo } = await import("@/lib/tenant");
  const plan = await getOrgPlanInfo(orgId);
  const usage = await getUsage(orgId);

  return {
    plan: plan
      ? {
          id: plan.id,
          slug: plan.slug,
          name: plan.name,
        }
      : null,
    features: plan?.features ?? [],
    limits: plan?.limits ?? { maxUsers: 1, maxEvents: 1, maxStorage: 100 },
    usage,
  };
}
