/**
 * One-time script to delete dummy 0€ documents created by the old
 * createQuickDocument() function in vendor event page.
 * 
 * Run: npx tsx scripts/cleanup-dummy-docs.ts
 */
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const sql = neon(dbUrl);

  // Find all documents with total=0 created on 2026-03-19 (the dummy docs)
  const dummyDocs = await sql`
    SELECT id, organization_id, type, number, total, status, source_document_id, created_at
    FROM financial_documents
    WHERE total = '0.00'
      AND created_at >= '2026-03-19'
      AND created_at < '2026-03-20'
    ORDER BY id
  `;

  console.log(`Found ${dummyDocs.length} dummy documents:`);
  for (const doc of dummyDocs) {
    console.log(`  #${doc.id} [org:${doc.organization_id}] ${doc.type} ${doc.number} total=${doc.total} status=${doc.status} mirror=${doc.source_document_id || 'none'}`);
  }

  if (dummyDocs.length === 0) {
    console.log("Nothing to clean up.");
    return;
  }

  const docIds = dummyDocs.map((d: any) => d.id);

  // Also find mirrors of these docs
  const mirrors = await sql`
    SELECT id, number, organization_id, source_document_id
    FROM financial_documents
    WHERE source_document_id = ANY(${docIds})
  `;
  console.log(`Found ${mirrors.length} mirror documents to delete.`);

  const allDocIds = [...docIds, ...mirrors.map((m: any) => m.id)];

  // Delete document items
  const deletedItems = await sql`
    DELETE FROM document_items WHERE document_id = ANY(${allDocIds})
  `;
  console.log(`Deleted document_items for ${allDocIds.length} documents.`);

  // Delete payment records linked to these docs
  const deletedPayments = await sql`
    DELETE FROM payment_records WHERE document_id = ANY(${allDocIds})
  `;
  console.log(`Deleted payment_records for these documents.`);

  // Delete mirrors first (they reference originals via source_document_id)
  if (mirrors.length > 0) {
    const mirrorIds = mirrors.map((m: any) => m.id);
    await sql`DELETE FROM financial_documents WHERE id = ANY(${mirrorIds})`;
    console.log(`Deleted ${mirrorIds.length} mirror documents.`);
  }

  // Delete originals
  await sql`DELETE FROM financial_documents WHERE id = ANY(${docIds})`;
  console.log(`Deleted ${docIds.length} original dummy documents.`);

  console.log("\nCleanup complete!");
}

main().catch(console.error);
