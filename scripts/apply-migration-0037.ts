import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== Migration 0037: Finance Overhaul ===\n");

  // 1. Enum values
  try {
    await sql`DO $$ BEGIN ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'payment_promise'; EXCEPTION WHEN duplicate_object THEN NULL; END $$`;
    console.log("✅ document_status: payment_promise");
  } catch { console.log("⏭️  payment_promise already exists"); }

  try {
    await sql`DO $$ BEGIN ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'partial'; EXCEPTION WHEN duplicate_object THEN NULL; END $$`;
    console.log("✅ document_status: partial");
  } catch { console.log("⏭️  partial already exists"); }

  // 2. vendors: provider_org_id [Gap G1]
  await sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS provider_org_id INTEGER REFERENCES organizations(id)`;
  console.log("✅ vendors.provider_org_id");

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_provider_org ON vendors(organization_id, provider_org_id) WHERE provider_org_id IS NOT NULL`;
  console.log("✅ idx_vendors_provider_org");

  // 3. payment_records: status + attachments + cross-org [Gap G5]
  await sql`ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'complete'`;
  console.log("✅ payment_records.status");

  await sql`ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS attachment_url TEXT`;
  console.log("✅ payment_records.attachment_url");

  await sql`ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS attachment_name TEXT`;
  console.log("✅ payment_records.attachment_name");

  await sql`ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS source_payment_id INTEGER REFERENCES payment_records(id)`;
  console.log("✅ payment_records.source_payment_id");

  await sql`ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS source_org_id INTEGER REFERENCES organizations(id)`;
  console.log("✅ payment_records.source_org_id");

  // 4. financial_documents: cross-org mirror
  await sql`ALTER TABLE financial_documents ADD COLUMN IF NOT EXISTS source_document_id INTEGER REFERENCES financial_documents(id)`;
  console.log("✅ financial_documents.source_document_id");

  await sql`ALTER TABLE financial_documents ADD COLUMN IF NOT EXISTS source_org_id INTEGER REFERENCES organizations(id)`;
  console.log("✅ financial_documents.source_org_id");

  // 5. Indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_fd_source ON financial_documents(source_document_id) WHERE source_document_id IS NOT NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_fd_event ON financial_documents(event_id) WHERE event_id IS NOT NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_fd_vendor ON financial_documents(vendor_id) WHERE vendor_id IS NOT NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pr_event ON payment_records(event_id) WHERE event_id IS NOT NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pr_task ON payment_records(task_id) WHERE task_id IS NOT NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pr_source ON payment_records(source_payment_id) WHERE source_payment_id IS NOT NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pr_document ON payment_records(document_id) WHERE document_id IS NOT NULL`;
  console.log("✅ All indexes created");

  console.log("\n✅ Schema migration 0037 complete!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
