/**
 * Script de migración: Vincular vendors existentes con contacts
 * 
 * Este script busca vendors sin contactId y:
 * 1. Busca un contact empresa con el mismo nombre/email
 * 2. Si existe, vincula vendor.contactId y contact.vendorId
 * 3. Si no existe, crea un contact empresa y lo vincula
 * 
 * Ejecutar: npx tsx scripts/migrate-vendors-to-contacts.ts
 */

import { db } from "../src/db";
import { vendors, contacts } from "../src/db/schema";
import { eq, and, isNull, or, ilike } from "drizzle-orm";

async function migrateVendorsToContacts() {
  console.log("🚀 Iniciando migración de vendors a contacts...\n");

  // Get all vendors without contactId
  const vendorsWithoutContact = await db
    .select()
    .from(vendors)
    .where(isNull(vendors.contactId));

  console.log(`📊 Encontrados ${vendorsWithoutContact.length} vendors sin contactId vinculado\n`);

  let linked = 0;
  let created = 0;
  let errors = 0;

  for (const vendor of vendorsWithoutContact) {
    try {
      console.log(`\n🔍 Procesando vendor: ${vendor.name} (ID: ${vendor.id})`);

      // Try to find matching contact by name or email
      const matchingContacts = await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.organizationId, vendor.organizationId),
            eq(contacts.type, "company"),
            isNull(contacts.deletedAt),
            or(
              ilike(contacts.name, vendor.name),
              vendor.email ? eq(contacts.email, vendor.email) : undefined
            )
          )
        )
        .limit(1);

      if (matchingContacts.length > 0) {
        const contact = matchingContacts[0];
        console.log(`  ✅ Match encontrado: Contact ID ${contact.id} (${contact.name})`);

        // Link bidirectionally
        await db.update(vendors)
          .set({ contactId: contact.id })
          .where(eq(vendors.id, vendor.id));

        await db.update(contacts)
          .set({ 
            vendorId: vendor.id,
            isVendor: true,
            vendorCategory: vendor.category,
          })
          .where(eq(contacts.id, contact.id));

        console.log(`  🔗 Vinculados: vendor.contactId = ${contact.id}, contact.vendorId = ${vendor.id}`);
        linked++;
      } else {
        console.log(`  ⚠️ No se encontró contact existente, creando nuevo...`);

        // Create new contact
        const [newContact] = await db
          .insert(contacts)
          .values({
            organizationId: vendor.organizationId,
            type: "company",
            name: vendor.name,
            email: vendor.email,
            phone: vendor.phone,
            website: vendor.website,
            address: vendor.address,
            notes: vendor.notes,
            isVendor: true,
            vendorCategory: vendor.category,
            vendorId: vendor.id,
            createdBy: vendor.createdBy,
          })
          .returning();

        // Update vendor with contactId
        await db.update(vendors)
          .set({ contactId: newContact.id })
          .where(eq(vendors.id, vendor.id));

        console.log(`  ✨ Creado contact ID ${newContact.id} y vinculado`);
        created++;
      }
    } catch (error) {
      console.error(`  ❌ Error procesando vendor ${vendor.id}:`, error);
      errors++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("📈 RESUMEN DE MIGRACIÓN");
  console.log("=".repeat(50));
  console.log(`  Total vendors procesados: ${vendorsWithoutContact.length}`);
  console.log(`  Vinculados a contacts existentes: ${linked}`);
  console.log(`  Nuevos contacts creados: ${created}`);
  console.log(`  Errores: ${errors}`);
  console.log("=".repeat(50));

  process.exit(0);
}

migrateVendorsToContacts().catch((error) => {
  console.error("Error fatal en migración:", error);
  process.exit(1);
});
