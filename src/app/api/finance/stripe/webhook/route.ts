import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { financialDocuments, paymentRecords } from "@/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  return new Stripe(secretKey);
}

function getWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET;
}

// POST /api/finance/stripe/webhook - Handle Stripe webhook events
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = getWebhookSecret();
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(paymentIntent);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const documentId = session.metadata?.documentId;
  const organizationId = session.metadata?.organizationId;

  if (!documentId || !organizationId) {
    console.error("Missing metadata in checkout session:", session.id);
    return;
  }

  const docId = parseInt(documentId, 10);
  const orgId = parseInt(organizationId, 10);

  // Get the document
  const [doc] = await db
    .select()
    .from(financialDocuments)
    .where(eq(financialDocuments.id, docId))
    .limit(1);

  if (!doc) {
    console.error("Document not found:", docId);
    return;
  }

  // Calculate amount paid (Stripe returns in cents)
  const amountPaid = (session.amount_total || 0) / 100;

  // Create payment record
  await db.insert(paymentRecords).values({
    organizationId: orgId,
    documentId: docId,
    amount: amountPaid.toString(),
    currency: session.currency?.toUpperCase() || "EUR",
    direction: "incoming",
    paymentDate: new Date(),
    paymentMethod: "stripe",
    stripePaymentId: session.payment_intent as string || session.id,
    reference: `Stripe Checkout ${session.id}`,
    notes: "Pago recibido via Stripe Checkout",
  });

  // Update document paidAmount
  const currentPaid = parseFloat(doc.paidAmount || "0");
  const newPaidAmount = currentPaid + amountPaid;
  const totalAmount = parseFloat(doc.total || "0");

  const updateData: Record<string, unknown> = {
    paidAmount: newPaidAmount.toString(),
    stripePaymentIntentId: session.payment_intent as string || null,
    updatedAt: new Date(),
  };

  // If fully paid, update status
  if (newPaidAmount >= totalAmount) {
    updateData.status = "paid";
    updateData.paidAt = new Date();
  }

  await db
    .update(financialDocuments)
    .set(updateData)
    .where(eq(financialDocuments.id, docId));

  console.log(`Payment processed for document ${doc.number}: ${amountPaid} ${session.currency}`);
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // This is a fallback in case checkout.session.completed doesn't fire
  // Usually the checkout.session.completed is enough
  console.log(`Payment intent succeeded: ${paymentIntent.id}`);
  
  // Check if we already processed this via checkout.session.completed
  const [existingPayment] = await db
    .select({ id: paymentRecords.id })
    .from(paymentRecords)
    .where(eq(paymentRecords.stripePaymentId, paymentIntent.id))
    .limit(1);

  if (existingPayment) {
    console.log(`Payment already processed: ${paymentIntent.id}`);
    return;
  }

  // If metadata exists, process the payment
  const documentId = paymentIntent.metadata?.documentId;
  const organizationId = paymentIntent.metadata?.organizationId;

  if (!documentId || !organizationId) {
    console.log("No document metadata in payment intent, skipping");
    return;
  }

  const docId = parseInt(documentId, 10);
  const orgId = parseInt(organizationId, 10);

  const [doc] = await db
    .select()
    .from(financialDocuments)
    .where(eq(financialDocuments.id, docId))
    .limit(1);

  if (!doc) {
    console.error("Document not found:", docId);
    return;
  }

  const amountPaid = paymentIntent.amount / 100;

  await db.insert(paymentRecords).values({
    organizationId: orgId,
    documentId: docId,
    amount: amountPaid.toString(),
    currency: paymentIntent.currency.toUpperCase(),
    direction: "incoming",
    paymentDate: new Date(),
    paymentMethod: "stripe",
    stripePaymentId: paymentIntent.id,
    reference: `Stripe Payment ${paymentIntent.id}`,
    notes: "Pago recibido via Stripe",
  });

  const currentPaid = parseFloat(doc.paidAmount || "0");
  const newPaidAmount = currentPaid + amountPaid;
  const totalAmount = parseFloat(doc.total || "0");

  const updateData: Record<string, unknown> = {
    paidAmount: newPaidAmount.toString(),
    stripePaymentIntentId: paymentIntent.id,
    updatedAt: new Date(),
  };

  if (newPaidAmount >= totalAmount) {
    updateData.status = "paid";
    updateData.paidAt = new Date();
  }

  await db
    .update(financialDocuments)
    .set(updateData)
    .where(eq(financialDocuments.id, docId));

  console.log(`Payment intent processed for document ${doc.number}: ${amountPaid} ${paymentIntent.currency}`);
}
