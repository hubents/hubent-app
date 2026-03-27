import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizationFinanceSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/finance/stripe/callback - Handle Stripe Connect OAuth callback
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // All org types use unified /dashboard portal
  function buildRedirectUrl(orgType?: string) {
    const base = "/dashboard/finance/settings";
    return `${appUrl}${base}?tab=payments`;
  }

  // For early errors (no state yet), default to dashboard
  let redirectUrl = buildRedirectUrl();

  // Handle errors from Stripe
  if (error) {
    console.error("Stripe Connect error:", error, errorDescription);
    return NextResponse.redirect(
      `${redirectUrl}&stripe_error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(`${redirectUrl}&stripe_error=missing_params`);
  }

  try {
    // Decode state to get organization ID and orgType
    const stateData = JSON.parse(Buffer.from(state, "base64").toString());
    const { orgId, timestamp, orgType } = stateData;

    // Now we know the orgType, rebuild redirect URL
    redirectUrl = buildRedirectUrl(orgType);

    // Verify state is not too old (15 minutes)
    if (Date.now() - timestamp > 15 * 60 * 1000) {
      return NextResponse.redirect(`${redirectUrl}&stripe_error=state_expired`);
    }

    // Exchange code for access token
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.redirect(`${redirectUrl}&stripe_error=stripe_not_configured`);
    }

    const tokenResponse = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_secret: stripeSecretKey,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Stripe token exchange error:", errorData);
      return NextResponse.redirect(
        `${redirectUrl}&stripe_error=${encodeURIComponent(errorData.error_description || "token_exchange_failed")}`
      );
    }

    const tokenData = await tokenResponse.json();
    const stripeAccountId = tokenData.stripe_user_id;

    if (!stripeAccountId) {
      return NextResponse.redirect(`${redirectUrl}&stripe_error=no_account_id`);
    }

    // Check if settings exist for this org
    const [existing] = await db
      .select({ id: organizationFinanceSettings.id })
      .from(organizationFinanceSettings)
      .where(eq(organizationFinanceSettings.organizationId, orgId))
      .limit(1);

    if (existing) {
      // Update existing settings
      await db
        .update(organizationFinanceSettings)
        .set({
          stripeAccountId,
          stripeEnabled: true,
          updatedAt: new Date(),
        })
        .where(eq(organizationFinanceSettings.organizationId, orgId));
    } else {
      // Create new settings
      await db.insert(organizationFinanceSettings).values({
        organizationId: orgId,
        stripeAccountId,
        stripeEnabled: true,
        enableStripe: true,
      });
    }

    return NextResponse.redirect(`${redirectUrl}&stripe_success=true`);
  } catch (err) {
    console.error("Stripe callback error:", err);
    return NextResponse.redirect(`${redirectUrl}&stripe_error=internal_error`);
  }
}
