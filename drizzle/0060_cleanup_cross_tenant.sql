-- Migration: Cross-tenant cleanup
-- Migrates permission key vendors->partners in event_participants.permissions JSON
-- Prepares for eventual removal of event_participants.role column

-- 1. Migrate "vendors" key to "partners" in permissions JSON
-- Idempotent: only acts on rows that still have the "vendors" key
UPDATE event_participants
SET permissions = (permissions::jsonb - 'vendors') || jsonb_build_object('partners', permissions::jsonb->'vendors')
WHERE permissions::jsonb ? 'vendors';

-- 2. Also update event_collaborations permissions to use "partners" key if somehow set with "vendors"
UPDATE event_collaborations
SET permissions = (permissions::jsonb - 'vendors') || jsonb_build_object('partners', permissions::jsonb->'vendors')
WHERE permissions IS NOT NULL AND permissions::jsonb ? 'vendors';
