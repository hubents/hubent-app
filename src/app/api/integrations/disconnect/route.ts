import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { organizationIntegrations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { MVP_TOOLKITS, type ComposioToolkit } from "@/lib/composio";
import { apiHandler, ok, badRequest, forbidden } from "@/lib/api-handler";

export async function POST(req: Request) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const orgId = session.organizationId;

    const canManage =
      session.role === "owner" ||
      session.role === "admin" ||
      session.permissions?.includes("integrations:manage");

    if (!canManage) {
      return forbidden("No tenés permisos para desconectar integraciones");
    }

    const { toolkit } = await req.json();

    if (!toolkit || !MVP_TOOLKITS.includes(toolkit as ComposioToolkit)) {
      return badRequest("Toolkit inválido");
    }

    await db
      .update(organizationIntegrations)
      .set({
        status: "disconnected",
        composioConnectedAccountId: null,
        connectedEmail: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(organizationIntegrations.organizationId, orgId),
          eq(organizationIntegrations.toolkit, toolkit)
        )
      );

    return ok(null);
  }, "POST /api/integrations/disconnect");
}
