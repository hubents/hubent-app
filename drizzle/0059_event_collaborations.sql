-- Migration: Bilateral Cross-Tenant Collaboration
-- Creates event_collaborations table, adds shared_with_host to tasks,
-- adds collaborator_org_id to task_participants, migrates provider_event_access data.

-- 1. Create the new event_collaborations table
CREATE TABLE IF NOT EXISTS event_collaborations (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  host_org_id INTEGER NOT NULL REFERENCES organizations(id),
  guest_org_id INTEGER REFERENCES organizations(id),
  invitation_email TEXT,
  invitation_token TEXT UNIQUE,
  permissions JSON DEFAULT '{"general":"view","calendar":"view","tasks":"view","partners":"none","finances":"none","rsvp":"none","guests":"none","runsheet":"none"}',
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by TEXT REFERENCES users(id),
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, guest_org_id)
);

-- 2. Add shared_with_host to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS shared_with_host BOOLEAN DEFAULT FALSE;

-- 3. Add collaborator_org_id to task_participants
ALTER TABLE task_participants ADD COLUMN IF NOT EXISTS collaborator_org_id INTEGER REFERENCES organizations(id);

-- 4. Migrate existing provider_event_access data to event_collaborations
INSERT INTO event_collaborations (event_id, host_org_id, guest_org_id, status, invited_by, invited_at, accepted_at)
SELECT
  pea.event_id,
  pea.planner_org_id,
  pea.provider_org_id,
  COALESCE(pea.status, 'active'),
  pea.invited_by,
  pea.invited_at,
  pea.accepted_at
FROM provider_event_access pea
ON CONFLICT (event_id, guest_org_id) DO NOTHING;

-- 5. Index for fast lookups by guest org
CREATE INDEX IF NOT EXISTS idx_event_collaborations_guest_org
  ON event_collaborations(guest_org_id, status);

-- 6. Index for fast lookups by event
CREATE INDEX IF NOT EXISTS idx_event_collaborations_event
  ON event_collaborations(event_id, status);
