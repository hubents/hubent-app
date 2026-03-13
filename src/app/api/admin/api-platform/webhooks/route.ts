import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/session";
import { db } from "@/db";
import { webhooks, webhookLogs, organizations } from "@/db/schema";
import { eq, count, sql, desc, gt } from "drizzle-orm";

export async function GET() {
  try {
    await requirePlatformAdmin();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // All webhooks with org info
    const allWebhooks = await db
      .select({
        id: webhooks.id,
        url: webhooks.url,
        events: webhooks.events,
        isActive: webhooks.isActive,
        description: webhooks.description,
        orgId: webhooks.organizationId,
        orgName: organizations.name,
        createdAt: webhooks.createdAt,
      })
      .from(webhooks)
      .innerJoin(organizations, eq(webhooks.organizationId, organizations.id))
      .orderBy(desc(webhooks.createdAt));

    // Delivery stats per webhook (30d)
    const deliveryStats = await db
      .select({
        webhookId: webhookLogs.webhookId,
        total: count(),
        delivered: sql<number>`COUNT(CASE WHEN ${webhookLogs.status} = 'delivered' THEN 1 END)`,
        failed: sql<number>`COUNT(CASE WHEN ${webhookLogs.status} = 'failed' THEN 1 END)`,
        pending: sql<number>`COUNT(CASE WHEN ${webhookLogs.status} = 'pending' THEN 1 END)`,
        lastDelivery: sql<string>`MAX(${webhookLogs.deliveredAt})`,
      })
      .from(webhookLogs)
      .where(gt(webhookLogs.createdAt, thirtyDaysAgo))
      .groupBy(webhookLogs.webhookId);

    const statsMap: Record<number, typeof deliveryStats[0]> = {};
    for (const s of deliveryStats) {
      statsMap[s.webhookId] = s;
    }

    // Recent delivery logs
    const recentDeliveries = await db
      .select({
        id: webhookLogs.id,
        webhookId: webhookLogs.webhookId,
        eventType: webhookLogs.eventType,
        status: webhookLogs.status,
        responseCode: webhookLogs.responseCode,
        attempt: webhookLogs.attempt,
        deliveredAt: webhookLogs.deliveredAt,
        createdAt: webhookLogs.createdAt,
        webhookUrl: webhooks.url,
        orgName: organizations.name,
      })
      .from(webhookLogs)
      .innerJoin(webhooks, eq(webhookLogs.webhookId, webhooks.id))
      .innerJoin(organizations, eq(webhooks.organizationId, organizations.id))
      .orderBy(desc(webhookLogs.createdAt))
      .limit(50);

    const webhooksWithStats = allWebhooks.map((wh) => {
      const stats = statsMap[wh.id];
      return {
        ...wh,
        deliveries30d: stats?.total ?? 0,
        delivered30d: stats?.delivered ?? 0,
        failed30d: stats?.failed ?? 0,
        pending30d: stats?.pending ?? 0,
        lastDelivery: stats?.lastDelivery ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        webhooks: webhooksWithStats,
        recent_deliveries: recentDeliveries,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch webhooks";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ success: false, error: { code: "FETCH_ERROR", message } }, { status });
  }
}
