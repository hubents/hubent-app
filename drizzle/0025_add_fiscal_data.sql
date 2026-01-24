-- Add fiscal data fields to organization_finance_settings
ALTER TABLE "organization_finance_settings" ADD COLUMN IF NOT EXISTS "company_name" text;
ALTER TABLE "organization_finance_settings" ADD COLUMN IF NOT EXISTS "tax_id" text;
ALTER TABLE "organization_finance_settings" ADD COLUMN IF NOT EXISTS "fiscal_address" text;
ALTER TABLE "organization_finance_settings" ADD COLUMN IF NOT EXISTS "fiscal_city" text;
ALTER TABLE "organization_finance_settings" ADD COLUMN IF NOT EXISTS "fiscal_postal_code" text;
ALTER TABLE "organization_finance_settings" ADD COLUMN IF NOT EXISTS "fiscal_country" text DEFAULT 'España';
ALTER TABLE "organization_finance_settings" ADD COLUMN IF NOT EXISTS "fiscal_email" text;
ALTER TABLE "organization_finance_settings" ADD COLUMN IF NOT EXISTS "fiscal_phone" text;
