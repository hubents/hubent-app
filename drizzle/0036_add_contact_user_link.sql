-- Add userId to contacts table to link CRM contacts to platform users
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id);

-- Add metadata JSONB to invitations for tracking contactId/eventId
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS metadata JSONB;
