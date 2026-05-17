import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { organizationIntegrations, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MVP_TOOLKITS, TOOLKIT_META, COMING_SOON_APPS } from "@/lib/composio";
import { apiHandler, ok } from "@/lib/api-handler";

export async function GET() {
  return apiHandler(async () => {
    const session = await requireAuth();
    const orgId = session.organizationId;

    const integrations = await db
      .select({
        id: organizationIntegrations.id,
        toolkit: organizationIntegrations.toolkit,
        status: organizationIntegrations.status,
        connectedEmail: organizationIntegrations.connectedEmail,
        connectedBy: organizationIntegrations.connectedBy,
        connectedAt: organizationIntegrations.connectedAt,
        composioConnectedAccountId: organizationIntegrations.composioConnectedAccountId,
      })
      .from(organizationIntegrations)
      .where(eq(organizationIntegrations.organizationId, orgId));

    const connectedByIds = integrations
      .map((i) => i.connectedBy)
      .filter(Boolean) as string[];

    let userMap: Record<string, string> = {};
    if (connectedByIds.length > 0) {
      for (const uid of connectedByIds) {
        const [u] = await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(eq(users.id, uid))
          .limit(1);
        if (u) userMap[u.id] = u.name || u.id;
      }
    }

    const toolkits = MVP_TOOLKITS.map((slug) => {
      const meta = TOOLKIT_META[slug];
      const integration = integrations.find((i) => i.toolkit === slug);

      return {
        slug,
        name: meta.name,
        description: meta.description,
        icon: meta.icon,
        requiresBusiness: meta.requiresBusiness || false,
        helpUrl: meta.helpUrl || null,
        helpTooltip: meta.helpTooltip || null,
        isConnected: integration?.status === "connected",
        status: integration?.status || "disconnected",
        connectedEmail: integration?.connectedEmail || null,
        connectedByName: integration?.connectedBy
          ? userMap[integration.connectedBy] || null
          : null,
        connectedAt: integration?.connectedAt || null,
      };
    });

    return ok({ toolkits, comingSoon: COMING_SOON_APPS });
  }, "GET /api/integrations/status");
}
