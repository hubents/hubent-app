#!/usr/bin/env node
/**
 * Demo seed — round 2:
 *  - Update contacts with realistic avatars + full name fields
 *  - 2 more service products
 *  - 2 event schedule items (calendar/agenda of the event)
 *  - 2 task meetings
 *  - 2 task schedule items (orden del día)
 */

const { neon } = require("@neondatabase/serverless");
const DATABASE_URL =
  "postgresql://neondb_owner:npg_MW5XBnO3dCTZ@ep-misty-cake-ah8l8jtr-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

const ORG_ID = 102;
const OWNER_ID = "ba569e4d-b5d3-412d-a9e8-21d320958984";

async function main() {
  // ── Get existing demo IDs ────────────────────────────────────────────────────
  const contactRows = await sql`
    SELECT id, name FROM contacts WHERE organization_id = ${ORG_ID} AND name ILIKE '[DEMO]%' ORDER BY id LIMIT 2
  `;
  const taskRows = await sql`
    SELECT id, title FROM tasks WHERE organization_id = ${ORG_ID} AND title ILIKE '[DEMO]%' ORDER BY id LIMIT 3
  `;
  const eventRows = await sql`
    SELECT id, name FROM events WHERE organization_id = ${ORG_ID} AND name ILIKE '[DEMO]%' ORDER BY id LIMIT 2
  `;
  const warehouseRows = await sql`
    SELECT id FROM warehouses WHERE organization_id = ${ORG_ID} AND name ILIKE '[DEMO]%' ORDER BY id LIMIT 2
  `;

  console.log("Found contacts:", contactRows.map((c) => `${c.id}:${c.name}`));
  console.log("Found tasks:", taskRows.map((t) => `${t.id}:${t.title}`));
  console.log("Found events:", eventRows.map((e) => `${e.id}:${e.name}`));

  const contact1Id = contactRows[0]?.id;
  const contact2Id = contactRows[1]?.id;
  const task1Id = taskRows[0]?.id; // Preparar inventario Boda García
  const task2Id = taskRows[1]?.id; // Mantenimiento furgón
  const event1Id = eventRows[0]?.id; // Boda García-Martínez
  const event2Id = eventRows[1]?.id; // Gala Corporativa TechSur
  const warehouseId1 = warehouseRows[0]?.id;

  // ── 1. Update contacts with realistic avatars + full names ───────────────────
  if (contact1Id) {
    await sql`
      UPDATE contacts SET
        avatar = 'https://randomuser.me/api/portraits/women/44.jpg',
        first_name = 'Carmen',
        last_name = 'Ruiz Flores',
        contact_person_name = 'Carmen Ruiz',
        contact_person_email = 'carmen.ruiz@lasrosas-demo.es',
        address = 'Calle Jacinto Benavente 14',
        city = 'Marbella',
        state = 'Málaga',
        postal_code = '29600',
        country = 'España',
        website = 'www.lasrosas-demo.es',
        updated_at = NOW()
      WHERE id = ${contact1Id}
    `;
  }
  if (contact2Id) {
    await sql`
      UPDATE contacts SET
        avatar = 'https://randomuser.me/api/portraits/men/52.jpg',
        first_name = 'Alejandro',
        last_name = 'Torres Navarro',
        contact_person_name = 'Alejandro Torres',
        contact_person_email = 'a.torres@hotelgrannmarbella-demo.es',
        address = 'Paseo Marítimo del Rey de España 25',
        city = 'Marbella',
        state = 'Málaga',
        postal_code = '29600',
        country = 'España',
        website = 'www.hotelgranmarbella-demo.es',
        updated_at = NOW()
      WHERE id = ${contact2Id}
    `;
  }
  console.log("✓ Contacts updated with avatars and full data.");

  // ── 2. Two service products ──────────────────────────────────────────────────
  const svcCount = await sql`
    SELECT COUNT(*) AS cnt FROM product_catalog
    WHERE organization_id = ${ORG_ID} AND name ILIKE '[DEMO] Transporte%'
  `;
  if (Number(svcCount[0].cnt) === 0) {
    const svcs = await sql`
      INSERT INTO product_catalog (organization_id, sku, name, description, category, unit_price, unit,
        type, subtype, color, initials, is_active, created_at, updated_at)
      VALUES
        (${ORG_ID}, 'DEMO-TRP-001', '[DEMO] Transporte de Equipamiento',
         'Traslado de mobiliario y material de evento con furgón climatizado. Incluye carga y descarga. Precio por jornada.',
         'Transporte', 280.00, 'jornada', 'servicio', 'servicio',
         '#F59E0B', 'TR', true, NOW(), NOW()),
        (${ORG_ID}, 'DEMO-ILM-001', '[DEMO] Instalación Iluminación LED',
         'Montaje de iluminación ambiental LED para interiores y exteriores. Incluye material y mano de obra.',
         'Instalaciones', 520.00, 'evento', 'servicio', 'servicio',
         '#8B5CF6', 'IL', true, NOW(), NOW())
      RETURNING id, name
    `;
    console.log("✓ Services:", svcs.map((s) => s.name));
  } else {
    console.log("→ Service products already exist, skipping.");
  }

  // ── 3. Event schedule items (calendario del evento) ──────────────────────────
  const schedCount = await sql`
    SELECT COUNT(*) AS cnt FROM event_schedule_items
    WHERE organization_id = ${ORG_ID} AND title ILIKE '[DEMO]%'
  `;
  if (Number(schedCount[0].cnt) === 0 && event1Id) {
    await sql`
      INSERT INTO event_schedule_items (event_id, organization_id, title, description, date, start_time, end_time, location, color, sort_order, created_at, updated_at)
      VALUES
        (${event1Id}, ${ORG_ID},
         '[DEMO] Llegada y montaje de mobiliario',
         'Entrega y montaje de sillas Tiffany, mesas redondas e iluminación ambiental. Equipo de 4 personas.',
         '2026-09-19', '08:00', '13:00',
         'Finca Villa Paraíso — Acceso por puerta de servicio trasera',
         '#3B82F6', 1, NOW(), NOW()),
        (${event2Id}, ${ORG_ID},
         '[DEMO] Instalación audiovisual y decoración',
         'Montaje sistema de iluminación LED + entrega mobiliario gala. Coordinación con equipo del hotel.',
         '2026-11-07', '09:00', '15:00',
         'Hotel Gran Marbella — Salón Mediterráneo, planta baja',
         '#10B981', 1, NOW(), NOW())
    `;
    console.log("✓ Event schedule items inserted.");
  } else {
    console.log("→ Event schedule items already exist or no events, skipping.");
  }

  // ── 4. Task meetings ─────────────────────────────────────────────────────────
  const meetingCount = await sql`
    SELECT COUNT(*) AS cnt FROM task_meetings
    WHERE task_id = ANY(ARRAY[${task1Id || 0}, ${task2Id || 0}]::int[])
    AND title ILIKE '[DEMO]%'
  `;
  if (Number(meetingCount[0].cnt) === 0 && task1Id && task2Id) {
    await sql`
      INSERT INTO task_meetings (task_id, title, description, date, start_time, end_time, location, notes, sort_order, created_at, updated_at)
      VALUES
        (${task1Id},
         '[DEMO] Reunión previa con coordinadora de boda',
         'Confirmar lista exacta de mobiliario, accesos al venue y horarios de entrega con la wedding planner.',
         '2026-09-05', '10:00', '11:00',
         'Videoconferencia — Google Meet',
         'Traer presupuesto actualizado y ficha técnica del furgón', 1, NOW(), NOW()),
        (${task2Id},
         '[DEMO] Revisión con taller mecánico',
         'Chequeo completo: frenos, neumáticos, sistema de refrigeración del furgón auxiliar.',
         '2026-06-15', '09:00', '10:30',
         'Taller Hnos. Molina — Polígono Industrial Los Ángeles, Nave 7, Marbella',
         'Llevar historial de mantenimiento y certificados anteriores', 1, NOW(), NOW())
    `;
    console.log("✓ Task meetings inserted.");
  } else {
    console.log("→ Task meetings already exist or no tasks, skipping.");
  }

  // ── 5. Task schedule items (orden del día) ───────────────────────────────────
  const schedItemCount = await sql`
    SELECT COUNT(*) AS cnt FROM task_schedule_items
    WHERE task_id = ANY(ARRAY[${task1Id || 0}, ${task2Id || 0}]::int[])
    AND title ILIKE '[DEMO]%'
  `;
  if (Number(schedItemCount[0].cnt) === 0 && task1Id && task2Id) {
    await sql`
      INSERT INTO task_schedule_items (task_id, title, description, date, start_time, end_time, location, notes, sort_order, created_at, updated_at)
      VALUES
        (${task1Id}, '[DEMO] Verificar stock de sillas Tiffany',
         'Contar unidades disponibles, descartar piezas dañadas y preparar lista definitiva para la boda.',
         '2026-09-08', '09:00', '10:00', 'Almacén Central Marbella',
         'Mínimo 180 uds en perfecto estado', 1, NOW(), NOW()),
        (${task1Id}, '[DEMO] Coordinar ruta de transporte',
         'Planificar ruta Almacén → Finca Villa Paraíso. Verificar acceso camiones y permisos municipales.',
         '2026-09-10', '11:00', '12:00', 'Oficina',
         'Confirmar con conductor del furgón', 2, NOW(), NOW()),
        (${task2Id}, '[DEMO] Preparar documentación ITV',
         'Reunir facturas de reparaciones anteriores, seguros y ficha técnica del vehículo.',
         '2026-06-10', '10:00', '11:00', 'Oficina',
         'Carpeta azul archivador, cajón superior', 1, NOW(), NOW())
    `;
    console.log("✓ Task schedule items (orden del día) inserted.");
  } else {
    console.log("→ Task schedule items already exist or no tasks, skipping.");
  }

  console.log("\n✅ Demo seed round 2 complete.");
}

main().catch((err) => {
  console.error("SEED ERROR:", err.message);
  process.exit(1);
});
