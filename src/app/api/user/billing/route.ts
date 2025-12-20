import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { organizations, organizationMembers, subscriptions, subscriptionPlans, invoices } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/user/billing
 * Get billing information for the current organization
 */
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Get user's organization
    const membership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, session.user.id),
    });

    if (!membership) {
      return NextResponse.json({
        success: true,
        data: {
          plan: null,
          subscription: null,
          invoices: [],
        },
      });
    }

    // Get organization
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, membership.organizationId),
    });

    // Get subscription
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, membership.organizationId),
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
      .where(eq(invoices.organizationId, membership.organizationId))
      .orderBy(desc(invoices.createdAt))
      .limit(10);

    // Calculate usage (simplified - in production would query actual usage)
    const usage = {
      users: 1, // Would count actual members
      events: 0, // Would count actual events
      storage: 0, // Would calculate actual storage
    };

    return NextResponse.json({
      success: true,
      data: {
        organization: {
          id: org?.id,
          name: org?.name,
        },
        plan: plan ? {
          id: plan.id,
          name: plan.name,
          slug: plan.slug,
          description: plan.description,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          features: plan.features,
          limits: plan.limits,
        } : null,
        subscription: subscription ? {
          id: subscription.id,
          status: subscription.status,
          trialEndsAt: subscription.trialEndsAt?.toISOString(),
          currentPeriodStart: subscription.currentPeriodStart?.toISOString(),
          currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
          cancelAt: subscription.cancelAt?.toISOString(),
        } : null,
        usage,
        invoices: recentInvoices.map(inv => ({
          id: inv.id,
          amount: inv.amount,
          currency: inv.currency,
          status: inv.status,
          paidAt: inv.paidAt?.toISOString(),
          dueDate: inv.dueDate?.toISOString(),
          pdfUrl: inv.pdfUrl,
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
