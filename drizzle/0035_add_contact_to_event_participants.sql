-- Add contactId to event_participants for unified collaborators
ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE;
