import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function checkTable() {
  try {
    // Check columns
    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'task_participants' 
      ORDER BY ordinal_position
    `);
    console.log("Columns in task_participants:");
    console.log(JSON.stringify(columns.rows, null, 2));

    // Check constraints
    const constraints = await db.execute(sql`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'task_participants'::regclass
    `);
    console.log("\nConstraints:");
    console.log(JSON.stringify(constraints.rows, null, 2));

  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

checkTable();
