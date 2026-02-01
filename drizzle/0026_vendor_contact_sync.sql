-- Add contactId to vendors for bidirectional sync with contacts
ALTER TABLE "vendors" ADD COLUMN "contact_id" integer;
