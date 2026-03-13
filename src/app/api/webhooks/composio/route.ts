import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizationIntegrations } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Composio Webhook Endpoint
 * 
 * Receives events from Composio when:
 * - Connection status changes (connected, disconnected, expired)
 * - Triggers fire (email received, message received) — Phase 2
 * 
 * Configure in Composio Dashboard → Settings → Webhook:
 * URL: https://app.hubents.com/api/webhooks/composio
 * 
 * Webhook secret should be set as COMPOSIO_WEBHOOK_SECRET env var.
 */

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.COMPOSIO_WEBHOOK_SECRET;
    
    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers.get("x-composio-signature") || req.headers.get("x-webhook-signature");
      if (!signature) {
        console.warn("[Composio Webhook] Missing signature header");
        return NextResponse.json({ error: "Missing signature" }, { status: 401 });
      }
      // TODO: Implement HMAC verification when Composio documents their signing format
    }

    const payload = await req.json();
    const eventType = payload.event || payload.type;

    console.log("[Composio Webhook] Received event:", eventType, JSON.stringify(payload).slice(0, 500));

    switch (eventType) {
      case "connection.active":
      case "connection.created": {
        const connectedAccountId = payload.data?.connected_account_id || payload.connected_account_id;
        if (connectedAccountId) {
          await db
            .update(organizationIntegrations)
            .set({ status: "connected", updatedAt: new Date() })
            .where(eq(organizationIntegrations.composioConnectedAccountId, connectedAccountId));
          console.log("[Composio Webhook] Connection activated:", connectedAccountId);
        }
        break;
      }

      case "connection.revoked":
      case "connection.expired":
      case "connection.deleted": {
        const connectedAccountId = payload.data?.connected_account_id || payload.connected_account_id;
        if (connectedAccountId) {
          await db
            .update(organizationIntegrations)
            .set({ 
              status: "disconnected",
              composioConnectedAccountId: null,
              updatedAt: new Date(),
            })
            .where(eq(organizationIntegrations.composioConnectedAccountId, connectedAccountId));
          console.log("[Composio Webhook] Connection revoked/expired:", connectedAccountId);
        }
        break;
      }

      // Phase 2: Incoming email/message triggers
      case "trigger.email_received":
      case "trigger.whatsapp_received": {
        console.log("[Composio Webhook] Trigger received (Phase 2 - not yet implemented):", eventType);
        break;
      }

      default:
        console.log("[Composio Webhook] Unhandled event type:", eventType);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Composio Webhook] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal error processing webhook" },
      { status: 500 }
    );
  }
}

// GET for webhook verification/health check
export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    endpoint: "composio-webhook",
    version: "1.0",
  });
}
