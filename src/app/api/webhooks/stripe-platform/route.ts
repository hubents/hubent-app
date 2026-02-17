import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, invoices, subscriptionPlans, organizations, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { getStripePlatform } from "@/lib/stripe-platform";
import {
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
} from "@/lib/email";

function getWebhookSecret() {
  const secret = process.env.STRIPE_PLATFORM_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_PLATFORM_WEBHOOK_SECRET not configured");
  return secret.trim();
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const secret = getWebhookSecret();
    const stripe = getStripePlatform();
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.error("[Webhook] Signature verification failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`Unhandled platform webhook event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") return;

  const orgId = parseInt(session.metadata?.organizationId || "0");
  const planId = parseInt(session.metadata?.planId || "0");

  if (!orgId || !planId) {
    console.error("Missing metadata in checkout session:", session.id);
    return;
  }

  const stripeSubscriptionId = session.subscription as string;
  const stripeCustomerId = session.customer as string;

  // Extract presentment currency from session if available
  const sessionAny = session as unknown as Record<string, unknown>;
  const presentmentDetails = sessionAny.presentment_details as
    | { presentment_currency?: string }
    | undefined;
  const presentmentCurrency = presentmentDetails?.presentment_currency || null;

  // Check if subscription already exists for this org
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, orgId))
    .limit(1);

  // Retrieve full subscription from Stripe to get accurate status and trial info
  const stripe = getStripePlatform();
  const stripeSubRaw = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const stripeSub = stripeSubRaw as unknown as {
    status: string;
    trial_end: number | null;
    current_period_end: number;
  };

  let initialStatus: "active" | "trialing" = "active";
  let trialEndsAt: Date | null = null;
  let currentPeriodEnd: Date | null = null;

  if (stripeSub.status === "trialing") {
    initialStatus = "trialing";
  }
  if (stripeSub.trial_end) {
    trialEndsAt = new Date(stripeSub.trial_end * 1000);
  }
  if (stripeSub.current_period_end) {
    currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);
  }

  if (existing) {
    // Update existing subscription
    await db
      .update(subscriptions)
      .set({
        planId,
        status: initialStatus,
        stripeSubscriptionId,
        stripeCustomerId,
        presentmentCurrency,
        trialEndsAt,
        currentPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existing.id));
  } else {
    // Create new subscription
    await db.insert(subscriptions).values({
      organizationId: orgId,
      planId,
      status: initialStatus,
      stripeSubscriptionId,
      stripeCustomerId,
      presentmentCurrency,
      trialEndsAt,
      currentPeriodStart: new Date(),
      currentPeriodEnd,
    });
  }

  // Update org's planId
  await db
    .update(organizations)
    .set({ planId, updatedAt: new Date() })
    .where(eq(organizations.id, orgId));

  console.log(`✅ Subscription created for org ${orgId}, plan ${planId}`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const invoiceAny = invoice as unknown as Record<string, unknown>;
  const subId = (invoiceAny.subscription as string) || null;
  if (!subId) return;

  // Find our subscription record
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subId))
    .limit(1);

  if (!sub) {
    console.warn("No subscription found for Stripe sub:", subId);
    return;
  }

  // Idempotency: check if invoice already processed
  const [existingInv] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(eq(invoices.stripeInvoiceId, invoice.id))
    .limit(1);

  if (existingInv) {
    console.log(`Invoice already processed: ${invoice.id}`);
    return;
  }

  // Extract presentment details
  const presentmentDetailsInv = invoiceAny.presentment_details as
    | { presentment_amount?: number; presentment_currency?: string }
    | undefined;

  // Create invoice record
  await db.insert(invoices).values({
    organizationId: sub.organizationId,
    subscriptionId: sub.id,
    amount: (invoice.amount_paid / 100).toFixed(2),
    currency: invoice.currency?.toUpperCase() || "EUR",
    status: "paid",
    paidAt: new Date(),
    stripeInvoiceId: invoice.id,
    pdfUrl: invoice.invoice_pdf || null,
    presentmentAmount: presentmentDetailsInv?.presentment_amount
      ? (presentmentDetailsInv.presentment_amount / 100).toFixed(2)
      : null,
    presentmentCurrency: presentmentDetailsInv?.presentment_currency?.toUpperCase() || null,
    period: invoice.lines?.data?.[0]?.period
      ? `${new Date(invoice.lines.data[0].period.start * 1000).toISOString().slice(0, 10)} - ${new Date(invoice.lines.data[0].period.end * 1000).toISOString().slice(0, 10)}`
      : null,
  });

  // Update subscription period (only set active if real payment, not $0 trial invoice)
  const periodEnd = invoice.lines?.data?.[0]?.period?.end;
  if (periodEnd) {
    const updateSet: Record<string, unknown> = {
      currentPeriodEnd: new Date(periodEnd * 1000),
      updatedAt: new Date(),
    };
    if (invoice.amount_paid > 0) {
      updateSet.status = "active";
    }
    await db
      .update(subscriptions)
      .set(updateSet)
      .where(eq(subscriptions.id, sub.id));
  }

  console.log(`✅ Invoice paid for org ${sub.organizationId}: ${invoice.id}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const invAny = invoice as unknown as Record<string, unknown>;
  const subId = (invAny.subscription as string) || null;
  if (!subId) return;

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subId))
    .limit(1);

  if (!sub) return;

  await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(subscriptions.id, sub.id));

  // Send payment failed email
  try {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, sub.organizationId),
    });
    const plan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, sub.planId),
    });
    if (org?.ownerId) {
      const owner = await db.query.users.findFirst({
        where: eq(users.id, org.ownerId),
      });
      if (owner?.email && plan) {
        await sendPaymentFailedEmail(owner.email, org.name, plan.name);
      }
    }
  } catch (emailErr) {
    console.error("Failed to send payment failed email:", emailErr);
  }

  console.log(`⚠️ Payment failed for org ${sub.organizationId}: ${invoice.id}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
    .limit(1);

  if (!sub) return;

  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    trialing: "trialing",
    paused: "paused",
    unpaid: "past_due",
    incomplete: "trialing",
    incomplete_expired: "canceled",
  };

  const newStatus = statusMap[subscription.status] || "active";

  // Get plan from Stripe price
  const stripePriceId = subscription.items.data[0]?.price?.id;
  let newPlanId = sub.planId;

  if (stripePriceId) {
    const plan = await db.query.subscriptionPlans.findFirst({
      where: (fields, { or, eq: fieldEq }) =>
        or(
          fieldEq(fields.stripePriceIdMonthly, stripePriceId),
          fieldEq(fields.stripePriceIdYearly, stripePriceId)
        ),
    });
    if (plan) newPlanId = plan.id;
  }

  await db
    .update(subscriptions)
    .set({
      status: newStatus as "active" | "canceled" | "past_due" | "trialing" | "paused",
      planId: newPlanId,
      currentPeriodStart: new Date(((subscription as unknown as Record<string, number>).current_period_start || 0) * 1000),
      currentPeriodEnd: new Date(((subscription as unknown as Record<string, number>).current_period_end || 0) * 1000),
      cancelAt: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000)
        : null,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, sub.id));

  // Update org planId if changed
  if (newPlanId !== sub.planId) {
    await db
      .update(organizations)
      .set({ planId: newPlanId, updatedAt: new Date() })
      .where(eq(organizations.id, sub.organizationId));
  }

  console.log(`🔄 Subscription updated for org ${sub.organizationId}: ${newStatus}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
    .limit(1);

  if (!sub) return;

  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, sub.id));

  // Send cancellation email
  try {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, sub.organizationId),
    });
    const plan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, sub.planId),
    });
    if (org?.ownerId) {
      const owner = await db.query.users.findFirst({
        where: eq(users.id, org.ownerId),
      });
      if (owner?.email && plan) {
        await sendSubscriptionCanceledEmail(owner.email, org.name, plan.name);
      }
    }
  } catch (emailErr) {
    console.error("Failed to send cancellation email:", emailErr);
  }

  console.log(`❌ Subscription canceled for org ${sub.organizationId}`);
}
