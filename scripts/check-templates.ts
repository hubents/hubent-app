import "dotenv/config";
import { db } from "../src/db";
import { eventTemplates, taskTemplates } from "../src/db/schema";

async function check() {
  const templates = await db.select().from(eventTemplates);
  console.log("=== Templates en BD ===");
  console.log(`Total: ${templates.length}`);
  
  const globalTemplates = templates.filter(t => t.isGlobal);
  console.log(`\nTemplates globales: ${globalTemplates.length}`);
  globalTemplates.forEach(t => console.log(`  - [${t.id}] ${t.name}`));
  
  const orgTemplates = templates.filter(t => !t.isGlobal);
  console.log(`\nTemplates de organización: ${orgTemplates.length}`);
  orgTemplates.forEach(t => console.log(`  - [${t.id}] ${t.name} (org: ${t.organizationId})`));

  // Check task templates
  const tasks = await db.select().from(taskTemplates);
  console.log(`\n=== Task Templates ===`);
  console.log(`Total: ${tasks.length}`);
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
