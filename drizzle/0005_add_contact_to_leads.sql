-- Add contactId to leads table (required for new leads)
ALTER TABLE "leads" ADD COLUMN "contact_id" integer REFERENCES "contacts"("id") ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "leads_contact_id_idx" ON "leads" ("contact_id");
