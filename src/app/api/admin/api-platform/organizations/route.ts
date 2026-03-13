import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/session";
import { db } from "@/db";
import { apiKeys, apiKeyLogs, organizations, webhooks, subscriptions, subscriptionPlans } from "@/db/schema";
import { eq, count, sql, desc, and, gt } from "drizzle-orm";

export async function GET() {
  try {
    await requirePlatformAdmin();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orgs = await db
      .select({
        organizationId: organizations.id,
        orgName: organizations.name,
        orgType: organizations.orgType,
        activeKeys: sql<number>`COUNT(DISTINCT CASE WHEN ${apiKeys.isActive} = true THEN ${apiKeys.id} END)`,
        totalKeys: count(apiKeys.id),
        webhookCount: sql<number>`0`,
      })
      .from(organizations)
      .innerJoin(apiKeys, eq(apiKeys.organizationId, organizations.id))
      .groupBy(organizations.id, organizations.name, organizations.orgType)
      .orderBy(desc(count(apiKeys.id)));

    const orgIds = orgs.map((o) => o.organizationId);

    // Get request counts per org (30d)
    let requestsByOrg: Record<number, { total: number; errors: number }> = {};
    if (orgIds.length > 0) {
      const reqStats = await db
        .select({
          orgId: apiKeys.organizationId,
          total: count(),
          errors: sql<number>`COUNT(CASE WHEN ${apiKeyLogs.statusCode} >= 400 THEN 1 END)`,
        })
        .from(apiKeyLogs)
        .innerJoin(apiKeys, eq(apiKeyLogs.apiKeyId, apiKeys.id))
        .where(gt(apiKeyLogs.createdAt, thirtyDaysAgo))
        .groupBy(apiKeys.organizationId);

      for (const r of reqStats) {
        requestsByOrg[r.orgId] = { total: r.total, errors: r.errors };
      }
    }

    // Get webhook counts per org
    let webhooksByOrg: Record<number, number> = {};
    if (orgIds.length > 0) {
      const whStats = await db
        .select({
          orgId: webhooks.organizationId,
          count: count(),
        })
        .from(webhooks)
        .where(eq(webhooks.isActive, true))
        .groupBy(webhooks.organizationId);

      for (const w of whStats) {
        webhooksByOrg[w.orgId] = w.count;
      }
    }

    // Get plan info per org
    let plansByOrg: Record<number, string> = {};
    if (orgIds.length > 0) {
      const planInfo = await db
        .select({
          orgId: subscriptions.organizationId,
          planName: subscriptionPlans.name,
        })
        .from(subscriptions)
        .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .where(eq(subscriptions.status, "active"));

      for (const p of planInfo) {
        if (p.orgId) plansByOrg[p.orgId] = p.planName;
      }
    }

    // Get last used per org
    let lastUsedByOrg: Record<number, string | null> = {};
    if (orgIds.length > 0) {
      const lastUsed = await db
        .select({
          orgId: apiKeys.organizationId,
          lastUsed: sql<string>`MAX(${apiKeys.lastUsedAt})`,
        })
        .from(apiKeys)
        .where(eq(apiKeys.isActive, true))
        .groupBy(apiKeys.organizationId);

      for (const l of lastUsed) {
        lastUsedByOrg[l.orgId] = l.lastUsed;
      }
    }

    const result = orgs.map((org) => ({
      organizationId: org.organizationId,
      orgName: org.orgName,
      orgType: org.orgType,
      plan: plansByOrg[org.organizationId] ?? "—",
      activeKeys: org.activeKeys,
      totalKeys: org.totalKeys,
      webhooks: webhooksByOrg[org.organizationId] ?? 0,
      requests30d: requestsByOrg[org.organizationId]?.total ?? 0,
      errors30d: requestsByOrg[org.organizationId]?.errors ?? 0,
      lastUsedAt: lastUsedByOrg[org.organizationId] ?? null,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch organizations";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ success: false, error: { code: "FETCH_ERROR", message } }, { status });
  }
}
