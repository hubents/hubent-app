-- Add vendor fields to contacts table
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "is_vendor" boolean DEFAULT false;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "vendor_category" text;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "vendor_id" integer REFERENCES "vendors"("id");

-- Create contact_relationships table for Person ↔ Company relationships
CREATE TABLE IF NOT EXISTS "contact_relationships" (
  "id" serial PRIMARY KEY,
  "person_contact_id" integer NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
  "company_contact_id" integer NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
  "role" text,
  "is_primary" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_contact_relationships_person" ON "contact_relationships"("person_contact_id");
CREATE INDEX IF NOT EXISTS "idx_contact_relationships_company" ON "contact_relationships"("company_contact_id");
