import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== Link Existing Providers to Vendor Records ===\n");

  // Find all providerEventAccess records without a vendorId
  const unlinked = await sql`
    SELECT pea.id, pea.provider_org_id, pea.event_id, pea.planner_org_id,
           o.name as provider_name, o.provider_category, o.fiscal_email, o.phone, o.website, o.address
    FROM provider_event_access pea
    JOIN organizations o ON o.id = pea.provider_org_id
    WHERE pea.vendor_id IS NULL
  `;

  console.log(`Found ${unlinked.length} unlinked provider access records\n`);

  let created = 0;
  let linked = 0;
  let eventVendorsCreated = 0;

  for (const record of unlinked) {
    // Check if vendor already exists for this provider org in the planner's org
    const existing = await sql`
      SELECT id FROM vendors
      WHERE organization_id = ${record.planner_org_id}
        AND provider_org_id = ${record.provider_org_id}
      LIMIT 1
    `;

    let vendorId: number;

    if (existing.length > 0) {
      vendorId = existing[0].id;
      console.log(`  Found existing vendor #${vendorId} for provider "${record.provider_name}"`);
    } else {
      // Create vendor record
      const [newVendor] = await sql`
        INSERT INTO vendors (organization_id, name, category, email, phone, website, address, provider_org_id)
        VALUES (
          ${record.planner_org_id},
          ${record.provider_name},
          ${record.provider_category},
          ${record.fiscal_email},
          ${record.phone},
          ${record.website},
          ${record.address},
          ${record.provider_org_id}
        )
        RETURNING id
      `;
      vendorId = newVendor.id;
      created++;
      console.log(`  Created vendor #${vendorId} for provider "${record.provider_name}"`);
    }

    // Update providerEventAccess with vendorId
    await sql`
      UPDATE provider_event_access
      SET vendor_id = ${vendorId}
      WHERE id = ${record.id}
    `;
    linked++;

    // Create eventVendors if missing
    const existingEV = await sql`
      SELECT id FROM event_vendors
      WHERE event_id = ${record.event_id} AND vendor_id = ${vendorId}
      LIMIT 1
    `;

    if (existingEV.length === 0) {
      await sql`
        INSERT INTO event_vendors (event_id, vendor_id, service, status)
        VALUES (${record.event_id}, ${vendorId}, ${record.provider_category}, 'confirmed')
      `;
      eventVendorsCreated++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Vendors created: ${created}`);
  console.log(`Access records linked: ${linked}`);
  console.log(`Event vendor records created: ${eventVendorsCreated}`);
  console.log("\n✅ Done!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  });
