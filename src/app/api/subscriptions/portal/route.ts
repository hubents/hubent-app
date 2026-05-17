import { db } from "@/db";
import { subscriptions, organizations } from "@/db/schema";
import { requireAuth } from "@/lib/session";
import { getStripePlatform } from "@/lib/stripe-platform";
import { eq } from "drizzle-orm";
import { apiHandler, ok, notFound } from "@/lib/api-handler";

export async function POST() {
  return apiHandler(async () => {
    const session = await requireAuth();

    // Get existing subscription with Stripe customer ID
    const [sub] = await db
      .select({ stripeCustomerId: subscriptions.stripeCustomerId })
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, session.organizationId))
      .limit(1);

    if (!sub?.stripeCustomerId) {
      return notFound("No active subscription found");
    }

    // Determine return URL based on org type
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.organizationId),
      columns: { orgType: true },
    });
    const settingsPath = org?.orgType === "provider" ? "vendor" : "dashboard";

    const stripe = getStripePlatform();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${appUrl}/${settingsPath}/settings`,
    });

    return ok({ url: portalSession.url });
  }, "POST /api/subscriptions/portal");
}
