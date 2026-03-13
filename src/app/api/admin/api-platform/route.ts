import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/session";
import { db } from "@/db";
import { apiKeys, apiKeyLogs, organizations, webhooks, webhookLogs } from "@/db/schema";
import { eq, count, sql, desc, and, gt } from "drizzle-orm";

export async function GET() {
  try {
    await requirePlatformAdmin();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Total API keys
    const [totalKeys] = await db.select({ count: count() }).from(apiKeys);
    const [activeKeys] = await db.select({ count: count() }).from(apiKeys)
      .where(eq(apiKeys.isActive, true));
    const [revokedKeys] = await db.select({ count: count() }).from(apiKeys)
      .where(eq(apiKeys.isActive, false));

    // Keys by environment
    const keysByEnv = await db
      .select({ environment: apiKeys.environment, count: count() })
      .from(apiKeys)
      .where(eq(apiKeys.isActive, true))
      .groupBy(apiKeys.environment);

    // Request stats (30d)
    const [requestStats] = await db
      .select({
        total: count(),
        errors: sql<number>`COUNT(CASE WHEN ${apiKeyLogs.statusCode} >= 400 THEN 1 END)`,
      })
      .from(apiKeyLogs)
      .where(gt(apiKeyLogs.createdAt, thirtyDaysAgo));

    // Top organizations by usage
    const topOrgs = await db
      .select({
        organizationId: apiKeys.organizationId,
        orgName: organizations.name,
        keyCount: count(apiKeys.id),
      })
      .from(apiKeys)
      .innerJoin(organizations, eq(apiKeys.organizationId, organizations.id))
      .where(eq(apiKeys.isActive, true))
      .groupBy(apiKeys.organizationId, organizations.name)
      .orderBy(desc(count(apiKeys.id)))
      .limit(10);

    // Recent API keys created
    const recentKeys = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        environment: apiKeys.environment,
        isActive: apiKeys.isActive,
        organizationId: apiKeys.organizationId,
        orgName: organizations.name,
        createdAt: apiKeys.createdAt,
        lastUsedAt: apiKeys.lastUsedAt,
      })
      .from(apiKeys)
      .innerJoin(organizations, eq(apiKeys.organizationId, organizations.id))
      .orderBy(desc(apiKeys.createdAt))
      .limit(20);

    // Daily request volume (last 7 days)
    const dailyVolume = await db
      .select({
        date: sql<string>`DATE(${apiKeyLogs.createdAt})`,
        count: count(),
      })
      .from(apiKeyLogs)
      .where(gt(apiKeyLogs.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
      .groupBy(sql`DATE(${apiKeyLogs.createdAt})`)
      .orderBy(sql`DATE(${apiKeyLogs.createdAt})`);

    // Top endpoints
    const topEndpoints = await db
      .select({
        endpoint: apiKeyLogs.path,
        method: apiKeyLogs.method,
        count: count(),
      })
      .from(apiKeyLogs)
      .where(gt(apiKeyLogs.createdAt, thirtyDaysAgo))
      .groupBy(apiKeyLogs.path, apiKeyLogs.method)
      .orderBy(desc(count()))
      .limit(15);

    // Webhook stats
    const [totalWebhooks] = await db.select({ count: count() }).from(webhooks);
    const [activeWebhooks] = await db.select({ count: count() }).from(webhooks)
      .where(eq(webhooks.isActive, true));
    const [webhookDeliveries] = await db
      .select({
        total: count(),
        delivered: sql<number>`COUNT(CASE WHEN ${webhookLogs.status} = 'delivered' THEN 1 END)`,
        failed: sql<number>`COUNT(CASE WHEN ${webhookLogs.status} = 'failed' THEN 1 END)`,
      })
      .from(webhookLogs)
      .where(gt(webhookLogs.createdAt, thirtyDaysAgo));

    // Orgs with API access
    const orgsWithApi = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${apiKeys.organizationId})` })
      .from(apiKeys)
      .where(eq(apiKeys.isActive, true));

    return NextResponse.json({
      success: true,
      data: {
        keys: {
          total: totalKeys?.count ?? 0,
          active: activeKeys?.count ?? 0,
          revoked: revokedKeys?.count ?? 0,
          by_environment: keysByEnv.reduce((acc, e) => {
            if (e.environment) acc[e.environment] = e.count;
            return acc;
          }, {} as Record<string, number>),
        },
        requests: {
          total_30d: requestStats?.total ?? 0,
          errors_30d: requestStats?.errors ?? 0,
          error_rate: requestStats?.total ? ((requestStats.errors / requestStats.total) * 100).toFixed(2) + "%" : "0%",
          daily_volume: dailyVolume,
        },
        webhooks: {
          total: totalWebhooks?.count ?? 0,
          active: activeWebhooks?.count ?? 0,
          deliveries_30d: webhookDeliveries?.total ?? 0,
          delivered_30d: webhookDeliveries?.delivered ?? 0,
          failed_30d: webhookDeliveries?.failed ?? 0,
        },
        orgs_with_api: orgsWithApi?.[0]?.count ?? 0,
        top_organizations: topOrgs,
        top_endpoints: topEndpoints,
        recent_keys: recentKeys,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch API platform stats";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ success: false, error: { code: "FETCH_ERROR", message } }, { status });
  }
}
