import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== Data Migration: Finance States ===\n");

  // 1. Draft quotes/invoices → sent (they were created but never had proper status)
  const draftDocs = await sql`
    UPDATE financial_documents 
    SET status = 'sent', updated_at = NOW()
    WHERE status = 'draft' 
      AND type IN ('quote', 'invoice')
      AND source_document_id IS NULL
    RETURNING id, type, number
  `;
  console.log(`✅ ${draftDocs.length} draft docs → sent`);
  for (const d of draftDocs) {
    console.log(`   ${d.type} #${d.number} (id: ${d.id})`);
  }

  // 2. Approved → sent (approved was used as "sent" before)
  const approvedDocs = await sql`
    UPDATE financial_documents 
    SET status = 'sent', updated_at = NOW()
    WHERE status = 'approved'
      AND source_document_id IS NULL
    RETURNING id, type, number
  `;
  console.log(`✅ ${approvedDocs.length} approved docs → sent`);
  for (const d of approvedDocs) {
    console.log(`   ${d.type} #${d.number} (id: ${d.id})`);
  }

  // 3. Infer direction for docs with NULL direction
  const outgoingFixed = await sql`
    UPDATE financial_documents 
    SET direction = 'outgoing', updated_at = NOW()
    WHERE direction IS NULL 
      AND vendor_id IS NULL
      AND source_document_id IS NULL
    RETURNING id
  `;
  console.log(`✅ ${outgoingFixed.length} docs → direction 'outgoing'`);

  const incomingFixed = await sql`
    UPDATE financial_documents 
    SET direction = 'incoming', updated_at = NOW()
    WHERE direction IS NULL 
      AND vendor_id IS NOT NULL
      AND source_document_id IS NULL
    RETURNING id
  `;
  console.log(`✅ ${incomingFixed.length} docs → direction 'incoming'`);

  // 4. Payment records without status → 'complete'
  const paymentsFixed = await sql`
    UPDATE payment_records 
    SET status = 'complete'
    WHERE status IS NULL
    RETURNING id
  `;
  console.log(`✅ ${paymentsFixed.length} payment_records → status 'complete'`);

  // Summary
  console.log("\n=== Summary ===");
  const totalDocs = await sql`SELECT count(*) as c FROM financial_documents`;
  const totalPayments = await sql`SELECT count(*) as c FROM payment_records`;
  console.log(`Total documents: ${totalDocs[0].c}`);
  console.log(`Total payment_records: ${totalPayments[0].c}`);

  const statusBreakdown = await sql`
    SELECT status, count(*) as c 
    FROM financial_documents 
    WHERE source_document_id IS NULL
    GROUP BY status 
    ORDER BY c DESC
  `;
  console.log("\nDocument status breakdown:");
  for (const row of statusBreakdown) {
    console.log(`  ${row.status}: ${row.c}`);
  }

  console.log("\n✅ Data migration complete!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Data migration failed:", err);
    process.exit(1);
  });
