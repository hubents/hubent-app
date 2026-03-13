import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { organizationIntegrations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { MVP_TOOLKITS, type ComposioToolkit } from "@/lib/composio";

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    const orgId = session.organizationId;

    const canManage =
      session.role === "owner" ||
      session.role === "admin" ||
      session.role === "provider_owner" ||
      session.role === "provider_admin" ||
      session.permissions?.includes("integrations:manage");

    if (!canManage) {
      return NextResponse.json(
        { success: false, error: "No tenés permisos para desconectar integraciones" },
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Integrations] Disconnect error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error al desconectar" },
      { status: 500 }
    );
  }
}
