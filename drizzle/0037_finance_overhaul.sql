-- Finance Overhaul Migration
-- Phase 1: All schema changes for finance sync tenant <> provider

-- 1. New enum values (must be outside transaction in PostgreSQL)
DO $$ BEGIN
  ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'payment_promise';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'partial';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. vendors: link to provider organization [Gap G1]
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS provider_org_id INTEGER REFERENCES organizations(id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_provider_org
  ON vendors(organization_id, provider_org_id) WHERE provider_org_id IS NOT NULL;

-- 3. payment_records: status + attachments + cross-org link [Gap G5]
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'complete';
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS attachment_name TEXT;
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS source_payment_id INTEGER REFERENCES payment_records(id);
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS source_org_id INTEGER REFERENCES organizations(id);

-- 4. financial_documents: cross-org mirror documents
ALTER TABLE financial_documents ADD COLUMN IF NOT EXISTS source_document_id INTEGER REFERENCES financial_documents(id);
ALTER TABLE financial_documents ADD COLUMN IF NOT EXISTS source_org_id INTEGER REFERENCES organizations(id);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fd_source ON financial_documents(source_document_id) WHERE source_document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fd_event ON financial_documents(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fd_vendor ON financial_documents(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pr_event ON payment_records(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pr_task ON payment_records(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pr_source ON payment_records(source_payment_id) WHERE source_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pr_document ON payment_records(document_id) WHERE document_id IS NOT NULL;
