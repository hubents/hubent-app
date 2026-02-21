import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Updating client role to eventScoped...");

  const result = await sql`UPDATE roles SET event_scoped = true WHERE slug = 'client' AND (event_scoped IS NULL OR event_scoped = false)`;
  console.log("✅ Client role updated:", result);

  // Verify
  const roles = await sql`SELECT slug, event_scoped FROM roles WHERE slug = 'client'`;
  console.log("Client role:", roles);

  console.log("Done!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  });
