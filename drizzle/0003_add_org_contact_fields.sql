-- Add contact fields to organizations table
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "website" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "address" text;
