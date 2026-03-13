import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/session";
import { db } from "@/db";
import { organizationIntegrations, composioTriggers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createComposioTrigger, TRIGGER_SLUGS, MVP_TOOLKITS, type ComposioToolkit } from "@/lib/composio";

/**
 * POST /api/admin/composio/sync-triggers
 * 
 * Creates inbound triggers for all connected integrations
 * that don't already have an active trigger.
 * Runs in production with Vercel env vars.
 */
export async function GET() {
  return syncTriggers();
}

export async function POST() {
  return syncTriggers();
}

async function syncTriggers() {
  try {
    await requirePlatformAdmin();

    const results: Array<{ orgId: number; toolkit: string; status: string; triggerId?: string; error?: string }> = [];

    // Find all connected MVP integrations
    const connected = await db
      .select({
        id: organizationIntegrations.id,
        organizationId: organizationIntegrations.organizationId,
        toolkit: organizationIntegrations.toolkit,
        composioConnectedAccountId: organizationIntegrations.composioConnectedAccountId,
      })
      .from(organizationIntegrations)
      .where(eq(organizationIntegrations.status, "connected"));

    const mvpConnected = connected.filter(
      (i) => MVP_TOOLKITS.includes(i.toolkit as ComposioToolkit)
    );

    for (const integration of mvpConnected) {
      const { organizationId: orgId, toolkit, composioConnectedAccountId } = integration;

      // Check if trigger already exists
      const existingTrigger = await db
        .select()
        .from(composioTriggers)
        .where(
          and(
            eq(composioTriggers.organizationId, orgId),
            eq(composioTriggers.toolkit, toolkit),
            eq(composioTriggers.status, "active")
          )
        )
        .limit(1);

      if (existingTrigger.length > 0) {
        results.push({
          orgId,
          toolkit,
          status: "already_exists",
          triggerId: existingTrigger[0].composioTriggerId,
        });
        continue;
      }

      // Create trigger via Composio SDK
      const triggerResult = await createComposioTrigger(orgId, toolkit as ComposioToolkit);

      if (triggerResult) {
        await db.insert(composioTriggers).values({
          organizationId: orgId,
          toolkit,
          triggerSlug: TRIGGER_SLUGS[toolkit as ComposioToolkit],
          composioTriggerId: triggerResult.triggerId,
          connectedAccountId: composioConnectedAccountId,
          status: "active",
        });

        results.push({
          orgId,
          toolkit,
          status: "created",
          triggerId: triggerResult.triggerId,
        });
      } else {
        results.push({
          orgId,
          toolkit,
          status: "error",
          error: "createComposioTrigger returned null",
        });
      }
    }

    const created = results.filter((r) => r.status === "created").length;
    const existing = results.filter((r) => r.status === "already_exists").length;
    const errors = results.filter((r) => r.status === "error").length;

    return NextResponse.json({
      success: true,
      data: {
        total: mvpConnected.length,
        created,
        alreadyExist: existing,
        errors,
        details: results,
      },
    });
  } catch (error) {
    console.error("[Admin] Sync triggers error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
