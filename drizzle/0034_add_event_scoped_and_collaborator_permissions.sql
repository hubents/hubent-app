-- Add event_scoped flag to roles table
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "event_scoped" boolean DEFAULT false;

-- Add permissions JSON to event_participants table
ALTER TABLE "event_participants" ADD COLUMN IF NOT EXISTS "permissions" json;

-- Update system roles: mark assistant and viewer as event_scoped
UPDATE "roles" SET "event_scoped" = true WHERE "slug" IN ('assistant', 'viewer') AND "is_system" = true;
