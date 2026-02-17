import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
import { neon } from "@neondatabase/serverless";

async function diagnose() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== SUBSCRIPTIONS ===");
  const subs = await sql`
    SELECT s.id, s.organization_id, s.plan_id, s.status, 
           s.stripe_subscription_id, s.stripe_customer_id,
           s.trial_ends_at, s.current_period_start, s.current_period_end,
           s.presentment_currency, s.updated_at,
           p.name as plan_name, p.slug as plan_slug,
           o.name as org_name
    FROM subscriptions s
    LEFT JOIN subscription_plans p ON p.id = s.plan_id
    LEFT JOIN organizations o ON o.id = s.organization_id
    ORDER BY s.updated_at DESC
    LIMIT 10
  ` as Record<string, unknown>[];

  for (const sub of subs) {
    console.log(`\n  Org: ${sub.org_name} (id=${sub.organization_id})`);
    console.log(`  Plan: ${sub.plan_name} (slug=${sub.plan_slug}, id=${sub.plan_id})`);
    console.log(`  Status: ${sub.status}`);
    console.log(`  Stripe Sub: ${sub.stripe_subscription_id || "N/A"}`);
    console.log(`  Stripe Cust: ${sub.stripe_customer_id || "N/A"}`);
    console.log(`  Trial Ends: ${sub.trial_ends_at || "N/A"}`);
    console.log(`  Period: ${sub.current_period_start || "N/A"} → ${sub.current_period_end || "N/A"}`);
    console.log(`  Updated: ${sub.updated_at}`);
  }

  if (subs.length === 0) {
    console.log("  (no subscriptions found)");
  }

  console.log("\n=== ORGANIZATIONS WITH PLAN ===");
  const orgs = await sql`
    SELECT o.id, o.name, o.plan_id, o.org_type, p.name as plan_name, p.slug as plan_slug
    FROM organizations o
    LEFT JOIN subscription_plans p ON p.id = o.plan_id
    ORDER BY o.id
    LIMIT 10
  ` as Record<string, unknown>[];

  for (const org of orgs) {
    console.log(`  [${org.id}] ${org.name} — plan: ${org.plan_name || "none"} (${org.plan_slug || "N/A"}, planId=${org.plan_id || "null"})`);
  }

  console.log("\n=== PLANS ===");
  const plans = await sql`
    SELECT id, name, slug, stripe_product_id, stripe_price_id_monthly, stripe_price_id_yearly, is_active
    FROM subscription_plans
    ORDER BY sort_order
  ` as Record<string, unknown>[];

  for (const plan of plans) {
    const synced = plan.stripe_product_id ? "✅" : "⏭️";
    console.log(`  ${synced} [${plan.id}] ${(plan.name as string).padEnd(12)} | product=${plan.stripe_product_id || "N/A"} | monthly=${plan.stripe_price_id_monthly || "N/A"}`);
  }
}

diagnose().catch(console.error);
