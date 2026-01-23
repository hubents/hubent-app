import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function runMigration() {
  const sql = neon(process.env.DATABASE_URL!);
  
  console.log("Running migration 0023_add_template_checklists...");
  
  try {
    // Add htmlContent column to task_templates
    await sql`ALTER TABLE "task_templates" ADD COLUMN IF NOT EXISTS "html_content" text`;
    console.log("✅ Added html_content column to task_templates");
    
    // Create task_template_checklists table
    await sql`
      CREATE TABLE IF NOT EXISTS "task_template_checklists" (
        "id" serial PRIMARY KEY,
        "task_template_id" integer NOT NULL REFERENCES "task_templates"("id") ON DELETE CASCADE,
        "title" text NOT NULL,
        "sort_order" integer DEFAULT 0
      )
    `;
    console.log("✅ Created task_template_checklists table");
    
    // Create index
    await sql`CREATE INDEX IF NOT EXISTS "idx_task_template_checklists_task_template_id" ON "task_template_checklists"("task_template_id")`;
    console.log("✅ Created index");
    
    console.log("\n🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

runMigration();
