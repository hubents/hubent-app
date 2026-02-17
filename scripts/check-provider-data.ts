import "dotenv/config";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const providers = await sql`
    SELECT id, name, org_type, plan_id, status, verification_status, slug, provider_category
    FROM organizations 
    WHERE org_type = 'provider'
    ORDER BY id
  `;
  console.log("Providers in DB:");
  console.log(JSON.stringify(providers, null, 2));

  const allOrgTypes = await sql`
    SELECT org_type, count(*) as cnt FROM organizations GROUP BY org_type
  `;
  console.log("\nOrg types distribution:");
  console.log(JSON.stringify(allOrgTypes, null, 2));
}

main().catch(console.error);
