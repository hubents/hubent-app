import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { organizationFinanceSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/finance/stripe/connect - Get Stripe Connect OAuth URL
export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission("finance:manage");
    const orgId = session.organizationId;

    const stripeClientId = process.env.STRIPE_CLIENT_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!stripeClientId) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: "STRIPE_NOT_CONFIGURED", 
            message: "Stripe Connect no está configurado. Contacta al administrador." 
          } 
        },
        { status: 400 }
      );
    }

    // Generate state for CSRF protection (includes orgType for redirect)
    const state = Buffer.from(JSON.stringify({ 
      orgId, 
      timestamp: Date.now(),
      orgType: session.orgType || "tenant",
    })).toString("base64");

    // Build Stripe Connect OAuth URL
    const params = new URLSearchParams({
      response_type: "code",
      client_id: stripeClientId,
      scope: "read_write",
      redirect_uri: `${appUrl}/api/finance/stripe/callback`,
      state,
    });

    const connectUrl = `https://connect.stripe.com/oauth/authorize?${params}`;

    return NextResponse.json({
      success: true,
      data: { url: connectUrl },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate Stripe Connect URL";
    return NextResponse.json(
      { success: false, error: { code: "STRIPE_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/finance/stripe/connect - Disconnect Stripe account
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("finance:manage");
    const orgId = session.organizationId;
    const body = await request.json();

    if (body.action === "disconnect") {
      // Remove Stripe account from organization settings
      await db
        .update(organizationFinanceSettings)
        .set({
          stripeAccountId: null,
          stripeEnabled: false,
          updatedAt: new Date(),
        })
        .where(eq(organizationFinanceSettings.organizationId, orgId));

      return NextResponse.json({
        success: true,
        message: "Stripe desconectado correctamente",
      });
    }

    return NextResponse.json(
      { success: false, error: { code: "INVALID_ACTION", message: "Invalid action" } },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to disconnect Stripe";
    return NextResponse.json(
      { success: false, error: { code: "STRIPE_ERROR", message } },
      { status: 500 }
    );
  }
}
