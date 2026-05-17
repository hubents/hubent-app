import { db } from "@/db";
import { contacts, events, tasks, financialDocuments } from "@/db/schema";
import { and, eq, ilike } from "drizzle-orm";

/**
 * Seeds demo contacts, events, tasks, and invoices for a new provider org.
 * Idempotent — skips if [DEMO] data already exists for this org.
 */
export async function seedProviderDemoData(orgId: number, userId: string): Promise<void> {
  const existing = await db.query.contacts.findFirst({
    where: and(eq(contacts.organizationId, orgId), ilike(contacts.name, "[DEMO]%")),
  });
  if (existing) return;

  // ── Contacts ─────────────────────────────────────────────────────────────────
  const [contact1, contact2] = await db
    .insert(contacts)
    .values([
      {
        organizationId: orgId,
        type: "company" as const,
        name: "[DEMO] Florería Las Rosas SL",
        email: "lasrosas@demo.test",
        phone: "+34 611 123 456",
        notes: "Demo — Florería especializada en bodas. Requiere transporte refrigerado.",
        createdBy: userId,
      },
      {
        organizationId: orgId,
        type: "company" as const,
        name: "[DEMO] Hotel Gran Marbella",
        email: "eventos@hotel-demo.test",
        phone: "+34 622 987 654",
        notes: "Demo — Hotel 5 estrellas. Organiza 8-10 eventos/mes.",
        createdBy: userId,
      },
    ])
    .returning();

  // ── Events ────────────────────────────────────────────────────────────────────
  const d1 = new Date();
  d1.setMonth(d1.getMonth() + 4);
  const d2 = new Date();
  d2.setMonth(d2.getMonth() + 6);

  const [event1, event2] = await db
    .insert(events)
    .values([
      {
        organizationId: orgId,
        name: "[DEMO] Boda García-Martínez",
        type: "wedding" as const,
        date: d1,
        status: "confirmed" as const,
        guestCount: 180,
        budget: "22000",
        description: "Demo — Montaje completo: mesas, sillas Tiffany, iluminación cálida.",
        createdBy: userId,
      },
      {
        organizationId: orgId,
        name: "[DEMO] Gala Corporativa TechSur",
        type: "corporate" as const,
        date: d2,
        status: "confirmed" as const,
        guestCount: 320,
        budget: "38000",
        description: "Demo — Montaje auditorio, equipo A/V, catering premium.",
        createdBy: userId,
      },
    ])
    .returning();

  // ── Tasks ─────────────────────────────────────────────────────────────────────
  const t1 = new Date(d1);
  t1.setDate(t1.getDate() - 2);
  const t2 = new Date(d2);
  t2.setDate(t2.getDate() - 5);

  await db.insert(tasks).values([
    {
      organizationId: orgId,
      title: "[DEMO] Preparar inventario Boda García",
      status: "pending" as const,
      priority: "high",
      dueDate: t1,
      eventId: event1.id,
      createdBy: userId,
    },
    {
      organizationId: orgId,
      title: "[DEMO] Confirmar transporte refrigerado con proveedor",
      status: "pending" as const,
      priority: "medium",
      dueDate: t1,
      eventId: event1.id,
      createdBy: userId,
    },
    {
      organizationId: orgId,
      title: "[DEMO] Revisión técnica del equipo A/V — Gala TechSur",
      status: "pending" as const,
      priority: "high",
      dueDate: t2,
      eventId: event2.id,
      createdBy: userId,
    },
  ]);

  // ── Invoices ──────────────────────────────────────────────────────────────────
  const pastDate = new Date();
  pastDate.setMonth(pastDate.getMonth() - 1);
  const futuredue = new Date();
  futuredue.setDate(futuredue.getDate() + 15);

  await db.insert(financialDocuments).values([
    {
      organizationId: orgId,
      type: "invoice" as const,
      number: "DEMO-001",
      status: "paid" as const,
      contactId: contact1.id,
      eventId: event1.id,
      direction: "outgoing",
      issueDate: pastDate,
      subtotal: "3200",
      taxAmount: "672",
      total: "3872",
      currency: "EUR",
    },
    {
      organizationId: orgId,
      type: "invoice" as const,
      number: "DEMO-002",
      status: "sent" as const,
      contactId: contact2.id,
      eventId: event2.id,
      direction: "outgoing",
      issueDate: new Date(),
      dueDate: futuredue,
      subtotal: "8500",
      taxAmount: "1785",
      total: "10285",
      currency: "EUR",
    },
  ]);
}
