/**
 * Backfill Composio Triggers
 *
 * Creates GMAIL_NEW_GMAIL_MESSAGE / WHATSAPP_NEW_MESSAGE triggers
 * for all organizations that have connected integrations
 * but no active trigger in composio_triggers table.
 *
 * Usage:
 *   $env:DATABASE_URL = (Get-Content .env | Select-String "^DATABASE_URL=").ToString().Split("=",2)[1]
 *   $env:COMPOSIO_API_KEY = (Get-Content .env | Select-String "^COMPOSIO_API_KEY=").ToString().Split("=",2)[1]
 *   npx tsx scripts/backfill-composio-triggers.ts
 */

import { neon } from "@neondatabase/serverless";

const TRIGGER_SLUGS: Record<string, string> = {
  gmail: "GMAIL_NEW_GMAIL_MESSAGE",
  whatsapp: "WHATSAPP_NEW_MESSAGE",
};

const MVP_TOOLKITS = ["gmail", "whatsapp"];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const composioApiKey = process.env.COMPOSIO_API_KEY;
  if (!composioApiKey) {
    console.error("COMPOSIO_API_KEY not set");
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  // Find connected integrations that have no active trigger
  const connectedIntegrations = await sql`
    SELECT oi.organization_id, oi.toolkit, oi.composio_connected_account_id
    FROM organization_integrations oi
    WHERE oi.status = 'connected'
      AND oi.toolkit = ANY(${MVP_TOOLKITS})
      AND NOT EXISTS (
        SELECT 1 FROM composio_triggers ct
        WHERE ct.organization_id = oi.organization_id
          AND ct.toolkit = oi.toolkit
          AND ct.status = 'active'
      )
  `;

  console.log(`Found ${connectedIntegrations.length} integration(s) needing triggers\n`);

  if (connectedIntegrations.length === 0) {
    console.log("Nothing to do — all connected integrations already have active triggers.");
    return;
  }

  for (const integration of connectedIntegrations) {
    const orgId = integration.organization_id;
    const toolkit = integration.toolkit;
    const connAccountId = integration.composio_connected_account_id;
    const userId = `hubents_org_${orgId}`;
    const triggerSlug = TRIGGER_SLUGS[toolkit];

    console.log(`Creating trigger for org ${orgId} / ${toolkit} (entity: ${userId})...`);

    try {
      // Call Composio API to create trigger
      const response = await fetch("https://backend.composio.dev/api/v3/triggers", {
        method: "POST",
        headers: {
          "X-API-KEY": composioApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          triggerSlug,
          userId,
          triggerConfig: {},
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error(`  ❌ ERROR (${response.status}):`, JSON.stringify(result));
        continue;
      }

      const triggerId = result.triggerId || result.trigger_id || result.id;
      if (!triggerId) {
        console.error(`  ❌ No triggerId in response:`, JSON.stringify(result));
        continue;
      }

      // Save to DB
      await sql`
        INSERT INTO composio_triggers (organization_id, toolkit, trigger_slug, composio_trigger_id, connected_account_id, status)
        VALUES (${orgId}, ${toolkit}, ${triggerSlug}, ${triggerId}, ${connAccountId}, 'active')
        ON CONFLICT (composio_trigger_id) DO NOTHING
      `;

      console.log(`  ✅ Trigger created: ${triggerId}`);
    } catch (error) {
      console.error(`  ❌ Error for org ${orgId}/${toolkit}:`, error);
    }
  }

  // Check webhook subscriptions
  console.log("\n--- Webhook Subscriptions ---");
  try {
    const subResponse = await fetch("https://backend.composio.dev/api/v3/webhook_subscriptions", {
      headers: { "X-API-KEY": composioApiKey },
    });
    if (subResponse.ok) {
      const subs = await subResponse.json();
      console.log(JSON.stringify(subs, null, 2));
    } else {
      console.log("Status:", subResponse.status, await subResponse.text());
    }
  } catch (err) {
    console.warn("Could not fetch webhook subscriptions:", err);
  }

  console.log("\n✅ Backfill complete");
}

main().catch(console.error);
