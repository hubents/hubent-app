import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function checkSchema() {
  const sql = neon(process.env.DATABASE_URL!);
  
  console.log("Checking database schema...\n");
  
  // Check task_templates columns
  console.log("=== task_templates columns ===");
  const taskTemplatesCols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'task_templates'
    ORDER BY ordinal_position
  `;
  console.table(taskTemplatesCols);
  
  // Check if task_template_checklists exists
  console.log("\n=== task_template_checklists table ===");
  const checklistsTable = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name = 'task_template_checklists'
  `;
  console.log("Exists:", checklistsTable.length > 0);
  
  if (checklistsTable.length > 0) {
    const checklistsCols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'task_template_checklists'
      ORDER BY ordinal_position
    `;
    console.table(checklistsCols);
  }
  
  // Check event_templates for event_type enum values
  console.log("\n=== event_type enum values ===");
  try {
    const enumValues = await sql`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'event_type')
    `;
    console.table(enumValues);
  } catch (e) {
    console.log("Could not fetch enum values:", e);
  }
  
  process.exit(0);
}

checkSchema().catch(e => {
  console.error("Error:", e);
  process.exit(1);
});
