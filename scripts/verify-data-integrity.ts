import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function verify() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("\n🔍 Verifying data integrity post-fix\n");

  // 1. Check organizations with fiscal data
  console.log("=== Organizations with fiscal data ===");
  const orgsWithFiscal = await sql`
    SELECT id, name, slug, fiscal_name, tax_id, fiscal_address, fiscal_city, fiscal_country, fiscal_email, phone, website
    FROM organizations
    WHERE fiscal_name IS NOT NULL OR tax_id IS NOT NULL OR phone IS NOT NULL
    ORDER BY name
  `;
  console.log(`Found ${orgsWithFiscal.length} orgs with fiscal/contact data:`);
  for (const o of orgsWithFiscal) {
    console.log(`  ${o.name} (${o.slug}):`);
    if (o.fiscal_name) console.log(`    fiscal_name: ${o.fiscal_name}`);
    if (o.tax_id) console.log(`    tax_id: ${o.tax_id}`);
    if (o.fiscal_address) console.log(`    fiscal_address: ${o.fiscal_address}`);
    if (o.fiscal_city) console.log(`    fiscal_city: ${o.fiscal_city}`);
    if (o.fiscal_country) console.log(`    fiscal_country: ${o.fiscal_country}`);
    if (o.fiscal_email) console.log(`    fiscal_email: ${o.fiscal_email}`);
    if (o.phone) console.log(`    phone: ${o.phone}`);
    if (o.website) console.log(`    website: ${o.website}`);
  }

  // 2. Check organization_finance_settings
  console.log("\n=== Finance settings ===");
  const finSettings = await sql`
    SELECT ofs.organization_id, o.name, ofs.company_name, ofs.tax_id, ofs.fiscal_address
    FROM organization_finance_settings ofs
    JOIN organizations o ON o.id = ofs.organization_id
    ORDER BY o.name
  `;
  console.log(`Found ${finSettings.length} finance settings records:`);
  for (const s of finSettings) {
    console.log(`  ${s.name}: company=${s.company_name || 'NULL'}, tax_id=${s.tax_id || 'NULL'}, address=${s.fiscal_address || 'NULL'}`);
  }

  // 3. Check users table
  console.log("\n=== Users with profile data ===");
  const usersWithData = await sql`
    SELECT id, name, email, image
    FROM users
    WHERE name IS NOT NULL
    ORDER BY name
    LIMIT 20
  `;
  console.log(`Showing ${usersWithData.length} users:`);
  for (const u of usersWithData) {
    console.log(`  ${u.name} (${u.email}) ${u.image ? '[has image]' : ''}`);
  }

  // 4. Check total counts
  console.log("\n=== Data counts ===");
  const counts = await sql`
    SELECT 
      (SELECT count(*) FROM organizations) as orgs,
      (SELECT count(*) FROM users) as users,
      (SELECT count(*) FROM organization_members) as memberships,
      (SELECT count(*) FROM events) as events,
      (SELECT count(*) FROM tasks) as tasks,
      (SELECT count(*) FROM contacts) as contacts,
      (SELECT count(*) FROM financial_documents) as fin_docs
  `;
  const c = counts[0];
  console.log(`  Organizations: ${c.orgs}`);
  console.log(`  Users: ${c.users}`);
  console.log(`  Memberships: ${c.memberships}`);
  console.log(`  Events: ${c.events}`);
  console.log(`  Tasks: ${c.tasks}`);
  console.log(`  Contacts: ${c.contacts}`);
  console.log(`  Financial docs: ${c.fin_docs}`);

  // 5. Specifically check GOS SA (your org)
  console.log("\n=== Your org (GOS SA) details ===");
  const gos = await sql`
    SELECT * FROM organizations WHERE slug = 'german-gimenez-mjf1omgk'
  `;
  if (gos.length > 0) {
    const o = gos[0];
    console.log(`  Name: ${o.name}`);
    console.log(`  Phone: ${o.phone || 'NULL'}`);
    console.log(`  Website: ${o.website || 'NULL'}`);
    console.log(`  Fiscal Name: ${o.fiscal_name || 'NULL'}`);
    console.log(`  Tax ID: ${o.tax_id || 'NULL'}`);
    console.log(`  Fiscal Address: ${o.fiscal_address || 'NULL'}`);
    console.log(`  Fiscal City: ${o.fiscal_city || 'NULL'}`);
    console.log(`  Fiscal Country: ${o.fiscal_country || 'NULL'}`);
    console.log(`  Fiscal Email: ${o.fiscal_email || 'NULL'}`);
    console.log(`  org_type: ${o.org_type}`);
  }

  console.log("\n✅ Verification complete\n");
  process.exit(0);
}

verify().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
