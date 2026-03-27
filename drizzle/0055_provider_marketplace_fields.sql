-- Provider Marketplace Fields: Add rich profile fields to organizations and users
-- Part of "Provider Single Source of Truth" initiative

-- ============================================
-- ORGANIZATIONS: Marketplace profile fields
-- ============================================

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "tagline" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "cover_image" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "public_email" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "tiktok_handle" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "facebook_url" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "linkedin_url" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "price_range" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "services" jsonb;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "categories" jsonb;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "founded_year" integer;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "region" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "country" text DEFAULT 'España';
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "languages_spoken" jsonb;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "min_budget" decimal(10,2);
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "max_budget" decimal(10,2);
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "response_time" text;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "profile_completeness" integer DEFAULT 0;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "total_reviews" integer DEFAULT 0;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "average_rating" decimal(3,2);
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "is_featured" boolean DEFAULT false;

-- ============================================
-- USERS: Profile enrichment fields
-- ============================================

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "job_title" text;

-- ============================================
-- ORGANIZATION_PORTFOLIO: Portfolio linked to org (not vendor_profiles)
-- ============================================

CREATE TABLE IF NOT EXISTS "organization_portfolio" (
  "id" serial PRIMARY KEY,
  "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "type" text DEFAULT 'image',
  "url" text NOT NULL,
  "thumbnail" text,
  "title" text,
  "description" text,
  "event_type" text,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_org_portfolio_org_id" ON "organization_portfolio" ("organization_id");

-- ============================================
-- PROVIDER_INVITATIONS: Invite providers to register
-- ============================================

CREATE TABLE IF NOT EXISTS "provider_invitations" (
  "id" serial PRIMARY KEY,
  "planner_org_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "event_id" integer REFERENCES "events"("id") ON DELETE SET NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "category" text,
  "phone" text,
  "token" text NOT NULL UNIQUE,
  "status" text NOT NULL DEFAULT 'pending',
  "invited_by" text REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "expires_at" timestamp NOT NULL,
  "accepted_at" timestamp,
  "provider_org_id" integer REFERENCES "organizations"("id")
);

CREATE INDEX IF NOT EXISTS "idx_provider_invitations_email" ON "provider_invitations" ("email");
CREATE INDEX IF NOT EXISTS "idx_provider_invitations_token" ON "provider_invitations" ("token");
CREATE INDEX IF NOT EXISTS "idx_provider_invitations_planner" ON "provider_invitations" ("planner_org_id");

-- ============================================
-- ADD organization_id to vendor_reviews for direct org link
-- ============================================

ALTER TABLE "vendor_reviews" ADD COLUMN IF NOT EXISTS "organization_id" integer REFERENCES "organizations"("id");
