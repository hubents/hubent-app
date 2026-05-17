#!/usr/bin/env node
/**
 * Demo seed script — inserts demo data for the logistics provider org (id=102)
 * Idempotent: skips tables that already have [DEMO] entries.
 */

const { neon } = require("@neondatabase/serverless");
const DATABASE_URL =
  "postgresql://neondb_owner:npg_MW5XBnO3dCTZ@ep-misty-cake-ah8l8jtr-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

const ORG_ID = 102;
const OWNER_ID = "ba569e4d-b5d3-412d-a9e8-21d320958984";

async function count(table, col) {
  const r = await sql`SELECT COUNT(*) AS cnt FROM ${sql.unsafe(table)} WHERE organization_id = ${ORG_ID} AND ${sql.unsafe(col)} ILIKE '[DEMO]%'`;
  return Number(r[0].cnt);
}

async function main() {
  console.log(`Seeding demo data for org ${ORG_ID}...\n`);

  // ── 1. Contacts ──────────────────────────────────────────────────────────────
  if (await count("contacts", "name") === 0) {
    const contacts = await sql`
      INSERT INTO contacts (organization_id, type, name, email, phone, city, state, country, notes, source, created_by, created_at, updated_at)
      VALUES
        (${ORG_ID}, 'company', '[DEMO] Florería Las Rosas SL', 'lasrosas@demo.test', '+34 611 123 456',
         'Marbella', 'Málaga', 'España',
         'Cliente demo — Florería especializada en bodas y eventos. Requiere transporte refrigerado.',
         'manual', ${OWNER_ID}, NOW(), NOW()),
        (${ORG_ID}, 'company', '[DEMO] Hotel Gran Marbella', 'eventos@hotel-demo.test', '+34 622 987 654',
         'Marbella', 'Málaga', 'España',
         'Cliente demo — Hotel 5 estrellas. Organiza 8-10 eventos/mes. Contacto: Ana Torres.',
         'manual', ${OWNER_ID}, NOW(), NOW())
      RETURNING id, name
    `;
    console.log("✓ Contacts:", contacts.map((c) => c.name));
  } else {
    console.log("→ Contacts already exist, skipping.");
  }

  // Get contact IDs
  const contactRows = await sql`
    SELECT id, name FROM contacts
    WHERE organization_id = ${ORG_ID} AND name ILIKE '[DEMO]%'
    ORDER BY id LIMIT 2
  `;
  const contactId1 = contactRows[0]?.id;
  const contactId2 = contactRows[1]?.id;

  // ── 2. Events ────────────────────────────────────────────────────────────────
  if (await count("events", "name") === 0) {
    const events = await sql`
      INSERT INTO events (organization_id, name, type, date, status, guest_count, budget, description, created_by, created_at, updated_at)
      VALUES
        (${ORG_ID}, '[DEMO] Boda García-Martínez', 'wedding', '2026-09-20 18:00:00',
         'confirmed', 180, 22000,
         'Demo — Montaje completo: mesas, sillas Tiffany, iluminación cálida. Entrega 19 sep.',
         ${OWNER_ID}, NOW(), NOW()),
        (${ORG_ID}, '[DEMO] Gala Corporativa TechSur', 'corporate', '2026-11-08 20:00:00',
         'draft', 250, 15000,
         'Demo — Alquiler de mobiliario y transporte. Requiere 3 furgones.',
         ${OWNER_ID}, NOW(), NOW())
      RETURNING id, name
    `;
    console.log("✓ Events:", events.map((e) => e.name));
  } else {
    console.log("→ Events already exist, skipping.");
  }

  // Get event IDs
  const eventRows = await sql`
    SELECT id, name FROM events
    WHERE organization_id = ${ORG_ID} AND name ILIKE '[DEMO]%'
    ORDER BY id LIMIT 2
  `;
  const eventId1 = eventRows[0]?.id;

  // ── 3. Warehouses ────────────────────────────────────────────────────────────
  const warehouseCount = await sql`SELECT COUNT(*) AS cnt FROM warehouses WHERE organization_id = ${ORG_ID} AND name ILIKE '[DEMO]%'`;
  if (Number(warehouseCount[0].cnt) === 0) {
    const warehouses = await sql`
      INSERT INTO warehouses (organization_id, name, type, location, capacity, manager, color, initials, is_active, created_at, updated_at)
      VALUES
        (${ORG_ID}, '[DEMO] Almacén Central Marbella', 'fijo',
         'Polígono Industrial Las Albarizas, Nave 12, Marbella', 500,
         'Carlos Ruiz', '#3B82F6', 'AC', true, NOW(), NOW()),
        (${ORG_ID}, '[DEMO] Furgón Auxiliar 1', 'movil',
         'Disponible — Base en Marbella', 80,
         'Miguel Fernández', '#10B981', 'F1', true, NOW(), NOW())
      RETURNING id, name
    `;
    console.log("✓ Warehouses:", warehouses.map((w) => w.name));
  } else {
    console.log("→ Warehouses already exist, skipping.");
  }

  // Get warehouse IDs
  const warehouseRows = await sql`
    SELECT id, name FROM warehouses
    WHERE organization_id = ${ORG_ID} AND name ILIKE '[DEMO]%'
    ORDER BY id LIMIT 2
  `;
  const warehouseId1 = warehouseRows[0]?.id;
  const warehouseId2 = warehouseRows[1]?.id;

  // ── 4. Products ──────────────────────────────────────────────────────────────
  const productCount = await sql`SELECT COUNT(*) AS cnt FROM product_catalog WHERE organization_id = ${ORG_ID} AND name ILIKE '[DEMO]%'`;
  if (Number(productCount[0].cnt) === 0) {
    const products = await sql`
      INSERT INTO product_catalog (organization_id, sku, name, description, category, unit_price, unit, type, subtype, stock, stock_min, warehouse_id, color, initials, is_active, created_at, updated_at)
      VALUES
        (${ORG_ID}, 'DEMO-SIL-001', '[DEMO] Silla Tiffany Blanca',
         'Silla Tiffany de resina blanca para eventos. Ideal para bodas y banquetes.',
         'Mobiliario', 3.50, 'ud', 'fisico', 'alquiler', 120, 20,
         ${warehouseId1}, '#F8FAFC', 'ST', true, NOW(), NOW()),
        (${ORG_ID}, 'DEMO-MES-001', '[DEMO] Mesa Redonda 180cm',
         'Mesa redonda de 180cm de diámetro. Cubre 10 personas con decoración estándar.',
         'Mobiliario', 18.00, 'ud', 'fisico', 'alquiler', 30, 5,
         ${warehouseId1}, '#FEF9C3', 'MR', true, NOW(), NOW()),
        (${ORG_ID}, 'DEMO-MNT-001', '[DEMO] Servicio Montaje Evento',
         'Servicio completo de montaje y desmontaje de mobiliario en el venue.',
         'Servicios', 350.00, 'evento', 'servicio', 'servicio', NULL, NULL,
         NULL, '#E0F2FE', 'SV', true, NOW(), NOW())
      RETURNING id, name
    `;
    console.log("✓ Products:", products.map((p) => p.name));
  } else {
    console.log("→ Products already exist, skipping.");
  }

  // Get product IDs
  const productRows = await sql`
    SELECT id, name FROM product_catalog
    WHERE organization_id = ${ORG_ID} AND name ILIKE '[DEMO]%'
    ORDER BY id LIMIT 3
  `;
  const productId1 = productRows[0]?.id;
  const productId2 = productRows[1]?.id;
  const productId3 = productRows[2]?.id;

  // ── 5. Stock movements ───────────────────────────────────────────────────────
  const movCount = await sql`SELECT COUNT(*) AS cnt FROM stock_movements WHERE organization_id = ${ORG_ID} AND reference ILIKE 'DEMO-%'`;
  if (Number(movCount[0].cnt) === 0 && productId1 && warehouseId1) {
    await sql`
      INSERT INTO stock_movements (organization_id, type, product_id, quantity, date, warehouse_id, reference, notes, created_at)
      VALUES
        (${ORG_ID}, 'entrada', ${productId1}, 120, '2026-01-10', ${warehouseId1},
         'DEMO-ENT-001', 'Stock inicial demo — Sillas Tiffany', NOW()),
        (${ORG_ID}, 'entrada', ${productId2}, 30, '2026-01-10', ${warehouseId1},
         'DEMO-ENT-002', 'Stock inicial demo — Mesas Redondas', NOW()),
        (${ORG_ID}, 'salida', ${productId1}, 60, '2026-03-15', ${warehouseId1},
         'DEMO-SAL-001', 'Entrega evento demo Boda García-Martínez', NOW()),
        (${ORG_ID}, 'devolucion', ${productId1}, 60, '2026-03-17', ${warehouseId1},
         'DEMO-DEV-001', 'Devolución tras evento demo', NOW())
    `;
    console.log("✓ Stock movements inserted.");
  } else {
    console.log("→ Stock movements already exist or no products, skipping.");
  }

  // ── 6. Financial Documents — 2 Facturas ─────────────────────────────────────
  const invoiceCount = await sql`
    SELECT COUNT(*) AS cnt FROM financial_documents
    WHERE organization_id = ${ORG_ID} AND number ILIKE 'DEMO-FAC%'
  `;
  if (Number(invoiceCount[0].cnt) === 0) {
    const inv1 = await sql`
      INSERT INTO financial_documents (organization_id, type, number, status, contact_id, event_id,
        issue_date, due_date, subtotal, tax_amount, total, currency, notes, created_by, created_at, updated_at)
      VALUES
        (${ORG_ID}, 'invoice', 'DEMO-FAC-2026-001', 'paid',
         ${contactId1 || null}, ${eventId1 || null},
         '2026-03-20', '2026-04-20', 1890.00, 396.90, 2286.90, 'EUR',
         'Demo — Alquiler de 60 sillas Tiffany + 6 mesas + montaje. Boda García-Martínez.',
         ${OWNER_ID}, NOW(), NOW()),
        (${ORG_ID}, 'invoice', 'DEMO-FAC-2026-002', 'sent',
         ${contactId2 || null}, null,
         '2026-04-05', '2026-05-05', 3200.00, 672.00, 3872.00, 'EUR',
         'Demo — Servicio integral de mobiliario para gala corporativa TechSur.',
         ${OWNER_ID}, NOW(), NOW())
      RETURNING id, number
    `;

    // Insert line items for invoice 1
    if (inv1[0]?.id && productId1 && productId2 && productId3) {
      await sql`
        INSERT INTO document_items (document_id, product_id, description, quantity, unit_price, tax_rate, total, sort_order)
        VALUES
          (${inv1[0].id}, ${productId1}, '[DEMO] Silla Tiffany Blanca — alquiler', 60, 3.50, 21, 210.00, 1),
          (${inv1[0].id}, ${productId2}, '[DEMO] Mesa Redonda 180cm — alquiler', 6, 18.00, 21, 108.00, 2),
          (${inv1[0].id}, ${productId3}, '[DEMO] Servicio Montaje Evento', 1, 350.00, 21, 350.00, 3)
      `;
    }

    console.log("✓ Invoices:", inv1.map((d) => d.number));
  } else {
    console.log("→ Invoices already exist, skipping.");
  }

  // ── 7. Financial Documents — 2 Presupuestos ──────────────────────────────────
  const quoteCount = await sql`
    SELECT COUNT(*) AS cnt FROM financial_documents
    WHERE organization_id = ${ORG_ID} AND number ILIKE 'DEMO-PRE%'
  `;
  if (Number(quoteCount[0].cnt) === 0) {
    const quotes = await sql`
      INSERT INTO financial_documents (organization_id, type, number, status, contact_id,
        issue_date, valid_until, subtotal, tax_amount, total, currency, notes, created_by, created_at, updated_at)
      VALUES
        (${ORG_ID}, 'quote', 'DEMO-PRE-2026-001', 'sent',
         ${contactId1 || null},
         '2026-05-01', '2026-06-01', 4500.00, 945.00, 5445.00, 'EUR',
         'Demo — Propuesta completa para temporada verano. Incluye mesas, sillas y montaje para 3 eventos.',
         ${OWNER_ID}, NOW(), NOW()),
        (${ORG_ID}, 'quote', 'DEMO-PRE-2026-002', 'draft',
         ${contactId2 || null},
         '2026-05-10', '2026-06-10', 2100.00, 441.00, 2541.00, 'EUR',
         'Demo — Presupuesto para eventos recurrentes hotel. Pack mensual de mobiliario.',
         ${OWNER_ID}, NOW(), NOW())
      RETURNING id, number
    `;
    console.log("✓ Quotes:", quotes.map((d) => d.number));
  } else {
    console.log("→ Quotes already exist, skipping.");
  }

  // ── 8. Tasks ─────────────────────────────────────────────────────────────────
  const taskCount = await sql`SELECT COUNT(*) AS cnt FROM tasks WHERE organization_id = ${ORG_ID} AND title ILIKE '[DEMO]%'`;
  if (Number(taskCount[0].cnt) === 0) {
    await sql`
      INSERT INTO tasks (organization_id, title, description, status, priority, due_date, event_id, created_by, created_at, updated_at)
      VALUES
        (${ORG_ID}, '[DEMO] Preparar inventario Boda García',
         'Revisar stock de sillas Tiffany y mesas. Confirmar transporte para 19 septiembre.',
         'pending', 'high', '2026-09-10', ${eventId1 || null}, ${OWNER_ID}, NOW(), NOW()),
        (${ORG_ID}, '[DEMO] Mantenimiento furgón auxiliar',
         'Revisión mecánica semestral + certificado ITV. Programar taller antes del pico de temporada.',
         'in_progress', 'medium', '2026-06-30', NULL, ${OWNER_ID}, NOW(), NOW()),
        (${ORG_ID}, '[DEMO] Actualizar catálogo de productos',
         'Añadir fotos de los nuevos modelos de sillas y mesas. Actualizar precios temporada 2026.',
         'pending', 'low', '2026-05-31', NULL, ${OWNER_ID}, NOW(), NOW())
    `;
    console.log("✓ Tasks inserted.");
  } else {
    console.log("→ Tasks already exist, skipping.");
  }

  console.log("\n✅ Demo seed complete for org 102 (Audiovisuales Lipogo sl)");
  console.log("   - 2 contacts, 2 events, 2 warehouses, 3 products");
  console.log("   - 2 invoices, 2 quotes, 3 tasks, 4 stock movements");
}

main().catch((err) => {
  console.error("SEED ERROR:", err.message);
  process.exit(1);
});
