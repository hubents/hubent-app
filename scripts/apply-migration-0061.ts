import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== Migration 0061: Rename credit_note prefix ABONO → FR ===");

  // 1. Renumber existing credit_note documents
  console.log("Renumbering financial_documents (ABONO-... → FR-...)...");
  const docsResult = await sql`
    UPDATE financial_documents
    SET number = 'FR-' || SUBSTRING(number FROM 7)
    WHERE type = 'credit_note'
      AND number LIKE 'ABONO-%'
    RETURNING id, number
  `;
  console.log(`  ✓ Renumbered ${docsResult.length} credit_note documents`);
  if (docsResult.length > 0) {
    (docsResult as unknown as { id: number; number: string }[])
      .slice(0, 10)
      .forEach((r) => {
        console.log(`     #${r.id} → ${r.number}`);
      });
    if (docsResult.length > 10) console.log(`     …and ${docsResult.length - 10} more`);
  }

  // 2. Update the per-organization preference for any tenant still on the old default
  console.log("Updating organization_finance_settings.credit_note_prefix...");
  const settingsResult = await sql`
    UPDATE organization_finance_settings
    SET credit_note_prefix = 'FR'
    WHERE credit_note_prefix = 'ABONO'
    RETURNING organization_id
  `;
  console.log(`  ✓ Updated ${settingsResult.length} organization settings`);

  console.log("\n✅ Migration 0061 applied successfully!");
}

main().catch((err) => {
  console.error("Migration 0061 FAILED:", err);
  process.exit(1);
});
