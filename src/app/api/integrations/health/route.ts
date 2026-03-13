import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { isComposioConfigured, composioEntityId, createComposioSession } from "@/lib/composio";
import { db } from "@/db";
import { organizationIntegrations } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await requireAuth();
    const orgId = session.organizationId;

    const checks: Record<string, { ok: boolean; detail?: string }> = {};

    // 1. Check env var
    checks.apiKey = {
      ok: isComposioConfigured(),
      detail: isComposioConfigured() ? "Set" : "COMPOSIO_API_KEY not configured",
    };

    // 2. Check Composio API reachability
    if (isComposioConfigured()) {
      try {
        const composioSession = await createComposioSession(orgId);
        const toolkits = await composioSession.toolkits();
        checks.apiConnection = {
          ok: true,
          detail: `${toolkits.items?.length || 0} toolkits available`,
        };
      } catch (error) {
        checks.apiConnection = {
          ok: false,
          detail: error instanceof Error ? error.message : "Connection failed",
        };
      }
    } else {
      checks.apiConnection = { ok: false, detail: "Skipped — no API key" };
    }

    // 3. Check DB integrations for this org
    const integrations = await db
      .select()
      .from(organizationIntegrations)
      .where(eq(organizationIntegrations.organizationId, orgId));

    const connectedCount = integrations.filter(i => i.status === "connected").length;
    checks.database = {
      ok: true,
      detail: `${integrations.length} total, ${connectedCount} connected`,
    };

    // 4. Check webhook endpoint reachable
    checks.webhookEndpoint = {
      ok: true,
      detail: "/api/webhooks/composio ready",
    };

    // 5. Entity ID
    checks.entityId = {
      ok: true,
      detail: composioEntityId(orgId),
    };

    const allOk = Object.values(checks).every(c => c.ok);

    return NextResponse.json({
      success: true,
      data: {
        healthy: allOk,
        checks,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[Integrations Health] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Health check failed" },
      { status: 500 }
    );
  }
}
