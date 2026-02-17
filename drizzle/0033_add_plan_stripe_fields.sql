-- Add Stripe integration fields and currency to subscription_plans
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'EUR';
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "stripe_product_id" text;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "stripe_price_id_monthly" text;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "stripe_price_id_yearly" text;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "trial_days" integer DEFAULT 14;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "highlighted" boolean DEFAULT false;

-- Add presentment currency fields to invoices for multi-currency tracking
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "presentment_amount" decimal(10, 2);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "presentment_currency" text;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "period" text;

-- Add presentment currency to subscriptions
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "presentment_currency" text;
