import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  // Check financial_documents columns
  const fdCols = await sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'financial_documents' 
    AND column_name IN ('source_document_id','source_org_id') 
    ORDER BY column_name
  `;
  console.log("financial_documents new columns:", fdCols.map((x: any) => x.column_name));

  // Check payment_records columns
  const prCols = await sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'payment_records' 
    AND column_name IN ('status','source_payment_id','source_org_id','attachment_url') 
    ORDER BY column_name
  `;
  console.log("payment_records new columns:", prCols.map((x: any) => x.column_name));

  // Check vendors columns
  const vCols = await sql`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'vendors' 
    AND column_name = 'provider_org_id'
  `;
  console.log("vendors.provider_org_id exists:", vCols.length > 0);

  // Check document count
  const docs = await sql`SELECT count(*) as cnt FROM financial_documents`;
  console.log("Total documents in DB:", docs[0].cnt);

  // Check if getDocuments query works (the one that was failing)
  const testQuery = await sql`
    SELECT fd.id, fd.number, fd.type, fd.status, v.name as vendor_name
    FROM financial_documents fd
    LEFT JOIN vendors v ON fd.vendor_id = v.id
    WHERE fd.source_document_id IS NULL
    ORDER BY fd.created_at DESC
    LIMIT 5
  `;
  console.log("getDocuments query works! First 5 docs:", testQuery.map((d: any) => `${d.number} (${d.type})`));

  // Check role permissions for finance
  const financePerms = await sql`
    SELECT r.slug as role, p.slug as permission 
    FROM role_permissions rp
    JOIN roles r ON rp.role_id = r.id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE p.slug LIKE 'finance:%'
    ORDER BY r.slug, p.slug
  `;
  console.log("\nRoles with finance permissions:");
  if (financePerms.length === 0) {
    console.log("  ⚠️  NO ROLES have finance permissions assigned!");
  } else {
    for (const fp of financePerms) {
      console.log(`  ${fp.role} → ${fp.permission}`);
    }
  }

  // Check all roles
  const allRoles = await sql`SELECT id, slug, name, event_scoped FROM roles ORDER BY id`;
  console.log("\nAll roles:");
  for (const r of allRoles) {
    const perms = await sql`
      SELECT p.slug FROM role_permissions rp 
      JOIN permissions p ON rp.permission_id = p.id 
      WHERE rp.role_id = ${r.id}
    `;
    const permList = perms.map((p: any) => p.slug).join(", ") || "(none)";
    console.log(`  [${r.id}] ${r.slug} (${r.name}) eventScoped=${r.event_scoped} → ${permList}`);
  }

  // Check org members and their roles
  const members = await sql`
    SELECT om.user_id, u.name, u.email, r.slug as role, o.name as org_name, o.id as org_id
    FROM organization_members om
    JOIN users u ON om.user_id = u.id
    JOIN roles r ON om.role_id = r.id
    JOIN organizations o ON om.organization_id = o.id
    ORDER BY o.id, r.slug
  `;
  console.log("\nOrg members:");
  for (const m of members) {
    console.log(`  [org ${m.org_id}: ${m.org_name}] ${m.name} (${m.email}) → role: ${m.role}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  });
