/**
 * Migrate legacy eventPayments and taskPayments to unified paymentRecords table.
 * Safe to run multiple times — skips already-migrated records.
 * 
 * Usage: npx tsx scripts/migrate-legacy-payments.ts
 */
import { neon } from "@neondatabase/serverless";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL not set");

  const sql = neon(databaseUrl);

  console.log("🔄 Migrating legacy payments to paymentRecords...\n");

  // 1. Migrate eventPayments → paymentRecords
  const eventPayments = await sql`
    SELECT ep.*, e.organization_id 
    FROM event_payments ep
    JOIN events e ON e.id = ep.event_id
  `;

  let migratedEvent = 0;
  let skippedEvent = 0;

  for (const ep of eventPayments) {
    // Check if already migrated (by reference pattern)
    const existing = await sql`
      SELECT id FROM payment_records 
      WHERE reference = ${"legacy_event_" + ep.id} 
      AND organization_id = ${ep.organization_id}
      LIMIT 1
    `;

    if (existing.length > 0) {
      skippedEvent++;
      continue;
    }

    await sql`
      INSERT INTO payment_records (
        organization_id, event_id, amount, currency, direction,
        payment_date, notes, status, reference, created_by
      ) VALUES (
        ${ep.organization_id},
        ${ep.event_id},
        ${ep.amount},
        'EUR',
        'outgoing',
        ${ep.paid_date || ep.due_date || ep.created_at},
        ${ep.description},
        ${ep.status === "paid" ? "complete" : "pending"},
        ${"legacy_event_" + ep.id},
        ${ep.created_by}
      )
    `;
    migratedEvent++;
  }

  console.log(`  eventPayments: ${migratedEvent} migrated, ${skippedEvent} skipped`);

  // 2. Migrate taskPayments → paymentRecords
  const taskPaymentsData = await sql`
    SELECT tp.*, t.event_id, e.organization_id
    FROM task_payments tp
    JOIN tasks t ON t.id = tp.task_id
    JOIN events e ON e.id = t.event_id
  `;

  let migratedTask = 0;
  let skippedTask = 0;

  for (const tp of taskPaymentsData) {
    const existing = await sql`
      SELECT id FROM payment_records 
      WHERE reference = ${"legacy_task_" + tp.id} 
      AND organization_id = ${tp.organization_id}
      LIMIT 1
    `;

    if (existing.length > 0) {
      skippedTask++;
      continue;
    }

    await sql`
      INSERT INTO payment_records (
        organization_id, task_id, event_id, vendor_id, amount, currency, direction,
        payment_date, payment_method, notes, status, reference, created_by
      ) VALUES (
        ${tp.organization_id},
        ${tp.task_id},
        ${tp.event_id},
        ${tp.vendor_id || null},
        ${tp.amount},
        'EUR',
        'outgoing',
        ${tp.date || tp.created_at},
        ${tp.payment_method || null},
        ${tp.description},
        ${tp.status === "paid" ? "complete" : "pending"},
        ${"legacy_task_" + tp.id},
        ${tp.created_by}
      )
    `;
    migratedTask++;
  }

  console.log(`  taskPayments:  ${migratedTask} migrated, ${skippedTask} skipped`);
  console.log(`\n✅ Migration complete. Total: ${migratedEvent + migratedTask} new records.`);
}

main().catch(console.error);
