import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { organizations, subscriptions, subscriptionPlans, invoices } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getUsage } from "@/lib/entitlements";

/**
 * GET /api/user/billing
 * Get billing information for the current organization
 */
export async function GET() {
  try {
    const session = await requireAuth();
    const orgId = session.organizationId;

    // Get organization
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });

    // Get subscription
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, orgId),
    });

    // Get plan details
    let plan = null;
    if (subscription) {
      plan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.id, subscription.planId),
      });
    }

    // Get recent invoices
    const recentInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.organizationId, orgId))
      .orderBy(desc(invoices.createdAt))
      .limit(10);

    const usage = await getUsage(orgId);

    // Get all active plans for comparison
    const allPlans = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.sortOrder);

    return NextResponse.json({
      success: true,
      data: {
        organization: {
          id: org?.id,
          name: org?.name,
          orgType: org?.orgType,
        },
        plan: plan ? {
          id: plan.id,
          name: plan.name,
          slug: plan.slug,
          description: plan.description,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          currency: plan.currency,
          features: plan.features,
          limits: plan.limits,
          trialDays: plan.trialDays,
        } : null,
        subscription: subscription ? {
          id: subscription.id,
          status: subscription.status,
          trialEndsAt: subscription.trialEndsAt?.toISOString(),
          currentPeriodStart: subscription.currentPeriodStart?.toISOString(),
          currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
          cancelAt: subscription.cancelAt?.toISOString(),
          presentmentCurrency: subscription.presentmentCurrency,
          hasStripeSubscription: !!subscription.stripeSubscriptionId,
        } : null,
        usage,
        availablePlans: allPlans
          .filter(p => p.orgType === (org?.orgType || "tenant"))
          .map(p => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            description: p.description,
            priceMonthly: p.priceMonthly,
            priceYearly: p.priceYearly,
            currency: p.currency,
            features: p.features,
            limits: p.limits,
            highlighted: p.highlighted,
            trialDays: p.trialDays,
            stripePriceIdMonthly: p.stripePriceIdMonthly,
            stripePriceIdYearly: p.stripePriceIdYearly,
          })),
        invoices: recentInvoices.map(inv => ({
          id: inv.id,
          amount: inv.amount,
          currency: inv.currency,
          status: inv.status,
          paidAt: inv.paidAt?.toISOString(),
          dueDate: inv.dueDate?.toISOString(),
          pdfUrl: inv.pdfUrl,
          presentmentAmount: inv.presentmentAmount,
          presentmentCurrency: inv.presentmentCurrency,
          period: inv.period,
          createdAt: inv.createdAt?.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("Get billing error:", error);
    return NextResponse.json(
      { error: "Error al obtener información de facturación" },
      { status: 500 }
    );
  }
}
