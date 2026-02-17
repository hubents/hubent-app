import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Updating system roles with eventScoped flag...\n");

  // Update assistant and viewer to eventScoped = true
  await sql`UPDATE roles SET event_scoped = true WHERE slug IN ('assistant', 'viewer') AND is_system = true`;

  // Verify
  const result = await sql`SELECT slug, event_scoped FROM roles WHERE is_system = true ORDER BY id`;
  console.table(result);

  console.log("\n✅ Done");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
