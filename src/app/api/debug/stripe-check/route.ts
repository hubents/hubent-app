import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/session";
import { getStripePlatform } from "@/lib/stripe-platform";
import { db } from "@/db";
import { subscriptionPlans } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Auth check
  try {
    const session = await requirePlatformAdmin();
    results.auth = { ok: true, userId: session.user.userId, orgId: session.organizationId };
  } catch (error) {
    results.auth = { ok: false, error: error instanceof Error ? error.message : String(error) };
    return NextResponse.json(results, { status: 401 });
  }

  // 2. Stripe key check
  try {
    const stripe = getStripePlatform();
    results.stripeKey = { ok: true, keyPrefix: process.env.STRIPE_PLATFORM_SECRET_KEY?.substring(0, 12) + "..." };

    // 3. Stripe connectivity - list 1 customer
    try {
      const customers = await stripe.customers.list({ limit: 1 });
      results.stripeConnectivity = { ok: true, customersFound: customers.data.length };
    } catch (error) {
      results.stripeConnectivity = { ok: false, error: error instanceof Error ? error.message : String(error) };
    }

    // 4. Check each plan's price IDs
    const plans = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true));

    results.plans = [];
    for (const plan of plans) {
      const planResult: Record<string, unknown> = {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        stripeProductId: plan.stripeProductId,
        stripePriceIdMonthly: plan.stripePriceIdMonthly,
        stripePriceIdYearly: plan.stripePriceIdYearly,
      };

      // Test monthly price
      if (plan.stripePriceIdMonthly) {
        try {
          const price = await stripe.prices.retrieve(plan.stripePriceIdMonthly);
          planResult.monthlyPriceValid = true;
          planResult.monthlyPriceAmount = price.unit_amount;
          planResult.monthlyPriceCurrency = price.currency;
          planResult.monthlyPriceActive = price.active;
        } catch (error) {
          planResult.monthlyPriceValid = false;
          planResult.monthlyPriceError = error instanceof Error ? error.message : String(error);
        }
      }

      // Test yearly price
      if (plan.stripePriceIdYearly) {
        try {
          const price = await stripe.prices.retrieve(plan.stripePriceIdYearly);
          planResult.yearlyPriceValid = true;
          planResult.yearlyPriceAmount = price.unit_amount;
          planResult.yearlyPriceCurrency = price.currency;
          planResult.yearlyPriceActive = price.active;
        } catch (error) {
          planResult.yearlyPriceValid = false;
          planResult.yearlyPriceError = error instanceof Error ? error.message : String(error);
        }
      }

      // Test product
      if (plan.stripeProductId) {
        try {
          await stripe.products.retrieve(plan.stripeProductId);
          planResult.productValid = true;
        } catch (error) {
          planResult.productValid = false;
          planResult.productError = error instanceof Error ? error.message : String(error);
        }
      }

      (results.plans as Record<string, unknown>[]).push(planResult);
    }
  } catch (error) {
    results.stripeKey = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  return NextResponse.json(results);
}
