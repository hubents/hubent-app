import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("\n🔧 Aplicando migraciones faltantes\n");

  // ============================================
  // 1. CREATE provider_event_access TABLE
  // ============================================
  console.log("1. Creando tabla provider_event_access...");

  const tableExists = await sql`
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'provider_event_access' AND table_schema = 'public'
  `;

  if ((tableExists as any[]).length > 0) {
    console.log("   ⏭️  Ya existe, saltando");
  } else {
    await sql`
      CREATE TABLE "provider_event_access" (
        "id" serial PRIMARY KEY NOT NULL,
        "provider_org_id" integer NOT NULL,
        "event_id" integer NOT NULL,
        "planner_org_id" integer NOT NULL,
        "vendor_id" integer,
        "invited_by" text,
        "status" text DEFAULT 'pending',
        "invited_at" timestamp DEFAULT now(),
        "accepted_at" timestamp
      )
    `;

    await sql`
      ALTER TABLE "provider_event_access" 
      ADD CONSTRAINT "provider_event_access_provider_org_id_organizations_id_fk" 
      FOREIGN KEY ("provider_org_id") REFERENCES "public"."organizations"("id") 
      ON DELETE no action ON UPDATE no action
    `;

    await sql`
      ALTER TABLE "provider_event_access" 
      ADD CONSTRAINT "provider_event_access_event_id_events_id_fk" 
      FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") 
      ON DELETE cascade ON UPDATE no action
    `;

    await sql`
      ALTER TABLE "provider_event_access" 
      ADD CONSTRAINT "provider_event_access_planner_org_id_organizations_id_fk" 
      FOREIGN KEY ("planner_org_id") REFERENCES "public"."organizations"("id") 
      ON DELETE no action ON UPDATE no action
    `;

    await sql`
      ALTER TABLE "provider_event_access" 
      ADD CONSTRAINT "provider_event_access_vendor_id_vendors_id_fk" 
      FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") 
      ON DELETE no action ON UPDATE no action
    `;

    await sql`
      ALTER TABLE "provider_event_access" 
      ADD CONSTRAINT "provider_event_access_invited_by_users_id_fk" 
      FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") 
      ON DELETE no action ON UPDATE no action
    `;

    console.log("   ✅ Tabla creada con FKs");
  }

  // ============================================
  // 2. FIX verification_status ENUM
  // ============================================
  console.log("\n2. Corrigiendo enum verification_status...");

  const enumValues = await sql`
    SELECT e.enumlabel 
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'verification_status'
    ORDER BY e.enumsortorder
  `;
  const currentValues = (enumValues as any[]).map((r: any) => r.enumlabel);
  console.log(`   Valores actuales: ${currentValues.join(", ")}`);

  if (!currentValues.includes("suspended")) {
    await sql`ALTER TYPE verification_status ADD VALUE 'suspended'`;
    console.log("   ✅ Agregado valor 'suspended'");
  } else {
    console.log("   ⏭️  'suspended' ya existe");
  }

  // Note: 'pending' extra value in DB is harmless — Drizzle won't use it
  // but removing enum values requires recreating the type (risky)
  if (currentValues.includes("pending")) {
    console.log("   ℹ️  'pending' existe en DB pero no en schema Drizzle (inofensivo, no se elimina)");
  }

  // ============================================
  // 3. VERIFICATION
  // ============================================
  console.log("\n3. Verificación post-migración...");

  const verifyTable = await sql`
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'provider_event_access' AND table_schema = 'public'
  `;
  console.log(`   provider_event_access: ${(verifyTable as any[]).length > 0 ? "✅ EXISTS" : "❌ MISSING"}`);

  const verifyEnum = await sql`
    SELECT e.enumlabel 
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'verification_status'
    ORDER BY e.enumsortorder
  `;
  const finalValues = (verifyEnum as any[]).map((r: any) => r.enumlabel);
  const hasSuspended = finalValues.includes("suspended");
  console.log(`   verification_status values: ${finalValues.join(", ")}`);
  console.log(`   'suspended' present: ${hasSuspended ? "✅" : "❌"}`);

  // Check FKs on provider_event_access
  const fks = await sql`
    SELECT constraint_name FROM information_schema.table_constraints 
    WHERE table_name = 'provider_event_access' AND constraint_type = 'FOREIGN KEY'
  `;
  console.log(`   provider_event_access FKs: ${(fks as any[]).length} constraints`);

  console.log("\n✅ Migración completada\n");
  process.exit(0);
}

migrate().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
