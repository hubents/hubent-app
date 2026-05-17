-- Add menuOptions list to rsvp_settings so each event can define its own
-- list of menu choices (e.g. "Carne", "Pescado", "Vegetariano"). Reflected
-- in the public RSVP form (guest's menu select), the dashboard editor, and
-- the per-guest "Menú" dropdown in the guests list.
-- Idempotent: safe to re-run.

ALTER TABLE rsvp_settings
ADD COLUMN IF NOT EXISTS menu_options jsonb
DEFAULT '["Carne", "Pescado", "Vegetariano"]'::jsonb;
