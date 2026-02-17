import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
import Stripe from "stripe";
import { neon } from "@neondatabase/serverless";

async function fixTestSubscription() {
  const key = process.env.STRIPE_PLATFORM_SECRET_KEY;
  if (!key) {
    console.error("❌ STRIPE_PLATFORM_SECRET_KEY not set");
    process.exit(1);
  }

  const stripe = new Stripe(key);
  const sql = neon(process.env.DATABASE_URL!);

  console.log("🔍 Looking for recent checkout sessions in Stripe...\n");

  const sessions = await stripe.checkout.sessions.list({
    limit: 10,
    expand: ["data.subscription"],
  });

  for (const session of sessions.data) {
    if (session.mode !== "subscription" || !session.metadata?.organizationId) continue;

    const orgId = parseInt(session.metadata.organizationId);
    const planId = parseInt(session.metadata.planId || "0");
    const subId = typeof session.subscription === "string"
      ? session.subscription
      : (session.subscription as Stripe.Subscription)?.id;
    const custId = typeof session.customer === "string"
      ? session.customer
      : (session.customer as Stripe.Customer)?.id;

    if (!subId || !custId) continue;

    // Get subscription details from Stripe
    const stripeSub = await stripe.subscriptions.retrieve(subId);

    console.log(`📋 Session: ${session.id}`);
    console.log(`   Org: ${orgId}, Plan: ${planId}`);
    console.log(`   Stripe Sub: ${subId}`);
    console.log(`   Status: ${stripeSub.status}`);
    console.log(`   Trial End: ${stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : "N/A"}`);

    // Check if DB already has this subscription
    const existing = await sql`
      SELECT id, stripe_subscription_id, plan_id, status 
      FROM subscriptions 
      WHERE organization_id = ${orgId}
      LIMIT 1
    ` as Record<string, unknown>[];

    if (existing.length > 0 && existing[0].stripe_subscription_id === subId) {
      console.log(`   ✅ Already synced in DB\n`);
      continue;
    }

    const status = stripeSub.status === "trialing" ? "trialing" : "active";
    const trialEndStr = stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : null;
    // Access current_period_end from raw JSON (Stripe SDK wraps it)
    const rawSub = JSON.parse(JSON.stringify(stripeSub));
    const periodEndStr = rawSub.current_period_end
      ? new Date(rawSub.current_period_end * 1000).toISOString()
      : null;

    if (existing.length > 0) {
      console.log(`   🔄 Updating existing subscription (id=${existing[0].id})...`);
      await sql`
        UPDATE subscriptions SET
          plan_id = ${planId},
          status = ${status},
          stripe_subscription_id = ${subId},
          stripe_customer_id = ${custId},
          trial_ends_at = ${trialEndStr}::timestamp,
          current_period_end = ${periodEndStr}::timestamp,
          updated_at = NOW()
        WHERE organization_id = ${orgId}
      `;
    } else {
      console.log(`   ➕ Creating new subscription...`);
      await sql`
        INSERT INTO subscriptions (organization_id, plan_id, status, stripe_subscription_id, stripe_customer_id, trial_ends_at, current_period_start, current_period_end)
        VALUES (${orgId}, ${planId}, ${status}, ${subId}, ${custId}, ${trialEndStr}::timestamp, NOW(), ${periodEndStr}::timestamp)
      `;
    }

    // Update org planId
    await sql`UPDATE organizations SET plan_id = ${planId}, updated_at = NOW() WHERE id = ${orgId}`;
    console.log(`   ✅ DB updated! Plan=${planId}, Status=${status}\n`);
  }

  console.log("✨ Done!");
}

fixTestSubscription().catch(console.error);
