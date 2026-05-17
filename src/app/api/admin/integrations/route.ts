import { requirePlatformAdmin } from "@/lib/session";
import { db } from "@/db";
import { organizationIntegrations, organizations, users } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { apiHandler, ok } from "@/lib/api-handler";

export async function GET() {
  return apiHandler(async () => {
    await requirePlatformAdmin();

    const allIntegrations = await db
      .select({
        id: organizationIntegrations.id,
        organizationId: organizationIntegrations.organizationId,
        orgName: organizations.name,
        orgSlug: organizations.slug,
        orgType: organizations.orgType,
        toolkit: organizationIntegrations.toolkit,
        status: organizationIntegrations.status,
        connectedEmail: organizationIntegrations.connectedEmail,
        connectedBy: organizationIntegrations.connectedBy,
        connectedAt: organizationIntegrations.connectedAt,
      })
      .from(organizationIntegrations)
      .innerJoin(
        organizations,
        eq(organizations.id, organizationIntegrations.organizationId)
      )
      .orderBy(desc(organizationIntegrations.connectedAt));

    const connectedByIds = allIntegrations
      .map((i) => i.connectedBy)
      .filter(Boolean) as string[];

    let userMap: Record<string, string> = {};
    for (const uid of [...new Set(connectedByIds)]) {
      const [u] = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.id, uid))
        .limit(1);
      if (u) userMap[u.id] = u.name || u.id;
    }

    const enriched = allIntegrations.map((i) => ({
      ...i,
      connectedByName: i.connectedBy ? userMap[i.connectedBy] || null : null,
    }));

    const totalConnected = enriched.filter((i) => i.status === "connected").length;
    const byToolkit = enriched.reduce(
      (acc, i) => {
        if (i.status === "connected") {
          acc[i.toolkit] = (acc[i.toolkit] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    const totalOrgs = await db
      .select({ count: sql<number>`count(*)` })
      .from(organizations);

    const stats = {
      totalConnections: totalConnected,
      totalOrganizations: Number(totalOrgs[0]?.count || 0),
      byToolkit,
      adoptionRate:
        Number(totalOrgs[0]?.count || 0) > 0
          ? Math.round(
              (new Set(enriched.filter((i) => i.status === "connected").map((i) => i.organizationId)).size /
                Number(totalOrgs[0]?.count || 1)) *
                100
            )
          : 0,
    };

    return ok({ integrations: enriched, stats });
  }, "GET /api/admin/integrations");
}
