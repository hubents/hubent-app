import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'event_participants' AND column_name = 'contact_id'`;
  
  if (cols.length > 0) {
    console.log("✅ contact_id ya existe en event_participants");
    return;
  }
  
  await sql`ALTER TABLE event_participants ADD COLUMN contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE`;
  console.log("✅ contact_id agregado a event_participants");
}

run().catch(console.error);
