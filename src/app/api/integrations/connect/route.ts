import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { authorizeToolkit, MVP_TOOLKITS, type ComposioToolkit } from "@/lib/composio";

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    const orgId = session.organizationId;

    const canManage =
      session.role === "owner" ||
      session.role === "admin" ||
      session.permissions?.includes("integrations:manage");

    if (!canManage) {
      return NextResponse.json(
        { success: false, error: "No tenés permisos para conectar integraciones" },
        { status: 403 }
      );
    }

    const { toolkit } = await req.json();

    if (!toolkit || !MVP_TOOLKITS.includes(toolkit as ComposioToolkit)) {
      return NextResponse.json(
        { success: false, error: "Toolkit inválido" },
        { status: 400 }
      );
    }

    const portalPrefix = "/dashboard";
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/callback?toolkit=${toolkit}&orgId=${orgId}&portal=${portalPrefix}`;

    const { redirectUrl } = await authorizeToolkit(
      orgId,
      toolkit as ComposioToolkit,
      callbackUrl
    );

    return NextResponse.json({ success: true, data: { redirectUrl } });
  } catch (error) {
    console.error("[Integrations] Connect error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error al conectar" },
      { status: 500 }
    );
  }
}
