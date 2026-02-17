import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import { db } from "../src/db";
import { organizations } from "../src/db/schema";
import { eq, desc, sql } from "drizzle-orm";

async function main() {
  console.log("=== Testing providers query (same as API) ===\n");

  // Test 1: Exact same query as the API
  const providers = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      orgType: organizations.orgType,
      verificationStatus: organizations.verificationStatus,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .where(eq(organizations.orgType, "provider"))
    .orderBy(desc(organizations.createdAt));

  console.log(`Drizzle query result: ${providers.length} providers`);
  for (const p of providers) {
    console.log(`  [${p.id}] ${p.name} orgType=${p.orgType} verification=${p.verificationStatus}`);
  }

  // Test 2: Raw SQL for comparison
  const rawProviders = await db.execute(
    sql`SELECT id, name, org_type, verification_status FROM organizations WHERE org_type = 'provider'`
  );
  console.log(`\nRaw SQL result: ${rawProviders.rows.length} providers`);
  for (const p of rawProviders.rows) {
    console.log(`  [${p.id}] ${p.name} org_type=${p.org_type} verification=${p.verification_status}`);
  }

  // Test 3: All org types
  const allOrgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      orgType: organizations.orgType,
    })
    .from(organizations);

  const types = new Map<string | null, number>();
  for (const o of allOrgs) {
    types.set(o.orgType, (types.get(o.orgType) || 0) + 1);
  }
  console.log("\nOrg type distribution (Drizzle):");
  for (const [t, c] of types) {
    console.log(`  ${t}: ${c}`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
