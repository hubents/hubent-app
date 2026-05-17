import { db } from "@/db";
import { contacts, events, tasks, financialDocuments, productCatalog } from "@/db/schema";
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

  // ── Products ──────────────────────────────────────────────────────────────────
  await db.insert(productCatalog).values([
    // SERVICIOS
    {
      organizationId: orgId,
      sku: "SRV-001",
      name: "Coordinación de evento completo",
      type: "servicio" as const,
      subtype: "servicio" as const,
      category: "Coordinación",
      tags: ["coordinación", "wedding planner", "gestión"],
      description: "Coordinación integral del evento desde planificación hasta cierre. Incluye reuniones previas, día de boda y supervisión de proveedores.",
      detail: "Mínimo 3 reuniones previas + presencia completa el día del evento.",
      cost: "320",
      unitPrice: "950",
      taxRate: "21",
      unit: "evento",
      color: "#7C3AED",
      initials: "CO",
      isActive: true,
    },
    {
      organizationId: orgId,
      sku: "SRV-002",
      name: "Fotografía profesional boda",
      type: "servicio" as const,
      subtype: "servicio" as const,
      category: "Fotografía",
      tags: ["fotografía", "reportaje", "boda"],
      description: "Reportaje fotográfico completo: preboda, ceremonia y banquete. Entrega de 500+ fotos editadas en alta resolución + álbum digital.",
      detail: "Cobertura mínima 8h. Entrega en 30 días. Incluye sesión de pareja previa.",
      cost: "480",
      unitPrice: "1400",
      taxRate: "21",
      unit: "evento",
      color: "#2563EB",
      initials: "FO",
      isActive: true,
    },
    {
      organizationId: orgId,
      sku: "SRV-003",
      name: "Vídeo bodas — Highlights 5 min",
      type: "servicio" as const,
      subtype: "servicio" as const,
      category: "Vídeo",
      tags: ["vídeo", "highlights", "edición"],
      description: "Vídeo resumen de 5 minutos con música personalizada. Cobertura completa del día + 2 rondas de correcciones.",
      detail: "Formato 4K. Entrega en 45 días. Incluye trailer de 90 seg para redes.",
      cost: "380",
      unitPrice: "1100",
      taxRate: "21",
      unit: "evento",
      color: "#DC2626",
      initials: "VI",
      isActive: true,
    },
    {
      organizationId: orgId,
      sku: "SRV-004",
      name: "DJ profesional + equipo sonido",
      type: "servicio" as const,
      subtype: "servicio" as const,
      category: "Música y sonido",
      tags: ["DJ", "sonido", "música"],
      description: "DJ profesional con equipo de sonido completo (altavoces, amplificadores, mezcladora). Incluye micrófono inalámbrico y música de ceremonia.",
      detail: "Montaje 2h antes del evento. Cobertura hasta las 3:00 am.",
      cost: "250",
      unitPrice: "720",
      taxRate: "21",
      unit: "evento",
      color: "#059669",
      initials: "DJ",
      isActive: true,
    },
    {
      organizationId: orgId,
      sku: "SRV-005",
      name: "Catering cóctel — menú premium",
      type: "servicio" as const,
      subtype: "servicio" as const,
      category: "Catering",
      tags: ["catering", "cóctel", "comida"],
      description: "Servicio de catering para cóctel de bienvenida. Incluye canapés fríos y calientes, bebidas y personal de servicio.",
      detail: "Ratio 1 camarero / 20 pax. Mínimo 50 personas.",
      cost: "18",
      unitPrice: "42",
      taxRate: "10",
      unit: "persona",
      color: "#D97706",
      initials: "CA",
      isActive: true,
    },
    {
      organizationId: orgId,
      sku: "SRV-006",
      name: "Menú banquete — 3 platos",
      type: "servicio" as const,
      subtype: "servicio" as const,
      category: "Catering",
      tags: ["banquete", "cena", "menú"],
      description: "Menú de banquete de 3 platos: entrante, principal y postre. Incluye bebidas (agua, vino, cava para el brindis) y café.",
      detail: "Menú degustación disponible previo. Opciones vegana y sin gluten.",
      cost: "38",
      unitPrice: "85",
      taxRate: "10",
      unit: "persona",
      color: "#D97706",
      initials: "MB",
      isActive: true,
    },
    // FÍSICOS (ALQUILER)
    {
      organizationId: orgId,
      sku: "ALQ-001",
      name: "Mesa redonda 180cm",
      type: "fisico" as const,
      subtype: "alquiler" as const,
      category: "Mobiliario",
      tags: ["mesa", "mobiliario", "alquiler"],
      description: "Mesa redonda de 180cm de diámetro. Capacidad 10 comensales. Tablero blanco lacado.",
      detail: "Se entrega montada. Requiere manteles (no incluidos). Peso: 18kg.",
      cost: "4",
      unitPrice: "12",
      taxRate: "21",
      unit: "unidad/día",
      stock: 45,
      stockMin: 5,
      color: "#64748B",
      initials: "MR",
      isActive: true,
    },
    {
      organizationId: orgId,
      sku: "ALQ-002",
      name: "Silla Tiffany blanca",
      type: "fisico" as const,
      subtype: "alquiler" as const,
      category: "Mobiliario",
      tags: ["silla", "tiffany", "mobiliario"],
      description: "Silla Tiffany transparente con asiento acolchado blanco. Ideal para bodas y eventos elegantes.",
      detail: "Se apilan en grupos de 6. Limpiar con paño húmedo.",
      cost: "1.2",
      unitPrice: "3.5",
      taxRate: "21",
      unit: "unidad/día",
      stock: 320,
      stockMin: 50,
      color: "#64748B",
      initials: "ST",
      isActive: true,
    },
    {
      organizationId: orgId,
      sku: "ALQ-003",
      name: "Arco floral — estructura metálica",
      type: "fisico" as const,
      subtype: "alquiler" as const,
      category: "Decoración",
      tags: ["arco", "floral", "ceremonia", "decoración"],
      description: "Estructura metálica circular de 2,4m de diámetro para arco floral. Las flores no están incluidas.",
      detail: "Montaje y desmontaje incluido. Necesita base de hormigón o estabilizadores.",
      cost: "25",
      unitPrice: "85",
      taxRate: "21",
      unit: "unidad/evento",
      stock: 6,
      stockMin: 1,
      color: "#B45309",
      initials: "AF",
      isActive: true,
    },
    {
      organizationId: orgId,
      sku: "ALQ-004",
      name: "Iluminación ambiente — kit 10 focos LED",
      type: "fisico" as const,
      subtype: "alquiler" as const,
      category: "Iluminación",
      tags: ["iluminación", "LED", "ambiente"],
      description: "Kit de 10 focos LED RGB de 30W con controlador DMX. Permite programar colores y efectos. Ideal para crear ambientes personalizados.",
      detail: "Incluye cable 10m, trípodes y controlador. Técnico de montaje +180€.",
      cost: "40",
      unitPrice: "120",
      taxRate: "21",
      unit: "kit/evento",
      stock: 8,
      stockMin: 1,
      color: "#F59E0B",
      initials: "IL",
      isActive: true,
    },
    {
      organizationId: orgId,
      sku: "ALQ-005",
      name: "Mantel lino natural 300cm",
      type: "fisico" as const,
      subtype: "alquiler" as const,
      category: "Textil",
      tags: ["mantel", "lino", "textil"],
      description: "Mantel de lino natural 100% en color crudo. 300x300cm. Apto para mesas redondas de 180cm y rectangulares de 240cm.",
      detail: "Lavado y planchado incluido en el precio. Manchas severas se facturan aparte.",
      cost: "3",
      unitPrice: "9",
      taxRate: "21",
      unit: "unidad/evento",
      stock: 80,
      stockMin: 10,
      color: "#A16207",
      initials: "ML",
      isActive: true,
    },
    // PAQUETES
    {
      organizationId: orgId,
      sku: "PKG-001",
      name: "Pack Boda Esencial",
      type: "paquete" as const,
      subtype: "venta" as const,
      category: "Paquetes",
      tags: ["paquete", "boda", "todo incluido"],
      description: "Paquete todo en uno para bodas de hasta 100 invitados. Incluye: coordinación, fotografía, DJ, decoración básica y personal de servicio.",
      detail: "Válido para eventos en provincia de Málaga. Desplazamientos fuera de 50km con suplemento.",
      cost: "1800",
      unitPrice: "4200",
      taxRate: "21",
      unit: "evento",
      color: "#7C3AED",
      initials: "PB",
      isActive: true,
    },
    {
      organizationId: orgId,
      sku: "PKG-002",
      name: "Pack Evento Corporativo Premium",
      type: "paquete" as const,
      subtype: "venta" as const,
      category: "Paquetes",
      tags: ["paquete", "corporativo", "premium"],
      description: "Paquete para eventos corporativos de hasta 200 asistentes. Incluye: coordinación, equipo A/V, catering cóctel, fotografía y vídeo.",
      detail: "Montaje disponible la tarde anterior. Briefing previo obligatorio.",
      cost: "2800",
      unitPrice: "6800",
      taxRate: "21",
      unit: "evento",
      color: "#1D4ED8",
      initials: "PC",
      isActive: true,
    },
  ]);

  // ── Invoices ──────────────────────────────────────────────────────────────────
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
