-- Finance Module Improvements
-- Adds organization finance settings, tax rates, and extends financial documents

-- 1. Organization Finance Settings (per-tenant configuration)
CREATE TABLE IF NOT EXISTS "organization_finance_settings" (
  "id" serial PRIMARY KEY,
  "organization_id" integer NOT NULL UNIQUE REFERENCES "organizations"("id") ON DELETE CASCADE,
  
  -- Currency settings
  "default_currency" text DEFAULT 'EUR',
  "enabled_currencies" jsonb DEFAULT '["EUR", "USD"]',
  
  -- Document numbering
  "quote_prefix" text DEFAULT 'PRES',
  "invoice_prefix" text DEFAULT 'FAC',
  "proforma_prefix" text DEFAULT 'PROF',
  "delivery_note_prefix" text DEFAULT 'ALB',
  "credit_note_prefix" text DEFAULT 'ABONO',
  "next_quote_number" integer DEFAULT 1,
  "next_invoice_number" integer DEFAULT 1,
  "next_proforma_number" integer DEFAULT 1,
  "next_delivery_note_number" integer DEFAULT 1,
  "next_credit_note_number" integer DEFAULT 1,
  
  -- Stripe Connect
  "stripe_account_id" text,
  "stripe_enabled" boolean DEFAULT false,
  
  -- Payment methods enabled
  "enable_cash" boolean DEFAULT true,
  "enable_bank_transfer" boolean DEFAULT true,
  "enable_stripe" boolean DEFAULT false,
  
  -- Default terms
  "default_payment_terms" text DEFAULT '30 días',
  "default_terms_and_conditions" text,
  "quote_validity_days" integer DEFAULT 30,
  
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- 2. Tax Rates (per-tenant)
CREATE TABLE IF NOT EXISTS "tax_rates" (
  "id" serial PRIMARY KEY,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "rate" decimal(5, 2) NOT NULL,
  "is_default" boolean DEFAULT false,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);

-- 3. Extend financial_documents table
ALTER TABLE "financial_documents" 
  ADD COLUMN IF NOT EXISTS "vendor_id" integer REFERENCES "vendors"("id"),
  ADD COLUMN IF NOT EXISTS "contact_id" integer REFERENCES "contacts"("id"),
  ADD COLUMN IF NOT EXISTS "direction" text DEFAULT 'outgoing',
  ADD COLUMN IF NOT EXISTS "payment_terms" text,
  ADD COLUMN IF NOT EXISTS "bank_account_id" integer REFERENCES "bank_accounts"("id"),
  ADD COLUMN IF NOT EXISTS "sent_at" timestamp,
  ADD COLUMN IF NOT EXISTS "paid_at" timestamp,
  ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" text,
  ADD COLUMN IF NOT EXISTS "stripe_payment_url" text;

-- 4. Extend document_items with tax_rate_id
ALTER TABLE "document_items"
  ADD COLUMN IF NOT EXISTS "tax_rate_id" integer REFERENCES "tax_rates"("id");

-- 5. Extend payment_records with more fields
ALTER TABLE "payment_records"
  ADD COLUMN IF NOT EXISTS "vendor_id" integer REFERENCES "vendors"("id"),
  ADD COLUMN IF NOT EXISTS "contact_id" integer REFERENCES "contacts"("id"),
  ADD COLUMN IF NOT EXISTS "event_id" integer REFERENCES "events"("id"),
  ADD COLUMN IF NOT EXISTS "direction" text DEFAULT 'incoming',
  ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS "stripe_payment_id" text;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_finance_settings_org" ON "organization_finance_settings"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_tax_rates_org" ON "tax_rates"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_financial_docs_vendor" ON "financial_documents"("vendor_id");
CREATE INDEX IF NOT EXISTS "idx_financial_docs_contact" ON "financial_documents"("contact_id");
CREATE INDEX IF NOT EXISTS "idx_payment_records_vendor" ON "payment_records"("vendor_id");
CREATE INDEX IF NOT EXISTS "idx_payment_records_contact" ON "payment_records"("contact_id");
CREATE INDEX IF NOT EXISTS "idx_payment_records_event" ON "payment_records"("event_id");
