import "dotenv/config";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { ilike, eq, or, and, sql, desc } from "drizzle-orm";

async function main() {
  console.log("\n=== Diagnose Providers Search ===\n");

  // 1. Search for NapsixAI by name
  console.log("--- Search: organizations matching 'napsix' ---");
  const matches = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      orgType: organizations.orgType,
      verificationStatus: organizations.verificationStatus,
      verifiedAt: organizations.verifiedAt,
      status: organizations.status,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .where(ilike(organizations.name, "%napsix%"));

  for (const org of matches) {
    console.log(`  id=${org.id} name="${org.name}" orgType=${org.orgType} verification=${org.verificationStatus} verifiedAt=${org.verifiedAt} status=${org.status} created=${org.createdAt}`);
  }
  console.log(`  Total: ${matches.length}\n`);

  // 2. Simulate what /api/providers returns for search=napsix
  console.log("--- Simulating /api/providers?search=napsix&limit=20 ---");
  const conditions = [
    or(eq(organizations.orgType, "provider"), eq(organizations.orgType, "tenant"))!,
    sql`(${ilike(organizations.name, "%napsix%")} OR ${ilike(organizations.instagramHandle, "%napsix%")} OR ${ilike(organizations.description, "%napsix%")})`,
  ];

  const results = await db
    .select({ id: organizations.id, name: organizations.name, orgType: organizations.orgType, verificationStatus: organizations.verificationStatus, verifiedAt: organizations.verifiedAt, status: organizations.status })
    .from(organizations)
    .where(and(...conditions))
    .orderBy(desc(organizations.verifiedAt))
    .limit(20);

  for (const r of results) {
    console.log(`  id=${r.id} name="${r.name}" orgType=${r.orgType} verified=${r.verificationStatus} verifiedAt=${r.verifiedAt} status=${r.status}`);
  }
  console.log(`  Total returned: ${results.length}\n`);

  // 3. Check if NapsixAI is excluded by any hidden filter
  const napsixAI = matches.find(m => m.name?.toLowerCase().includes("napsixai"));
  if (napsixAI) {
    console.log(`--- NapsixAI Provider found: id=${napsixAI.id} ---`);
    console.log(`  orgType: ${napsixAI.orgType} (needs "provider" or "tenant")`);
    console.log(`  verificationStatus: ${napsixAI.verificationStatus}`);
    console.log(`  verifiedAt: ${napsixAI.verifiedAt}`);
    console.log(`  status: ${napsixAI.status}`);
    
    const inResults = results.some(r => r.id === napsixAI.id);
    console.log(`  In simulated results: ${inResults ? "YES" : "NO -- THIS IS THE BUG"}`);
  } else {
    console.log("--- NapsixAI Provider NOT FOUND in organizations table ---");
  }

  // 4. Show all orgTypes in the system
  console.log("\n--- All distinct orgTypes ---");
  const types = await db.execute(sql`SELECT DISTINCT org_type, COUNT(*) as cnt FROM organizations GROUP BY org_type`);
  console.log(JSON.stringify(types.rows, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
