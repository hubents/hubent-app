import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config();

interface Check { migration: string; label: string }

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  
  console.log("🔍 Validating database migrations...\n");
  
  const failed: Check[] = [];

  async function check(label: string, migration: string, fn: () => Promise<unknown>) {
    try {
      await fn();
      console.log(`  ✅ ${label}`);
    } catch {
      console.log(`  ❌ ${label} (migration ${migration})`);
      failed.push({ label, migration });
    }
  }

  await check("financial_documents.source_document_id", "0037", () => sql`SELECT source_document_id FROM financial_documents LIMIT 0`);
  await check("financial_documents.source_org_id", "0037", () => sql`SELECT source_org_id FROM financial_documents LIMIT 0`);
  await check("payment_records.status", "0037", () => sql`SELECT status FROM payment_records LIMIT 0`);
  await check("payment_records.source_payment_id", "0037", () => sql`SELECT source_payment_id FROM payment_records LIMIT 0`);
  await check("vendors.provider_org_id", "0037", () => sql`SELECT provider_org_id FROM vendors LIMIT 0`);
  await check("roles.event_scoped", "0034", () => sql`SELECT event_scoped FROM roles LIMIT 0`);
  await check("event_participants.permissions", "0034", () => sql`SELECT permissions FROM event_participants LIMIT 0`);

  // Check roles have permissions
  const roleCounts = await sql`
    SELECT r.slug, COUNT(rp.permission_id) as perm_count
    FROM roles r
    LEFT JOIN role_permissions rp ON r.id = rp.role_id
    WHERE r.is_system = true
    GROUP BY r.id, r.slug
    ORDER BY r.slug
  `;

  console.log("\n📋 System roles permission count:");
  const emptyRoles: string[] = [];
  for (const r of roleCounts) {
    const count = parseInt(String(r.perm_count));
    const icon = count > 0 ? "✅" : "⚠️";
    console.log(`  ${icon} ${r.slug}: ${count} permissions`);
    if (count === 0) emptyRoles.push(String(r.slug));
  }

  console.log("");
  
  if (failed.length > 0) {
    const migrations = [...new Set(failed.map(f => f.migration))];
    console.error(`❌ FAILED: Missing migrations: ${migrations.join(", ")}`);
    console.error("   Run the corresponding apply-migration scripts before deploying.");
    process.exit(1);
  }
  
  if (emptyRoles.length > 0) {
    console.warn(`⚠️  WARNING: Roles with no permissions: ${emptyRoles.join(", ")}`);
    console.warn("   Consider running seed-roles or assigning permissions manually.");
  }
  
  console.log("✅ All migration checks passed!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Validation failed:", err);
  process.exit(1);
});
