import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
const DRY_RUN = !process.argv.includes("--execute");
const STARTER_PLAN_ID = 5;
const PROVIDER_FREE_PLAN_ID = 8;
const TRIAL_DAYS = 14;

async function main() {
  console.log(`\n=== Fix Admin Data ===`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "EXECUTE (real changes)"}\n`);

  const now = new Date();
  const trialEndsAt = new Date(now);
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  // === 1. Fix Marbella Wedding (id=3) and SEB (id=30) — legacy Free plan → Starter trial ===
  const legacyFreeOrgs = [
    { id: 3, name: "Marbella Wedding" },
    { id: 30, name: "SEB" },
  ];

  for (const org of legacyFreeOrgs) {
    console.log(`[${org.id}] ${org.name}: Free(1) legacy → Starter(${STARTER_PLAN_ID}) trial`);
    if (!DRY_RUN) {
      await sql`UPDATE organizations SET plan_id = ${STARTER_PLAN_ID}, updated_at = NOW() WHERE id = ${org.id}`;
      await sql`
        UPDATE subscriptions SET 
          plan_id = ${STARTER_PLAN_ID},
          status = 'trialing',
          trial_ends_at = ${trialEndsAt.toISOString()}::timestamp,
          current_period_start = ${now.toISOString()}::timestamp,
          current_period_end = ${trialEndsAt.toISOString()}::timestamp,
          canceled_at = NULL,
          updated_at = NOW()
        WHERE organization_id = ${org.id}
      `;
    }
  }

  // === 2. SEB Creativos (id=29) — already deleted, just log ===
  console.log(`[29] SEB Creativos: status=deleted, plan=Free(1) legacy — skipping (already deleted)`);

  // === 3. Napsix test (id=34) — provider without plan → provider-free ===
  console.log(`[34] Napsix test: provider sin plan → provider-free(${PROVIDER_FREE_PLAN_ID})`);
  if (!DRY_RUN) {
    await sql`UPDATE organizations SET plan_id = ${PROVIDER_FREE_PLAN_ID}, updated_at = NOW() WHERE id = 34`;
    
    // Check if subscription exists
    const existingSub = await sql`SELECT id FROM subscriptions WHERE organization_id = 34`;
    if (existingSub.length === 0) {
      await sql`
        INSERT INTO subscriptions (organization_id, plan_id, status, current_period_start, current_period_end, created_at, updated_at)
        VALUES (34, ${PROVIDER_FREE_PLAN_ID}, 'active', ${now.toISOString()}::timestamp, ${trialEndsAt.toISOString()}::timestamp, NOW(), NOW())
      `;
      console.log(`  Created subscription for Napsix test`);
    } else {
      await sql`
        UPDATE subscriptions SET plan_id = ${PROVIDER_FREE_PLAN_ID}, status = 'active', updated_at = NOW()
        WHERE organization_id = 34
      `;
      console.log(`  Updated existing subscription for Napsix test`);
    }
  }

  // === 4. Verify ===
  console.log(`\n=== Post-fix verification ===`);
  const checkOrgs = await sql`
    SELECT o.id, o.name, o.org_type, o.plan_id, o.status,
           s.plan_id as sub_plan_id, s.status as sub_status,
           sp.name as plan_name
    FROM organizations o
    LEFT JOIN subscriptions s ON s.organization_id = o.id
    LEFT JOIN subscription_plans sp ON sp.id = COALESCE(s.plan_id, o.plan_id)
    WHERE o.id IN (3, 29, 30, 34)
    ORDER BY o.id
  `;

  for (const o of checkOrgs) {
    console.log(`  [${o.id}] ${o.name}: org_type=${o.org_type} plan=${o.plan_name}(${o.plan_id}) sub_status=${o.sub_status} org_status=${o.status}`);
  }

  console.log(`\nDone.${DRY_RUN ? " (dry run — no changes made, use --execute to apply)" : ""}`);
}

main().catch(console.error);
