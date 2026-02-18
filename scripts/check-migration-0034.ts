import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function check() {
  const sql = neon(process.env.DATABASE_URL!);
  
  console.log("Checking migration 0034...\n");

  // Check event_scoped column on roles
  const cols1 = await sql`
    SELECT column_name, data_type, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'roles' AND column_name = 'event_scoped'
  `;
  console.log("roles.event_scoped:", cols1.length > 0 ? "EXISTS ✅" : "MISSING ❌");
  if (cols1.length > 0) console.log("  ", cols1[0]);

  // Check permissions column on event_participants
  const cols2 = await sql`
    SELECT column_name, data_type, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'event_participants' AND column_name = 'permissions'
  `;
  console.log("event_participants.permissions:", cols2.length > 0 ? "EXISTS ✅" : "MISSING ❌");
  if (cols2.length > 0) console.log("  ", cols2[0]);

  // Check eventScoped roles
  const scopedRoles = await sql`
    SELECT slug, event_scoped FROM roles WHERE event_scoped = true
  `;
  console.log("\nEvent-scoped roles:", scopedRoles.length > 0 ? scopedRoles.map(r => r.slug).join(", ") : "NONE");
}

check().catch(console.error);
