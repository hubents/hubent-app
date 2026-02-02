-- Add fiscal fields to organizations table for unified configuration
-- This migrates fiscal data from organizationFinanceSettings to organizations

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "fiscal_name" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "tax_id" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "fiscal_address" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "fiscal_city" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "fiscal_postal_code" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "fiscal_country" text DEFAULT 'España';
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "fiscal_email" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "fiscal_phone" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "invoice_logo" text;

-- Migrate existing data from organizationFinanceSettings to organizations
UPDATE "organizations" o
SET 
  "fiscal_name" = COALESCE(ofs."company_name", o."name"),
  "tax_id" = ofs."tax_id",
  "fiscal_address" = ofs."fiscal_address",
  "fiscal_city" = ofs."fiscal_city",
  "fiscal_postal_code" = ofs."fiscal_postal_code",
  "fiscal_country" = COALESCE(ofs."fiscal_country", 'España'),
  "fiscal_email" = ofs."fiscal_email",
  "fiscal_phone" = ofs."fiscal_phone"
FROM "organization_finance_settings" ofs
WHERE ofs."organization_id" = o."id";
