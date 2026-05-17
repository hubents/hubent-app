#!/usr/bin/env node
/**
 * Demo seed — round 3:
 *  - Contacts with ALL fields filled (CIF, IBAN, banco, tags, etc.)
 *  - Tasks linked to contacts via task_participants
 *  - Chat conversations (task_messages)
 *  - 2 TODOs (checklist items) con encargado asignado
 *  - Payments (payment_records)
 *  - Form completo con campos y una respuesta de muestra
 */

const { neon } = require("@neondatabase/serverless");
const DATABASE_URL =
  "postgresql://neondb_owner:npg_MW5XBnO3dCTZ@ep-misty-cake-ah8l8jtr-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

const ORG_ID = 102;
const OWNER_ID = "ba569e4d-b5d3-412d-a9e8-21d320958984";

async function exists(table, where) {
  const r = await sql`SELECT COUNT(*) AS cnt FROM ${sql.unsafe(table)} WHERE ${sql.unsafe(where)}`;
  return Number(r[0].cnt) > 0;
}

async function main() {
  // ── Fetch existing demo IDs ────────────────────────────────────────────────
  const [c1, c2] = (await sql`SELECT id FROM contacts WHERE organization_id=${ORG_ID} AND name ILIKE '[DEMO]%' ORDER BY id LIMIT 2`);
  const [t1, t2, t3] = (await sql`SELECT id, title FROM tasks WHERE organization_id=${ORG_ID} AND title ILIKE '[DEMO]%' ORDER BY id LIMIT 3`);
  const [e1, e2] = (await sql`SELECT id FROM events WHERE organization_id=${ORG_ID} AND name ILIKE '[DEMO]%' ORDER BY id LIMIT 2`);
  const [doc1, doc2] = (await sql`SELECT id, total FROM financial_documents WHERE organization_id=${ORG_ID} AND number ILIKE 'DEMO-FAC%' ORDER BY id LIMIT 2`);

  const c1id = c1?.id, c2id = c2?.id;
  const t1id = t1?.id, t2id = t2?.id;
  const e1id = e1?.id, e2id = e2?.id;
  const doc1id = doc1?.id, doc2id = doc2?.id;

  console.log("IDs — contacts:", c1id, c2id, "| tasks:", t1id, t2id, "| events:", e1id, e2id, "| docs:", doc1id, doc2id);

  // ── 1. Update contacts — todos los campos ─────────────────────────────────
  if (c1id) {
    await sql`
      UPDATE contacts SET
        nie_or_cif      = 'B-29.123.456',
        tax_id          = 'B29123456',
        trade_name      = 'Las Rosas Eventos SL',
        bank_name       = 'CaixaBank',
        bank_iban       = 'ES76 2100 0418 4502 0005 1332',
        bank_swift      = 'CAIXESBBXXX',
        bank_account_number = '2100-0418-45-0200051332',
        payment_methods = '["transferencia","tarjeta"]'::json,
        tags            = '["florería","bodas","eventos","marbella","proveedor habitual"]'::json,
        lead_score      = 82,
        guest_count     = 180,
        budget          = 4500,
        venue_type      = 'Finca / exterior',
        event_date      = '2026-09-20',
        updated_at      = NOW()
      WHERE id = ${c1id}
    `;
    console.log("✓ Contact 1 (Florería) — todos los campos rellenados.");
  }

  if (c2id) {
    await sql`
      UPDATE contacts SET
        nie_or_cif      = 'A-29.987.654',
        tax_id          = 'A29987654',
        trade_name      = 'Gran Marbella Hospitality SA',
        bank_name       = 'Banco Santander',
        bank_iban       = 'ES91 0049 0001 5521 1000 3123',
        bank_swift      = 'BSCHESMMXXX',
        bank_account_number = '0049-0001-55-2110003123',
        payment_methods = '["transferencia","domiciliación"]'::json,
        tags            = '["hotel","eventos corporativos","lujo","marbella","recurrente"]'::json,
        lead_score      = 91,
        guest_count     = 250,
        budget          = 15000,
        venue_type      = 'Hotel / salón',
        updated_at      = NOW()
      WHERE id = ${c2id}
    `;
    console.log("✓ Contact 2 (Hotel) — todos los campos rellenados.");
  }

  // ── 2. Task participants — vincular contactos a tareas ─────────────────────
  const p1exists = await exists("task_participants", `task_id=${t1id} AND contact_id=${c1id}`);
  if (!p1exists && t1id && c1id) {
    const [p1] = await sql`
      INSERT INTO task_participants (task_id, user_id, type, can_edit, can_comment, added_by, added_at, contact_id)
      VALUES (${t1id}, NULL, 'contact', false, true, ${OWNER_ID}, NOW(), ${c1id})
      RETURNING id
    `;
    console.log("✓ Task participant — Florería vinculada a tarea 1, participant id:", p1.id);
  }

  const p2exists = await exists("task_participants", `task_id=${t2id} AND contact_id=${c2id}`);
  if (!p2exists && t2id && c2id) {
    const [p2] = await sql`
      INSERT INTO task_participants (task_id, user_id, type, can_edit, can_comment, added_by, added_at, contact_id)
      VALUES (${t2id}, NULL, 'contact', false, true, ${OWNER_ID}, NOW(), ${c2id})
      RETURNING id
    `;
    console.log("✓ Task participant — Hotel vinculado a tarea 2, participant id:", p2.id);
  }

  // También vinculamos el owner como participante (para poder asignarle checklist items)
  let ownerParticipantId = null;
  const ownerP = await sql`SELECT id FROM task_participants WHERE task_id=${t1id} AND user_id=${OWNER_ID} LIMIT 1`;
  if (ownerP.length === 0 && t1id) {
    const [op] = await sql`
      INSERT INTO task_participants (task_id, user_id, type, can_edit, can_comment, added_by, added_at)
      VALUES (${t1id}, ${OWNER_ID}, 'planner', true, true, ${OWNER_ID}, NOW())
      RETURNING id
    `;
    ownerParticipantId = op.id;
    console.log("✓ Owner añadido como participante de tarea 1, id:", ownerParticipantId);
  } else if (ownerP.length > 0) {
    ownerParticipantId = ownerP[0].id;
    console.log("→ Owner ya era participante de tarea 1, id:", ownerParticipantId);
  }

  // ── 3. Chat conversations (task_messages) ─────────────────────────────────
  const msgExists = await exists("task_messages", `task_id=${t1id} AND sender_id='${OWNER_ID}' AND content ILIKE '[DEMO]%'`);
  if (!msgExists && t1id) {
    await sql`
      INSERT INTO task_messages (task_id, sender_id, type, content, is_private, created_at)
      VALUES
        (${t1id}, ${OWNER_ID}, 'text',
         '[DEMO] Hola Carmen, confirmamos el pedido para la Boda García-Martínez: 180 sillas Tiffany blancas + 18 mesas redondas 180cm. ¿Podéis confirmar disponibilidad para el 20 de septiembre?',
         false,
         NOW() - INTERVAL '5 days'),
        (${t1id}, ${OWNER_ID}, 'text',
         '[DEMO] Recordatorio importante: el acceso al venue es por la puerta de servicio trasera (Calle Los Pinos s/n). Coordinar con el responsable Juan López, tel. +34 666 111 222. Ventana de montaje 08:00–13:00.',
         false,
         NOW() - INTERVAL '3 days'),
        (${t1id}, ${OWNER_ID}, 'text',
         '[DEMO] Confirmado todo. Os enviamos la factura DEMO-FAC-2026-001 esta semana. El transporte sale a las 07:30 desde el almacén.',
         false,
         NOW() - INTERVAL '1 day')
    `;
    console.log("✓ Chat messages tarea 1 insertados (3 mensajes).");
  } else {
    console.log("→ Chat messages tarea 1 ya existen, skipping.");
  }

  const msgExists2 = await exists("task_messages", `task_id=${t2id} AND sender_id='${OWNER_ID}' AND content ILIKE '[DEMO]%'`);
  if (!msgExists2 && t2id) {
    await sql`
      INSERT INTO task_messages (task_id, sender_id, type, content, is_private, created_at)
      VALUES
        (${t2id}, ${OWNER_ID}, 'text',
         '[DEMO] Llamar al Taller Hnos. Molina antes del 10 de junio para confirmar cita de revisión del furgón F1. Tel: +34 952 447 700.',
         false,
         NOW() - INTERVAL '4 days'),
        (${t2id}, ${OWNER_ID}, 'text',
         '[DEMO] Cita confirmada: 15 de junio, 09:00h. Llevar historial de mantenimiento + póliza de seguro vigente. Presupuesto estimado 320€.',
         false,
         NOW() - INTERVAL '2 days')
    `;
    console.log("✓ Chat messages tarea 2 insertados (2 mensajes).");
  } else {
    console.log("→ Chat messages tarea 2 ya existen, skipping.");
  }

  // ── 4. Checklist items (TODOs) con encargados asignados ───────────────────
  const checkExists = await exists("task_checklist_items", `task_id=${t1id} AND title ILIKE '[DEMO]%'`);
  if (!checkExists && t1id) {
    const [ch1] = await sql`
      INSERT INTO task_checklist_items (task_id, title, is_completed, due_date, sort_order, created_by, created_at, updated_at)
      VALUES (${t1id}, '[DEMO] Confirmar lista definitiva de mobiliario con Carmen Ruiz', false, '2026-09-08', 1, ${OWNER_ID}, NOW(), NOW())
      RETURNING id
    `;
    const [ch2] = await sql`
      INSERT INTO task_checklist_items (task_id, title, is_completed, due_date, sort_order, created_by, created_at, updated_at)
      VALUES (${t1id}, '[DEMO] Preparar albarán de entrega y checklist de inventario', false, '2026-09-15', 2, ${OWNER_ID}, NOW(), NOW())
      RETURNING id
    `;
    const [ch3] = await sql`
      INSERT INTO task_checklist_items (task_id, title, is_completed, due_date, sort_order, created_by, completed_at, completed_by, created_at, updated_at)
      VALUES (${t1id}, '[DEMO] Reservar furgón principal para el 19 sept', true, '2026-09-05', 3, ${OWNER_ID}, NOW() - INTERVAL '2 days', ${OWNER_ID}, NOW() - INTERVAL '10 days', NOW())
      RETURNING id
    `;
    console.log("✓ Checklist items insertados:", ch1.id, ch2.id, ch3.id);

    // Assign checklist items to owner participant if we have it
    if (ownerParticipantId) {
      await sql`
        INSERT INTO task_checklist_assignees (checklist_item_id, participant_id, assigned_at, assigned_by)
        VALUES
          (${ch1.id}, ${ownerParticipantId}, NOW(), ${OWNER_ID}),
          (${ch2.id}, ${ownerParticipantId}, NOW(), ${OWNER_ID})
      `;
      console.log("✓ Checklist items asignados al encargado (participant_id:", ownerParticipantId, ")");
    }
  } else {
    console.log("→ Checklist items ya existen, skipping.");
  }

  // ── 5. Payment records ─────────────────────────────────────────────────────
  const payExists = await exists("payment_records", `organization_id=${ORG_ID} AND reference ILIKE 'DEMO-PAY%'`);
  if (!payExists) {
    await sql`
      INSERT INTO payment_records (organization_id, document_id, contact_id, amount, payment_date, payment_method,
        reference, notes, direction, status, currency, created_by, created_at)
      VALUES
        (${ORG_ID}, ${doc1id}, ${c1id}, 2286.90, '2026-04-01', 'transferencia',
         'DEMO-PAY-001', 'Pago total factura DEMO-FAC-2026-001 — Boda García-Martínez. Recibido en cuenta ES76.',
         'income', 'completed', 'EUR', ${OWNER_ID}, NOW()),
        (${ORG_ID}, ${doc2id}, ${c2id}, 1936.00, '2026-04-25', 'transferencia',
         'DEMO-PAY-002', 'Pago parcial (50%) factura DEMO-FAC-2026-002 — Gala Corporativa TechSur. Pendiente 1.936€.',
         'income', 'completed', 'EUR', ${OWNER_ID}, NOW())
    `;
    console.log("✓ Payment records insertados (2).");
  } else {
    console.log("→ Payment records ya existen, skipping.");
  }

  // ── 6. Form completo con campos y una respuesta ────────────────────────────
  const formExists = await exists("forms", `organization_id=${ORG_ID} AND name ILIKE '[DEMO]%'`);
  if (!formExists) {
    const [form] = await sql`
      INSERT INTO forms (organization_id, name, description, status, primary_color,
        submit_button_text, thank_you_title, thank_you_message,
        notify_on_response, notify_email, gdpr_enabled, gdpr_text,
        crm_create_contact, crm_create_lead, created_by, created_at, updated_at)
      VALUES (
        ${ORG_ID},
        '[DEMO] Solicitud de Presupuesto de Equipamiento',
        'Formulario demo para que clientes potenciales soliciten presupuesto de alquiler de mobiliario y servicios de montaje.',
        'active', '#3B82F6',
        'Solicitar presupuesto',
        '¡Gracias por contactarnos!',
        'Hemos recibido tu solicitud. Nos pondremos en contacto en menos de 24 horas con un presupuesto personalizado.',
        true, 'lipogo2109@badgerhole.com',
        true, 'Acepto el tratamiento de mis datos según la política de privacidad.',
        true, true,
        ${OWNER_ID}, NOW(), NOW()
      )
      RETURNING id
    `;
    const formId = form.id;
    console.log("✓ Form creado, id:", formId);

    // Form fields
    await sql`
      INSERT INTO form_fields (form_id, type, label, placeholder, required, crm_mapping, sort_order, config, options)
      VALUES
        (${formId}, 'text',    'Nombre de la empresa',     'Ej: Bodas & Eventos SL',      true,  'name',  1, '{}', null),
        (${formId}, 'email',   'Correo electrónico',       'contacto@empresa.com',         true,  'email', 2, '{}', null),
        (${formId}, 'phone',   'Teléfono de contacto',     '+34 6XX XXX XXX',              true,  'phone', 3, '{}', null),
        (${formId}, 'select',  'Tipo de evento',           null,                           true,  null,    4, '{}',
          '["Boda","Aniversario","Evento corporativo","Cumpleaños","Comunión","Otro"]'::jsonb),
        (${formId}, 'date',    'Fecha del evento',         null,                           true,  'event_date', 5, '{}', null),
        (${formId}, 'number',  'Número de invitados aprox.',  'Ej: 150',                   false, 'guest_count', 6, '{}', null),
        (${formId}, 'textarea','Descripción del evento',   'Cuéntanos qué necesitas...',   false, 'notes', 7, '{"rows":4}', null)
    `;
    console.log("✓ Form fields insertados (7 campos).");

    // Form instance
    const [inst] = await sql`
      INSERT INTO form_instances (form_id, organization_id, type, slug, status, created_by, created_at)
      VALUES (${formId}, ${ORG_ID}, 'standalone', 'demo-presupuesto-equipamiento', 'active', ${OWNER_ID}, NOW())
      RETURNING id
    `;
    console.log("✓ Form instance creada, slug: demo-presupuesto-equipamiento");

    // Form submission — una respuesta de muestra
    await sql`
      INSERT INTO form_submissions (instance_id, form_id, respondent_name, respondent_email, contact_id,
        data, created_at)
      VALUES (
        ${inst.id}, ${formId},
        'Eventos del Sur SL',
        'info@eventosdelsur-demo.es',
        ${c1id},
        '{"empresa":"Eventos del Sur SL","email":"info@eventosdelsur-demo.es","telefono":"+34 622 334 455","tipo_evento":"Boda","fecha_evento":"2026-10-18","invitados":"220","descripcion":"Necesitamos 220 sillas Tiffany blancas, 22 mesas redondas y servicio de montaje completo para boda en finca de Estepona."}'::jsonb,
        NOW() - INTERVAL '2 days'
      )
    `;
    console.log("✓ Form submission de muestra insertada.");
  } else {
    console.log("→ Form ya existe, skipping.");
  }

  console.log("\n✅ Demo seed round 3 completo.");
  console.log("   Contactos: todos los campos (CIF, IBAN, banco, tags, presupuesto)");
  console.log("   Tareas: contactos vinculados como participantes");
  console.log("   Chat: 5 mensajes en 2 tareas");
  console.log("   Checklist: 3 items (2 asignados al encargado, 1 completado)");
  console.log("   Pagos: 2 registros de cobro");
  console.log("   Formulario: 7 campos + instancia + 1 respuesta");
}

main().catch((err) => {
  console.error("SEED ERROR:", err.message);
  process.exit(1);
});
