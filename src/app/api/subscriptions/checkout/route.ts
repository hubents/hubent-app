import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptionPlans, subscriptions, organizations, users } from "@/db/schema";
import { requireAuth } from "@/lib/session";
import { getStripePlatform } from "@/lib/stripe-platform";
import { eq } from "drizzle-orm";
import { withMonitoring } from "@/lib/monitoring";

export const POST = withMonitoring(async (request: NextRequest) => {
  const session = await requireAuth();
    const body = await request.json();
    const { planId, interval } = body as {
      planId: number;
      interval: "month" | "year";
    };

    if (!planId || !interval) {
      return NextResponse.json(
        { success: false, error: "planId and interval are required" },
        { status: 400 }
      );
    }

    // Get plan
    const plan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, planId),
    });

    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { success: false, error: "Plan not found or inactive" },
        { status: 404 }
      );
    }

    // Validate plan matches org type
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.organizationId),
      columns: { orgType: true, name: true },
    });
    if (org && plan.orgType && org.orgType !== plan.orgType) {
      return NextResponse.json(
        { success: false, error: "Plan not compatible with your organization type" },
        { status: 400 }
      );
    }

    // Get Stripe Price ID
    const priceId =
      interval === "month"
        ? plan.stripePriceIdMonthly
        : plan.stripePriceIdYearly;

    if (!priceId) {
      return NextResponse.json(
        { success: false, error: "Plan not synced with Stripe yet" },
        { status: 400 }
      );
    }

    const stripe = getStripePlatform();

    // Get or create Stripe Customer
    const [existingSub] = await db
      .select({ stripeCustomerId: subscriptions.stripeCustomerId })
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, session.organizationId))
      .limit(1);

    let customerId = existingSub?.stripeCustomerId;

    if (!customerId) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.userId),
      });

      const customer = await stripe.customers.create({
        email: user?.email || session.user.email,
        name: org?.name || undefined,
        metadata: {
          organizationId: session.organizationId.toString(),
          userId: session.user.userId,
          orgType: org?.orgType || "tenant",
        },
      });
      customerId = customer.id;
    }

    // Determine app URL for redirects
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Only offer trial if user has no existing subscription (new customer)
    const hasExistingSub = !!existingSub?.stripeCustomerId;
    const trialDays = (!hasExistingSub && plan.trialDays && plan.trialDays > 0)
      ? plan.trialDays
      : undefined;

    // Create Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: trialDays,
        metadata: {
          organizationId: session.organizationId.toString(),
          planId: planId.toString(),
          planSlug: plan.slug,
        },
      },
      success_url: `${appUrl}/${org?.orgType === "provider" ? "vendor" : "dashboard"}/settings?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/${org?.orgType === "provider" ? "vendor" : "dashboard"}/settings?billing=cancelled`,
      metadata: {
        organizationId: session.organizationId.toString(),
        planId: planId.toString(),
      },
    });

  return NextResponse.json({
    success: true,
    data: { url: checkoutSession.url },
  });
}, { name: "POST /api/subscriptions/checkout", critical: true });
