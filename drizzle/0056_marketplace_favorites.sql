-- Migration: Marketplace Favorites + Provider Created-By Tracking
-- Safe to run multiple times (uses IF NOT EXISTS)

-- Track which planner org created an unclaimed provider
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_by_org_id integer REFERENCES organizations(id);

-- Provider favorites table
CREATE TABLE IF NOT EXISTS provider_favorites (
  id serial PRIMARY KEY,
  organization_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_org_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT now()
);

-- Unique constraint: one favorite per user per provider per org
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'provider_favorites_org_user_provider_unique'
  ) THEN
    ALTER TABLE provider_favorites
      ADD CONSTRAINT provider_favorites_org_user_provider_unique
      UNIQUE (organization_id, user_id, provider_org_id);
  END IF;
END $$;

-- Index for fast lookups by user within their org
CREATE INDEX IF NOT EXISTS idx_provider_favorites_user ON provider_favorites(organization_id, user_id);

-- Index for fast lookups by provider
CREATE INDEX IF NOT EXISTS idx_provider_favorites_provider ON provider_favorites(provider_org_id);
