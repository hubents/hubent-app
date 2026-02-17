import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
import Stripe from "stripe";

const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "checkout.session.completed",
  "invoice.paid",
  "invoice.payment_failed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

async function setupWebhook() {
  const key = process.env.STRIPE_PLATFORM_SECRET_KEY;
  if (!key) {
    console.error("❌ STRIPE_PLATFORM_SECRET_KEY not set");
    process.exit(1);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.hubents.com";
  const webhookUrl = `${appUrl}/api/webhooks/stripe-platform`;

  const stripe = new Stripe(key);

  console.log("🔍 Checking existing webhook endpoints...\n");

  const existing = await stripe.webhookEndpoints.list({ limit: 100 });
  const match = existing.data.find((ep) => ep.url === webhookUrl);

  if (match) {
    console.log(`✅ Webhook already exists: ${match.id}`);
    console.log(`   URL: ${match.url}`);
    console.log(`   Status: ${match.status}`);
    console.log(`   Events: ${match.enabled_events.join(", ")}`);

    // Update events if needed
    const missingEvents = WEBHOOK_EVENTS.filter(
      (e) => !match.enabled_events.includes(e)
    );
    if (missingEvents.length > 0) {
      console.log(`\n⚠️  Missing events: ${missingEvents.join(", ")}`);
      console.log("   Updating...");
      await stripe.webhookEndpoints.update(match.id, {
        enabled_events: WEBHOOK_EVENTS,
      });
      console.log("   ✅ Events updated");
    }

    console.log(`\n🔑 Webhook Secret: ${match.secret || "(already set — check Stripe Dashboard)"}`);
    return;
  }

  console.log(`📡 Creating webhook endpoint: ${webhookUrl}`);
  console.log(`   Events: ${WEBHOOK_EVENTS.join(", ")}\n`);

  const endpoint = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: WEBHOOK_EVENTS,
    description: "HubEnts Platform Subscriptions",
  });

  console.log(`✅ Webhook created!`);
  console.log(`   ID: ${endpoint.id}`);
  console.log(`   URL: ${endpoint.url}`);
  console.log(`   Status: ${endpoint.status}`);
  console.log(`\n🔑 WEBHOOK SECRET (save this in Vercel as STRIPE_PLATFORM_WEBHOOK_SECRET):`);
  console.log(`   ${endpoint.secret}`);
  console.log(`\n⚠️  IMPORTANT: Update STRIPE_PLATFORM_WEBHOOK_SECRET in Vercel with the value above!`);
}

setupWebhook().catch(console.error);
