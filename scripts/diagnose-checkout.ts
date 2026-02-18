import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function diagnose() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== Diagnóstico Checkout 500 ===\n");

  // 1. Check roles table structure
  const rolesCols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'roles' 
    ORDER BY ordinal_position
  `;
  console.log("1. Columnas tabla roles:");
  rolesCols.forEach(c => console.log(`   ${c.column_name} (${c.data_type})`));

  // 2. Check if roles have data
  const rolesCount = await sql`SELECT count(*) as cnt FROM roles`;
  console.log(`\n2. Roles count: ${rolesCount[0].cnt}`);

  // 3. Check org_members join roles works
  const testJoin = await sql`
    SELECT om.user_id, r.slug, r.event_scoped 
    FROM organization_members om 
    JOIN roles r ON om.role_id = r.id 
    LIMIT 3
  `;
  console.log("\n3. org_members JOIN roles (sample):");
  testJoin.forEach(r => console.log(`   user=${r.user_id}, role=${r.slug}, eventScoped=${r.event_scoped}`));

  // 4. Check subscription_plans table
  const plans = await sql`SELECT id, slug, is_active, stripe_price_id_monthly FROM subscription_plans WHERE is_active = true`;
  console.log("\n4. Active plans:");
  plans.forEach(p => console.log(`   id=${p.id} slug=${p.slug} stripe=${p.stripe_price_id_monthly ? "✅" : "❌"}`));

  // 5. Check subscriptions for org 1 (German's org)
  const subs = await sql`
    SELECT s.id, s.organization_id, s.plan_id, s.status, s.stripe_customer_id, s.stripe_subscription_id
    FROM subscriptions s 
    JOIN organizations o ON s.organization_id = o.id
    WHERE o.owner_id = (SELECT id FROM users WHERE email = 'gimenez.gp@gmail.com' LIMIT 1)
  `;
  console.log("\n5. Subscriptions for German:");
  subs.forEach(s => console.log(`   org=${s.organization_id} plan=${s.plan_id} status=${s.status} stripeCustomer=${s.stripe_customer_id} stripeSub=${s.stripe_subscription_id}`));

  // 6. Check organizations table for orgType column
  const orgCols = await sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name IN ('org_type', 'plan_id', 'stripe_customer_id')
  `;
  console.log("\n6. Key org columns:", orgCols.map(c => c.column_name).join(", "));

  // 7. Check if there are any broken foreign keys
  const orgWithPlan = await sql`
    SELECT o.id, o.name, o.org_type, o.plan_id, sp.slug as plan_slug
    FROM organizations o
    LEFT JOIN subscription_plans sp ON o.plan_id = sp.id
    WHERE o.owner_id = (SELECT id FROM users WHERE email = 'gimenez.gp@gmail.com' LIMIT 1)
  `;
  console.log("\n7. German's orgs:");
  orgWithPlan.forEach(o => console.log(`   id=${o.id} name=${o.name} type=${o.org_type} planId=${o.plan_id} planSlug=${o.plan_slug}`));
}

diagnose().catch(e => console.error("DIAGNOSE ERROR:", e));
