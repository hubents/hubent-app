import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, organizations } from "@/db/schema";
import { requireAuth } from "@/lib/session";
import { getStripePlatform } from "@/lib/stripe-platform";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    const session = await requireAuth();

    // Get existing subscription with Stripe customer ID
    const [sub] = await db
      .select({ stripeCustomerId: subscriptions.stripeCustomerId })
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, session.organizationId))
      .limit(1);

    if (!sub?.stripeCustomerId) {
      return NextResponse.json(
        { success: false, error: "No active subscription found" },
        { status: 404 }
      );
    }

    // Determine return URL based on org type
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.organizationId),
      columns: { orgType: true },
    });
    const settingsPath = "dashboard";

    const stripe = getStripePlatform();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${appUrl}/${settingsPath}/settings`,
    });

    return NextResponse.json({
      success: true,
      data: { url: portalSession.url },
    });
  } catch (error) {
    console.error("POST /api/subscriptions/portal error:", error);
    const message =
      error instanceof Error ? error.message : "Error creating portal session";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
