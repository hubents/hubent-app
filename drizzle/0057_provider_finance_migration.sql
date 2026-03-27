-- Migration 0057: Provider Finance Migration
-- Adds provider_org_id columns alongside existing vendor_id columns
-- Creates event_providers table for unified event-provider relationships

-- New table: event_providers (replaces event_vendors + provider_event_access)
CREATE TABLE IF NOT EXISTS event_providers (
  id serial PRIMARY KEY,
  event_id integer NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  provider_org_id integer NOT NULL REFERENCES organizations(id),
  planner_org_id integer NOT NULL REFERENCES organizations(id),
  service text,
  cost decimal(12,2),
  status text DEFAULT 'pending',
  notes text,
  invited_by text REFERENCES users(id),
  invited_at timestamp DEFAULT now(),
  accepted_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_providers_event ON event_providers(event_id);
CREATE INDEX IF NOT EXISTS idx_event_providers_provider ON event_providers(provider_org_id);
CREATE INDEX IF NOT EXISTS idx_event_providers_planner ON event_providers(planner_org_id);

-- Add provider_org_id to financial_documents
ALTER TABLE financial_documents ADD COLUMN IF NOT EXISTS provider_org_id integer REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS idx_financial_documents_provider_org ON financial_documents(provider_org_id);

-- Add provider_org_id to payment_records
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS provider_org_id integer REFERENCES organizations(id);

-- Add provider_org_id to payment_schedules
ALTER TABLE payment_schedules ADD COLUMN IF NOT EXISTS provider_org_id integer REFERENCES organizations(id);

-- Add provider_org_id to task_payments
ALTER TABLE task_payments ADD COLUMN IF NOT EXISTS provider_org_id integer REFERENCES organizations(id);

-- Add provider_org_id to event_payments
ALTER TABLE event_payments ADD COLUMN IF NOT EXISTS provider_org_id integer REFERENCES organizations(id);

-- Add provider_org_id to task_participants
ALTER TABLE task_participants ADD COLUMN IF NOT EXISTS provider_org_id integer REFERENCES organizations(id);

-- Add provider_org_id to event_participants
ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS provider_org_id integer REFERENCES organizations(id);

-- Add provider_org_id to task_schedule_items
ALTER TABLE task_schedule_items ADD COLUMN IF NOT EXISTS provider_org_id integer REFERENCES organizations(id);
