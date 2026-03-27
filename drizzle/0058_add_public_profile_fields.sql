-- Migration 0058: Add public profile fields to organizations
-- Supports: public email, price range, country, Instagram posts, brochure PDF

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "public_email" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "price_range" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "instagram_posts" json;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "brochure_url" text;
