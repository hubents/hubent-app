import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { organizationIntegrations, composioTriggers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getConnectedAccountDetails, createComposioTrigger, type ComposioToolkit, MVP_TOOLKITS } from "@/lib/composio";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL("/auth/login", process.env.NEXT_PUBLIC_APP_URL!)
      );
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const connectedAccountId = url.searchParams.get("connected_account_id");
    const toolkit = url.searchParams.get("toolkit");
    const orgIdStr = url.searchParams.get("orgId");
    const portal = url.searchParams.get("portal") || "/dashboard";

    if (!toolkit || !orgIdStr) {
      return NextResponse.redirect(
        new URL(
          `${portal}/settings/integrations?error=missing_params`,
          process.env.NEXT_PUBLIC_APP_URL!
        )
      );
    }

    const orgId = parseInt(orgIdStr, 10);

    if (status === "success" && connectedAccountId) {
      // Fetch connected account details from Composio to get the email
      let connectedEmail: string | null = null;
      try {
        const accountDetails = await getConnectedAccountDetails(connectedAccountId);
        if (accountDetails?.metadata) {
          // Gmail: look for email in OAuth metadata
          const meta = accountDetails.metadata as Record<string, unknown>;
          connectedEmail = (meta.email as string) || (meta.login as string) || null;
        }
      } catch (detailsError) {
        console.warn("[Integrations] Could not fetch account details:", detailsError);
      }

      const existing = await db
        .select()
        .from(organizationIntegrations)
        .where(
          and(
            eq(organizationIntegrations.organizationId, orgId),
            eq(organizationIntegrations.toolkit, toolkit)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(organizationIntegrations)
          .set({
            composioConnectedAccountId: connectedAccountId,
            status: "connected",
            connectedBy: session.user.id,
            connectedEmail: connectedEmail || existing[0].connectedEmail,
            connectedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(organizationIntegrations.id, existing[0].id));
      } else {
        await db.insert(organizationIntegrations).values({
          organizationId: orgId,
          toolkit,
          composioConnectedAccountId: connectedAccountId,
          status: "connected",
          connectedBy: session.user.id,
          connectedEmail,
          connectedAt: new Date(),
        });
      }

      // Auto-create inbound trigger for this toolkit
      if (MVP_TOOLKITS.includes(toolkit as ComposioToolkit)) {
        try {
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

          if (existingTrigger.length === 0) {
            const triggerResult = await createComposioTrigger(orgId, toolkit as ComposioToolkit);
            if (triggerResult) {
              await db.insert(composioTriggers).values({
                organizationId: orgId,
                toolkit,
                triggerSlug: toolkit === "gmail" ? "GMAIL_NEW_GMAIL_MESSAGE" : "WHATSAPP_NEW_MESSAGE",
                composioTriggerId: triggerResult.triggerId,
                connectedAccountId,
                status: "active",
              });
              console.log(`[Integrations] Auto-created trigger for org ${orgId}/${toolkit}: ${triggerResult.triggerId}`);
            }
          } else {
            console.log(`[Integrations] Trigger already exists for org ${orgId}/${toolkit}`);
          }
        } catch (triggerError) {
          console.warn("[Integrations] Could not auto-create trigger:", triggerError);
        }
      }

      return popupResponse({ status: "connected", toolkit });
    }

    return popupResponse({ status: "error", error: "connection_failed", toolkit });
  } catch (error) {
    console.error("[Integrations] Callback error:", error);
    return popupResponse({ status: "error", error: "unexpected" });
  }
}

function popupResponse(data: Record<string, string | undefined>) {
  const payload = JSON.stringify(data);
  const html = `<!DOCTYPE html><html><head><title>Conectando...</title></head><body>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: 'composio-callback', payload: ${payload} }, '*');
    window.close();
  } else {
    window.location.href = '/dashboard/settings/integrations';
  }
</script>
<p>Conectado. Podés cerrar esta ventana.</p>
</body></html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}
