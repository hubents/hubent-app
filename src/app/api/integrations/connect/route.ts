import { requireAuth } from "@/lib/session";
import { authorizeToolkit, MVP_TOOLKITS, type ComposioToolkit } from "@/lib/composio";
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
      return forbidden("No tenés permisos para conectar integraciones");
    }

    const { toolkit } = await req.json();

    if (!toolkit || !MVP_TOOLKITS.includes(toolkit as ComposioToolkit)) {
      return badRequest("Toolkit inválido");
    }

    const portalPrefix = "/dashboard";
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/callback?toolkit=${toolkit}&orgId=${orgId}&portal=${portalPrefix}`;

    const { redirectUrl } = await authorizeToolkit(
      orgId,
      toolkit as ComposioToolkit,
      callbackUrl
    );

    return ok({ redirectUrl });
  }, "POST /api/integrations/connect");
}
