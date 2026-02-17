import Stripe from "stripe";

export function getStripePlatform() {
  const secretKey = process.env.STRIPE_PLATFORM_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_PLATFORM_SECRET_KEY not configured");
  }
  return new Stripe(secretKey);
}

export function getStripePlatformPublicKey() {
  return process.env.NEXT_PUBLIC_STRIPE_PLATFORM_KEY || "";
}
