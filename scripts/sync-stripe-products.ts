import dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
import Stripe from "stripe";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

function getStripe() {
  const key = process.env.STRIPE_PLATFORM_SECRET_KEY;
  if (!key) {
    console.error("❌ STRIPE_PLATFORM_SECRET_KEY not set in .env");
    process.exit(1);
  }
  return new Stripe(key);
}

async function syncProducts() {
  const stripe = getStripe();
  console.log("🔄 Syncing plans to Stripe...\n");

  const plans = await db
    .select()
    .from(schema.subscriptionPlans)
    .where(eq(schema.subscriptionPlans.isActive, true))
    .orderBy(schema.subscriptionPlans.sortOrder);

  for (const plan of plans) {
    console.log(`📦 Processing: ${plan.name} (${plan.orgType})`);

    // Skip free plans (no Stripe product needed)
    if (Number(plan.priceMonthly) === 0 && Number(plan.priceYearly) === 0) {
      console.log(`  ⏭️  Skipping free plan\n`);
      continue;
    }

    let productId = plan.stripeProductId;

    // Verify existing product is accessible (handles live↔test mode switches)
    if (productId) {
      try {
        await stripe.products.retrieve(productId);
      } catch {
        console.log(`  ⚠️  Product ${productId} not found in current Stripe mode — will create new`);
        productId = null;
      }
    }

    // Create or update Stripe Product
    if (!productId) {
      const product = await stripe.products.create({
        name: `HubEnts ${plan.name}`,
        description: plan.description || undefined,
        metadata: {
          planId: plan.id.toString(),
          orgType: plan.orgType || "tenant",
          slug: plan.slug,
        },
      });
      productId = product.id;
      console.log(`  ✅ Created Product: ${productId}`);
    } else {
      await stripe.products.update(productId, {
        name: `HubEnts ${plan.name}`,
        description: plan.description || undefined,
        metadata: {
          planId: plan.id.toString(),
          orgType: plan.orgType || "tenant",
          slug: plan.slug,
        },
      });
      console.log(`  ✅ Updated Product: ${productId}`);
    }

    // Verify existing prices are accessible
    let monthlyPriceId = plan.stripePriceIdMonthly;
    if (monthlyPriceId) {
      try {
        await stripe.prices.retrieve(monthlyPriceId);
      } catch {
        monthlyPriceId = null;
      }
    }
    let yearlyPriceId = plan.stripePriceIdYearly;
    if (yearlyPriceId) {
      try {
        await stripe.prices.retrieve(yearlyPriceId);
      } catch {
        yearlyPriceId = null;
      }
    }

    // Create monthly price if needed
    const monthlyAmount = Math.round(Number(plan.priceMonthly) * 100);
    if (!monthlyPriceId && monthlyAmount > 0) {
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: monthlyAmount,
        currency: (plan.currency || "EUR").toLowerCase(),
        recurring: { interval: "month" },
        metadata: { planId: plan.id.toString(), interval: "month" },
      });
      monthlyPriceId = price.id;
      console.log(`  ✅ Created Monthly Price: €${plan.priceMonthly}/mo → ${monthlyPriceId}`);
    }

    // Create yearly price if needed
    const yearlyAmount = Math.round(Number(plan.priceYearly) * 100);
    if (!yearlyPriceId && yearlyAmount > 0) {
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: yearlyAmount,
        currency: (plan.currency || "EUR").toLowerCase(),
        recurring: { interval: "year" },
        metadata: { planId: plan.id.toString(), interval: "year" },
      });
      yearlyPriceId = price.id;
      console.log(`  ✅ Created Yearly Price: €${plan.priceYearly}/yr → ${yearlyPriceId}`);
    }

    // Update DB with Stripe IDs
    await db
      .update(schema.subscriptionPlans)
      .set({
        stripeProductId: productId,
        stripePriceIdMonthly: monthlyPriceId,
        stripePriceIdYearly: yearlyPriceId,
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptionPlans.id, plan.id));

    console.log(`  ✅ DB updated\n`);
  }

  console.log("✨ Sync complete!\n");

  // Show summary
  const allPlans = await db
    .select()
    .from(schema.subscriptionPlans)
    .where(eq(schema.subscriptionPlans.isActive, true))
    .orderBy(schema.subscriptionPlans.sortOrder);

  console.log("📋 Stripe Sync Status:");
  console.log("─".repeat(80));
  for (const p of allPlans) {
    const synced = p.stripeProductId ? "✅" : "⏭️";
    console.log(
      `  ${synced} ${p.name.padEnd(12)} | Product: ${(p.stripeProductId || "N/A").padEnd(25)} | Monthly: ${(p.stripePriceIdMonthly || "N/A").padEnd(25)} | Yearly: ${p.stripePriceIdYearly || "N/A"}`
    );
  }
}

syncProducts().catch(console.error);
