import "dotenv/config";
import { db } from "../src/db";
import { organizations, organizationFinanceSettings } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function migrateFiscalData() {
  console.log("Starting fiscal data migration...");

  // Get all finance settings
  const allSettings = await db.select().from(organizationFinanceSettings);
  console.log(`Found ${allSettings.length} organization finance settings to migrate`);

  for (const settings of allSettings) {
    console.log(`Migrating org ${settings.organizationId}...`);
    
    await db.update(organizations)
      .set({
        fiscalName: settings.companyName,
        taxId: settings.taxId,
        fiscalAddress: settings.fiscalAddress,
        fiscalCity: settings.fiscalCity,
        fiscalPostalCode: settings.fiscalPostalCode,
        fiscalCountry: settings.fiscalCountry || "España",
        fiscalEmail: settings.fiscalEmail,
        fiscalPhone: settings.fiscalPhone,
      })
      .where(eq(organizations.id, settings.organizationId));
  }

  console.log("Migration complete!");
  process.exit(0);
}

migrateFiscalData().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
