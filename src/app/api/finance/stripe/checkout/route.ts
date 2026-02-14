import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { db } from "@/db";
import { financialDocuments, organizationFinanceSettings, contacts, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  return new Stripe(secretKey);
}

// POST /api/finance/stripe/checkout - Create Stripe Checkout session for a document
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("finance:manage");
    const orgId = session.organizationId;
    const body = await request.json();
    const { documentId } = body;

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "documentId is required" } },
        { status: 400 }
      );
    }

    // Get organization settings to check if Stripe is enabled
    const [settings] = await db
      .select()
      .from(organizationFinanceSettings)
      .where(eq(organizationFinanceSettings.organizationId, orgId))
      .limit(1);

    if (!settings?.stripeAccountId || !settings?.stripeEnabled) {
      return NextResponse.json(
        { success: false, error: { code: "STRIPE_NOT_ENABLED", message: "Stripe no está habilitado para esta organización" } },
        { status: 400 }
      );
    }

    // Get the document
    const [doc] = await db
      .select()
      .from(financialDocuments)
      .where(eq(financialDocuments.id, documentId))
      .limit(1);

    if (!doc || doc.organizationId !== orgId) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Documento no encontrado" } },
        { status: 404 }
      );
    }

    if (doc.status === "paid" || doc.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_STATUS", message: "Este documento ya está pagado o cancelado" } },
        { status: 400 }
      );
    }

    // Calculate pending amount
    const totalAmount = parseFloat(doc.total || "0");
    const paidAmount = parseFloat(doc.paidAmount || "0");
    const pendingAmount = totalAmount - paidAmount;

    if (pendingAmount <= 0) {
      return NextResponse.json(
        { success: false, error: { code: "ALREADY_PAID", message: "Este documento ya está completamente pagado" } },
        { status: 400 }
      );
    }

    // Get contact email if available
    let customerEmail: string | undefined;
    if (doc.contactId) {
      const [contact] = await db
        .select({ email: contacts.email })
        .from(contacts)
        .where(eq(contacts.id, doc.contactId))
        .limit(1);
      customerEmail = contact?.email || undefined;
    }

    // Get organization name for the description
    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const stripe = getStripe();

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: doc.currency?.toLowerCase() || "eur",
              product_data: {
                name: `${doc.type === "invoice" ? "Factura" : "Documento"} ${doc.number}`,
                description: `Pago a ${org?.name || ""}`,
              },
              unit_amount: Math.round(pendingAmount * 100), // Stripe uses cents
            },
            quantity: 1,
          },
        ],
        customer_email: customerEmail,
        metadata: {
          documentId: doc.id.toString(),
          organizationId: orgId.toString(),
          documentNumber: doc.number,
        },
        success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/payment/cancel?document=${doc.number}`,
      },
      {
        stripeAccount: settings.stripeAccountId,
      }
    );

    // Save the checkout URL to the document
    await db
      .update(financialDocuments)
      .set({
        stripePaymentUrl: checkoutSession.url,
        stripePaymentIntentId: checkoutSession.payment_intent as string || null,
        updatedAt: new Date(),
      })
      .where(eq(financialDocuments.id, documentId));

    return NextResponse.json({
      success: true,
      data: {
        checkoutUrl: checkoutSession.url,
        sessionId: checkoutSession.id,
      },
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    const message = error instanceof Error ? error.message : "Failed to create checkout session";
    return NextResponse.json(
      { success: false, error: { code: "STRIPE_ERROR", message } },
      { status: 500 }
    );
  }
}

// GET /api/finance/stripe/checkout - Get existing payment link for a document
export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission("finance:manage");
    const orgId = session.organizationId;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "documentId is required" } },
        { status: 400 }
      );
    }

    const [doc] = await db
      .select({
        id: financialDocuments.id,
        stripePaymentUrl: financialDocuments.stripePaymentUrl,
        stripePaymentIntentId: financialDocuments.stripePaymentIntentId,
      })
      .from(financialDocuments)
      .where(eq(financialDocuments.id, parseInt(documentId, 10)))
      .limit(1);

    if (!doc || doc.id !== parseInt(documentId, 10)) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Documento no encontrado" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentUrl: doc.stripePaymentUrl,
        paymentIntentId: doc.stripePaymentIntentId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get payment link";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}
