import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== Migration 0067: Product warehouse stock (multi-almacén) ===");

  // 1. Tabla de stock por almacén
  await sql`
    CREATE TABLE IF NOT EXISTS "product_warehouse_stock" (
      "id"              serial PRIMARY KEY,
      "organization_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "product_id"      integer NOT NULL REFERENCES "product_catalog"("id") ON DELETE CASCADE,
      "warehouse_id"    integer NOT NULL REFERENCES "warehouses"("id") ON DELETE CASCADE,
      "quantity"        integer NOT NULL DEFAULT 0,
      "updated_at"      timestamp DEFAULT now(),
      UNIQUE("product_id", "warehouse_id")
    )
  `;
  console.log("  ✓ Tabla product_warehouse_stock creada");

  // 2. Índices de consulta
  await sql`
    CREATE INDEX IF NOT EXISTS idx_pws_org
      ON product_warehouse_stock(organization_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_pws_product
      ON product_warehouse_stock(product_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_pws_warehouse
      ON product_warehouse_stock(warehouse_id)
  `;
  console.log("  ✓ Índices creados");

  // 3. Poblar con datos existentes (productos físicos con stock y almacén asignado)
  const inserted = await sql`
    INSERT INTO product_warehouse_stock
      (organization_id, product_id, warehouse_id, quantity)
    SELECT
      organization_id,
      id,
      warehouse_id,
      COALESCE(stock, 0)
    FROM product_catalog
    WHERE warehouse_id IS NOT NULL
      AND type != 'servicio'
      AND COALESCE(stock, 0) > 0
    ON CONFLICT (product_id, warehouse_id) DO NOTHING
    RETURNING id
  `;
  console.log(`  ✓ ${inserted.length} registros de stock inicial migrados`);

  console.log("\n✅ Migration 0067 applied successfully!");
}

main().catch((err) => {
  console.error("Migration 0067 FAILED:", err);
  process.exit(1);
});
