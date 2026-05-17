ALTER TABLE "financial_documents" ADD COLUMN IF NOT EXISTS "global_surcharge" numeric(10, 2) DEFAULT '0';
ALTER TABLE "financial_documents" ADD COLUMN IF NOT EXISTS "global_surcharge_type" text DEFAULT 'percentage';
