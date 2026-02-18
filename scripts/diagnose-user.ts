import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function diagnose() {
  const sql = neon(process.env.DATABASE_URL!);

  // Find German's user
  const users = await sql`SELECT id, email, name FROM users WHERE email ILIKE '%german%' OR email ILIKE '%gimenez%' OR email ILIKE '%gimen%' OR name ILIKE '%german%' LIMIT 10`;
  console.log("Users matching German:");
  users.forEach(u => console.log(`  id=${u.id} email=${u.email} name=${u.name}`));

  // Find all org memberships for those users
  for (const u of users) {
    const memberships = await sql`
      SELECT om.organization_id, o.name as org_name, o.org_type, o.plan_id, r.slug as role_slug
      FROM organization_members om
      JOIN organizations o ON om.organization_id = o.id
      JOIN roles r ON om.role_id = r.id
      WHERE om.user_id = ${u.id}
    `;
    console.log(`\nMemberships for ${u.email}:`);
    memberships.forEach(m => console.log(`  org=${m.organization_id} name=${m.org_name} type=${m.org_type} planId=${m.plan_id} role=${m.role_slug}`));

    // Check subscriptions for these orgs
    for (const m of memberships) {
      const subs = await sql`
        SELECT id, plan_id, status, stripe_customer_id, stripe_subscription_id, trial_ends_at
        FROM subscriptions 
        WHERE organization_id = ${m.organization_id}
      `;
      if (subs.length > 0) {
        console.log(`  Subscriptions for org ${m.organization_id}:`);
        subs.forEach(s => console.log(`    planId=${s.plan_id} status=${s.status} stripeCustomer=${s.stripe_customer_id} stripeSub=${s.stripe_subscription_id} trial=${s.trial_ends_at}`));
      } else {
        console.log(`  NO subscription for org ${m.organization_id}`);
      }
    }
  }

  // Also check platform_admins
  const admins = await sql`SELECT user_id, level FROM platform_admins`;
  console.log("\nPlatform admins:");
  admins.forEach(a => console.log(`  userId=${a.user_id} level=${a.level}`));
}

diagnose().catch(e => console.error("ERROR:", e));
