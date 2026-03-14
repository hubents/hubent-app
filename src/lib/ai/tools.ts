import { tool } from "ai";
import { z } from "zod";
import { db } from "@/db";
import {
  events, tasks, organizationMembers, users, roles, eventVendors, vendors,
  forms, formInstances, formSubmissions,
  contacts, leads, leadStages, guests, rsvpResponses,
  financialDocuments, paymentRecords, paymentSchedules,
} from "@/db/schema";
import { eq, and, desc, asc, gte, lte, sql, isNull, isNotNull, count } from "drizzle-orm";

interface UserContext {
  userId: string;
  organizationId: number;
  role: string;
}

export function createAITools(userContext: UserContext) {
  const { organizationId } = userContext;

  return {
    getEvents: tool({
      description: "Obtiene la lista de eventos de la organizacion del usuario.",
      inputSchema: z.object({
        limit: z.number().optional().default(10),
      }),
      execute: async ({ limit }) => {
        const results = await db.select({
          id: events.id, name: events.name, type: events.type, status: events.status,
          date: events.date, location: events.location, guestCount: events.guestCount,
        }).from(events).where(eq(events.organizationId, organizationId)).orderBy(desc(events.date)).limit(limit);
        return { count: results.length, events: results.map(e => ({
          ...e, date: e.date ? new Date(e.date).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : null,
        }))};
      },
    }),

    getEventDetails: tool({
      description: "Obtiene detalles completos de un evento por ID o nombre, incluyendo TODAS sus tareas y proveedores.",
      inputSchema: z.object({
        eventId: z.number().optional().describe("ID del evento"),
        eventName: z.string().optional().describe("Nombre del evento"),
      }),
      execute: async ({ eventId, eventName }) => {
        let event;
        if (eventId) {
          const result = await db.select().from(events)
            .where(and(eq(events.id, eventId), eq(events.organizationId, organizationId))).limit(1);
          event = result[0];
        } else if (eventName) {
          const allEvents = await db.select().from(events)
            .where(eq(events.organizationId, organizationId)).limit(50);
          event = allEvents.find(e => e.name?.toLowerCase().includes(eventName.toLowerCase()));
        }
        if (!event) return { found: false, message: "No se encontro el evento" };
        
        const eventTasks = await db.select({
          id: tasks.id, title: tasks.title, status: tasks.status,
          priority: tasks.priority, dueDate: tasks.dueDate, category: tasks.category,
        }).from(tasks).where(eq(tasks.eventId, event.id));
        
        const eventVendorsList = await db.select({
          vendorName: vendors.name, vendorCategory: vendors.category, status: eventVendors.status,
        }).from(eventVendors)
          .innerJoin(vendors, eq(vendors.id, eventVendors.vendorId))
          .where(eq(eventVendors.eventId, event.id));
        
        const tasksByStatus = {
          pending: eventTasks.filter(t => t.status === "pending").length,
          in_progress: eventTasks.filter(t => t.status === "in_progress").length,
          completed: eventTasks.filter(t => t.status === "completed").length,
          total: eventTasks.length,
        };
        
        return {
          found: true,
          event: { id: event.id, name: event.name, type: event.type, status: event.status,
            date: event.date ? new Date(event.date).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : null,
            location: event.location, guestCount: event.guestCount },
          tasks: { summary: tasksByStatus, list: eventTasks.map(t => ({
            ...t, dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString("es-ES") : null })) },
          vendors: { count: eventVendorsList.length, list: eventVendorsList },
        };
      },
    }),

    getTasks: tool({
      description: "Obtiene las tareas de la organizacion con el nombre del evento asociado. Puede filtrar por estado y/o por evento.",
      inputSchema: z.object({
        status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional().describe("Filtrar por estado"),
        eventId: z.number().optional().describe("Filtrar por ID de evento"),
        limit: z.number().optional().default(20),
      }),
      execute: async ({ status, eventId, limit }) => {
        let allTasks = await db.select({
          id: tasks.id, title: tasks.title, status: tasks.status,
          priority: tasks.priority, dueDate: tasks.dueDate, eventId: tasks.eventId,
          eventName: events.name,
        }).from(tasks)
          .leftJoin(events, eq(tasks.eventId, events.id))
          .where(eq(tasks.organizationId, organizationId)).orderBy(desc(tasks.dueDate)).limit(100);
        
        if (eventId) allTasks = allTasks.filter(t => t.eventId === eventId);
        if (status) allTasks = allTasks.filter(t => t.status === status);
        
        return { count: allTasks.length, tasks: allTasks.slice(0, limit).map(t => ({
          ...t, dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString("es-ES") : null }))};
      },
    }),

    getTaskDetails: tool({
      description: "Obtiene los detalles completos de una tarea especifica por ID.",
      inputSchema: z.object({
        taskId: z.number().describe("ID de la tarea"),
      }),
      execute: async ({ taskId }) => {
        const result = await db.select().from(tasks)
          .where(and(eq(tasks.id, taskId), eq(tasks.organizationId, organizationId))).limit(1);
        const task = result[0];
        if (!task) return { found: false, message: "No se encontro la tarea" };
        
        let eventInfo = null;
        if (task.eventId) {
          const eventResult = await db.select({ id: events.id, name: events.name, date: events.date })
            .from(events).where(eq(events.id, task.eventId)).limit(1);
          if (eventResult[0]) {
            eventInfo = { id: eventResult[0].id, name: eventResult[0].name,
              date: eventResult[0].date ? new Date(eventResult[0].date).toLocaleDateString("es-ES") : null };
          }
        }
        return {
          found: true,
          task: { id: task.id, title: task.title, description: task.description,
            status: task.status, priority: task.priority, category: task.category,
            dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : null,
            createdAt: task.createdAt ? new Date(task.createdAt).toLocaleDateString("es-ES") : null },
          event: eventInfo,
        };
      },
    }),

    getTeamMembers: tool({
      description: "Obtiene los miembros del equipo.",
      inputSchema: z.object({}),
      execute: async () => {
        const members = await db.select({ userName: users.name, userEmail: users.email, roleName: roles.name })
          .from(organizationMembers).innerJoin(users, eq(users.id, organizationMembers.userId)).innerJoin(roles, eq(roles.id, organizationMembers.roleId))
          .where(eq(organizationMembers.organizationId, organizationId));
        return { count: members.length, members };
      },
    }),

    getDailySummary: tool({
      description: "Obtiene un resumen del dia con tareas pendientes y eventos proximos.",
      inputSchema: z.object({}),
      execute: async () => {
        const pendingTasks = await db.select({ id: tasks.id, title: tasks.title }).from(tasks)
          .where(and(eq(tasks.organizationId, organizationId), eq(tasks.status, "pending"))).limit(10);
        const upcomingEvents = await db.select({ id: events.id, name: events.name, date: events.date }).from(events)
          .where(eq(events.organizationId, organizationId)).orderBy(desc(events.date)).limit(5);
        return { date: new Date().toLocaleDateString("es-ES"), tasks: { pending: pendingTasks.length, list: pendingTasks.slice(0, 5) },
          events: { count: upcomingEvents.length, list: upcomingEvents.map(e => ({ ...e, date: e.date ? new Date(e.date).toLocaleDateString("es-ES") : null }))}};
      },
    }),

    getForms: tool({
      description: "Obtiene los formularios de la organizacion. Puede filtrar por estado.",
      inputSchema: z.object({
        status: z.enum(["draft", "active", "paused"]).optional().describe("Filtrar por estado"),
        limit: z.number().optional().default(20),
      }),
      execute: async ({ status, limit }) => {
        let allForms = await db.select({
          id: forms.id, name: forms.name, status: forms.status,
          description: forms.description, createdAt: forms.createdAt,
        }).from(forms).where(eq(forms.organizationId, organizationId)).orderBy(desc(forms.updatedAt)).limit(50);

        if (status) allForms = allForms.filter(f => f.status === status);

        return { count: allForms.length, forms: allForms.slice(0, limit).map(f => ({
          ...f, createdAt: f.createdAt ? new Date(f.createdAt).toLocaleDateString("es-ES") : null }))};
      },
    }),

    // ============================================
    // FINANCE TOOLS
    // ============================================

    getFinanceSummary: tool({
      description: "Obtiene un resumen financiero completo: totales facturados, cobrado, pendiente, por tipo de documento, y pagos recientes. Ideal para preguntas como '¿cuanto facture este mes?' o '¿cuanto me deben?'.",
      inputSchema: z.object({
        period: z.enum(["month", "quarter", "year", "all"]).optional().default("month").describe("Periodo del resumen"),
      }),
      execute: async ({ period }) => {
        const now = new Date();
        let fromDate: Date | null = null;
        if (period === "month") { fromDate = new Date(now.getFullYear(), now.getMonth(), 1); }
        else if (period === "quarter") { fromDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); }
        else if (period === "year") { fromDate = new Date(now.getFullYear(), 0, 1); }

        const dateFilter = fromDate
          ? and(eq(financialDocuments.organizationId, organizationId), gte(financialDocuments.issueDate, fromDate))
          : eq(financialDocuments.organizationId, organizationId);

        const docs = await db.select({
          type: financialDocuments.type,
          status: financialDocuments.status,
          total: financialDocuments.total,
          paidAmount: financialDocuments.paidAmount,
          currency: financialDocuments.currency,
        }).from(financialDocuments).where(dateFilter);

        const invoices = docs.filter(d => d.type === "invoice");
        const quotes = docs.filter(d => d.type === "quote");
        const proformas = docs.filter(d => d.type === "proforma");

        const sum = (arr: typeof docs) => arr.reduce((s, d) => s + parseFloat(d.total || "0"), 0);
        const sumPaid = (arr: typeof docs) => arr.reduce((s, d) => s + parseFloat(d.paidAmount || "0"), 0);

        const totalInvoiced = sum(invoices);
        const totalPaid = sumPaid(invoices);
        const totalPending = totalInvoiced - totalPaid;

        const paymentDateFilter = fromDate
          ? and(eq(paymentRecords.organizationId, organizationId), gte(paymentRecords.paymentDate, fromDate))
          : eq(paymentRecords.organizationId, organizationId);

        const payments = await db.select({
          direction: paymentRecords.direction,
          amount: paymentRecords.amount,
          status: paymentRecords.status,
        }).from(paymentRecords).where(paymentDateFilter);

        const totalIncoming = payments.filter(p => p.direction === "incoming" && p.status === "complete")
          .reduce((s, p) => s + parseFloat(p.amount || "0"), 0);
        const totalOutgoing = payments.filter(p => p.direction === "outgoing" && p.status === "complete")
          .reduce((s, p) => s + parseFloat(p.amount || "0"), 0);

        return {
          period,
          invoices: { count: invoices.length, total: totalInvoiced, paid: totalPaid, pending: totalPending,
            byStatus: { draft: invoices.filter(i => i.status === "draft").length, sent: invoices.filter(i => i.status === "sent").length, paid: invoices.filter(i => i.status === "paid").length } },
          quotes: { count: quotes.length, total: sum(quotes),
            accepted: quotes.filter(q => q.status === "accepted").length, pending: quotes.filter(q => q.status === "sent").length },
          proformas: { count: proformas.length, total: sum(proformas) },
          payments: { incoming: totalIncoming, outgoing: totalOutgoing, balance: totalIncoming - totalOutgoing },
          currency: "EUR",
        };
      },
    }),

    getDocuments: tool({
      description: "Obtiene documentos financieros (facturas, presupuestos, proformas, albaranes). Puede filtrar por tipo y estado.",
      inputSchema: z.object({
        type: z.enum(["invoice", "quote", "proforma", "delivery_note", "credit_note"]).optional().describe("Tipo de documento"),
        status: z.string().optional().describe("Estado: draft, sent, paid, accepted, rejected, etc."),
        limit: z.number().optional().default(15),
      }),
      execute: async ({ type, status, limit }) => {
        let docs = await db.select({
          id: financialDocuments.id, type: financialDocuments.type, number: financialDocuments.number,
          status: financialDocuments.status, total: financialDocuments.total, paidAmount: financialDocuments.paidAmount,
          currency: financialDocuments.currency, issueDate: financialDocuments.issueDate, dueDate: financialDocuments.dueDate,
          contactName: contacts.name,
        }).from(financialDocuments)
          .leftJoin(contacts, eq(financialDocuments.contactId, contacts.id))
          .where(eq(financialDocuments.organizationId, organizationId))
          .orderBy(desc(financialDocuments.issueDate)).limit(50);

        if (type) docs = docs.filter(d => d.type === type);
        if (status) docs = docs.filter(d => d.status === status);

        return { count: docs.length, documents: docs.slice(0, limit).map(d => ({
          ...d, total: d.total ? parseFloat(d.total) : 0, paidAmount: d.paidAmount ? parseFloat(d.paidAmount) : 0,
          issueDate: d.issueDate ? new Date(d.issueDate).toLocaleDateString("es-ES") : null,
          dueDate: d.dueDate ? new Date(d.dueDate).toLocaleDateString("es-ES") : null,
        }))};
      },
    }),

    getPayments: tool({
      description: "Obtiene los pagos registrados. Puede filtrar por direccion (cobros/pagos), estado, y evento.",
      inputSchema: z.object({
        direction: z.enum(["incoming", "outgoing"]).optional().describe("incoming=cobros, outgoing=pagos"),
        eventId: z.number().optional().describe("Filtrar por evento"),
        limit: z.number().optional().default(20),
      }),
      execute: async ({ direction, eventId, limit }) => {
        let rows = await db.select({
          id: paymentRecords.id, amount: paymentRecords.amount, currency: paymentRecords.currency,
          direction: paymentRecords.direction, paymentMethod: paymentRecords.paymentMethod,
          paymentDate: paymentRecords.paymentDate, status: paymentRecords.status, reference: paymentRecords.reference,
          contactName: contacts.name, eventName: events.name,
        }).from(paymentRecords)
          .leftJoin(contacts, eq(paymentRecords.contactId, contacts.id))
          .leftJoin(events, eq(paymentRecords.eventId, events.id))
          .where(eq(paymentRecords.organizationId, organizationId))
          .orderBy(desc(paymentRecords.paymentDate)).limit(50);

        if (direction) rows = rows.filter(r => r.direction === direction);
        if (eventId) rows = rows.filter(r => r.eventName !== null);

        return { count: rows.length, payments: rows.slice(0, limit).map(r => ({
          ...r, amount: r.amount ? parseFloat(r.amount) : 0,
          paymentDate: r.paymentDate ? new Date(r.paymentDate).toLocaleDateString("es-ES") : null,
        }))};
      },
    }),

    getPaymentSchedules: tool({
      description: "Obtiene los pagos programados/pendientes. Ideal para '¿que pagos tengo pendientes?' o '¿que vence pronto?'.",
      inputSchema: z.object({
        onlyPending: z.boolean().optional().default(true).describe("Solo mostrar pagos no pagados"),
        eventId: z.number().optional(),
        limit: z.number().optional().default(20),
      }),
      execute: async ({ onlyPending, eventId, limit }) => {
        const conditions = [eq(paymentSchedules.organizationId, organizationId)];
        if (onlyPending) conditions.push(eq(paymentSchedules.isPaid, false));
        if (eventId) conditions.push(eq(paymentSchedules.eventId, eventId));

        const rows = await db.select({
          id: paymentSchedules.id, name: paymentSchedules.name, amount: paymentSchedules.amount,
          dueDate: paymentSchedules.dueDate, isPaid: paymentSchedules.isPaid,
          eventName: events.name, vendorName: vendors.name,
        }).from(paymentSchedules)
          .leftJoin(events, eq(paymentSchedules.eventId, events.id))
          .leftJoin(vendors, eq(paymentSchedules.vendorId, vendors.id))
          .where(and(...conditions))
          .orderBy(asc(paymentSchedules.dueDate)).limit(limit);

        const totalPending = rows.filter(r => !r.isPaid).reduce((s, r) => s + parseFloat(r.amount || "0"), 0);

        return { count: rows.length, totalPending, schedules: rows.map(r => ({
          ...r, amount: r.amount ? parseFloat(r.amount) : 0,
          dueDate: r.dueDate ? new Date(r.dueDate).toLocaleDateString("es-ES") : null,
          isOverdue: r.dueDate && !r.isPaid ? new Date(r.dueDate) < new Date() : false,
        }))};
      },
    }),

    // ============================================
    // CONTACTS TOOLS
    // ============================================

    getContacts: tool({
      description: "Busca y lista contactos de la organizacion (personas, empresas, proveedores). Puede buscar por nombre o filtrar por tipo.",
      inputSchema: z.object({
        search: z.string().optional().describe("Buscar por nombre, email o telefono"),
        type: z.enum(["person", "company"]).optional(),
        isVendor: z.boolean().optional().describe("Solo proveedores"),
        isLead: z.boolean().optional().describe("Solo leads"),
        limit: z.number().optional().default(20),
      }),
      execute: async ({ search, type, isVendor, isLead, limit }) => {
        let rows = await db.select({
          id: contacts.id, name: contacts.name, type: contacts.type, email: contacts.email,
          phone: contacts.phone, isVendor: contacts.isVendor, isLead: contacts.isLead,
          category: contacts.category, city: contacts.city,
        }).from(contacts).where(eq(contacts.organizationId, organizationId))
          .orderBy(desc(contacts.createdAt)).limit(100);

        if (search) {
          const q = search.toLowerCase();
          rows = rows.filter(r => r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || r.phone?.includes(q));
        }
        if (type) rows = rows.filter(r => r.type === type);
        if (isVendor !== undefined) rows = rows.filter(r => r.isVendor === isVendor);
        if (isLead !== undefined) rows = rows.filter(r => r.isLead === isLead);

        return { count: rows.length, contacts: rows.slice(0, limit) };
      },
    }),

    // ============================================
    // GUESTS & RSVP TOOLS
    // ============================================

    getGuests: tool({
      description: "Obtiene la lista de invitados de un evento con estadisticas RSVP, menus, y conteo. Ideal para '¿cuantos confirmados tiene la boda?' o '¿cuantos vegetarianos?'.",
      inputSchema: z.object({
        eventId: z.number().describe("ID del evento"),
        rsvpStatus: z.enum(["confirmed", "pending", "declined"]).optional().describe("Filtrar por estado RSVP"),
      }),
      execute: async ({ eventId, rsvpStatus }) => {
        // Verify event belongs to org
        const [ev] = await db.select({ id: events.id, name: events.name }).from(events)
          .where(and(eq(events.id, eventId), eq(events.organizationId, organizationId))).limit(1);
        if (!ev) return { found: false, message: "Evento no encontrado" };

        const guestRows = await db.select({
          id: guests.id, firstName: guests.firstName, lastName: guests.lastName,
          email: guests.email, menuPreference: guests.menuPreference,
          rsvpStatus: rsvpResponses.status,
        }).from(guests)
          .leftJoin(rsvpResponses, eq(guests.id, rsvpResponses.guestId))
          .where(eq(guests.eventId, eventId));

        const total = guestRows.length;
        const confirmed = guestRows.filter(g => g.rsvpStatus === "confirmed").length;
        const pending = guestRows.filter(g => !g.rsvpStatus || g.rsvpStatus === "pending").length;
        const declined = guestRows.filter(g => g.rsvpStatus === "declined").length;

        const menuCounts: Record<string, number> = {};
        guestRows.forEach(g => {
          const menu = g.menuPreference || "Sin especificar";
          menuCounts[menu] = (menuCounts[menu] || 0) + 1;
        });

        let filteredGuests = guestRows;
        if (rsvpStatus) filteredGuests = guestRows.filter(g => g.rsvpStatus === rsvpStatus || (rsvpStatus === "pending" && !g.rsvpStatus));

        return {
          found: true, eventName: ev.name,
          stats: { total, confirmed, pending, declined },
          menus: menuCounts,
          guests: filteredGuests.slice(0, 30).map(g => ({
            name: `${g.firstName} ${g.lastName || ""}`.trim(),
            email: g.email, menu: g.menuPreference, rsvp: g.rsvpStatus || "pending",
          })),
        };
      },
    }),

    // ============================================
    // CRM / LEADS TOOLS
    // ============================================

    getLeads: tool({
      description: "Obtiene leads del pipeline de ventas con etapa, valor, probabilidad y contacto. Ideal para '¿cuantos leads tengo?' o '¿cual es el valor del pipeline?'.",
      inputSchema: z.object({
        stageId: z.number().optional().describe("Filtrar por etapa del pipeline"),
        limit: z.number().optional().default(20),
      }),
      execute: async ({ stageId, limit }) => {
        const conditions = [eq(leads.organizationId, organizationId), isNull(leads.deletedAt)];
        if (stageId) conditions.push(eq(leads.stageId, stageId));

        const rows = await db.select({
          id: leads.id, title: leads.title, value: leads.value, currency: leads.currency,
          probability: leads.probability, status: leads.status, source: leads.source,
          expectedCloseDate: leads.expectedCloseDate, stageName: leadStages.name,
          contactName: contacts.name, contactEmail: contacts.email,
        }).from(leads)
          .leftJoin(leadStages, eq(leads.stageId, leadStages.id))
          .leftJoin(contacts, eq(leads.contactId, contacts.id))
          .where(and(...conditions))
          .orderBy(desc(leads.createdAt)).limit(limit);

        const totalValue = rows.reduce((s, r) => s + parseFloat(r.value || "0"), 0);
        const weightedValue = rows.reduce((s, r) => s + parseFloat(r.value || "0") * (r.probability || 0) / 100, 0);

        // Get stages for context
        const stages = await db.select({ id: leadStages.id, name: leadStages.name, isWon: leadStages.isWon, isLost: leadStages.isLost })
          .from(leadStages).where(eq(leadStages.organizationId, organizationId)).orderBy(asc(leadStages.sortOrder));

        return {
          count: rows.length, totalValue, weightedValue,
          stages: stages.map(s => ({ ...s, leadsCount: rows.filter(r => r.stageName === s.name).length })),
          leads: rows.map(r => ({
            ...r, value: r.value ? parseFloat(r.value) : 0,
            expectedCloseDate: r.expectedCloseDate ? new Date(r.expectedCloseDate).toLocaleDateString("es-ES") : null,
          })),
        };
      },
    }),

    // ============================================
    // VENDORS TOOLS
    // ============================================

    getVendors: tool({
      description: "Obtiene los proveedores de la organizacion con sus categorias y eventos asignados.",
      inputSchema: z.object({
        category: z.string().optional().describe("Filtrar por categoria (ej: Catering, Fotografia, DJ)"),
        limit: z.number().optional().default(20),
      }),
      execute: async ({ category, limit }) => {
        let rows = await db.select({
          id: vendors.id, name: vendors.name, category: vendors.category,
          email: vendors.email, phone: vendors.phone, website: vendors.website,
          rating: vendors.rating,
        }).from(vendors).where(eq(vendors.organizationId, organizationId))
          .orderBy(vendors.name).limit(50);

        if (category) rows = rows.filter(r => r.category?.toLowerCase().includes(category.toLowerCase()));

        return { count: rows.length, vendors: rows.slice(0, limit) };
      },
    }),

    // ============================================
    // FORM SUBMISSIONS TOOL
    // ============================================

    getFormSubmissions: tool({
      description: "Obtiene las respuestas/submissions de un formulario especifico. Ideal para '¿cuantas respuestas tiene el formulario de briefing?'.",
      inputSchema: z.object({
        formId: z.number().describe("ID del formulario"),
        limit: z.number().optional().default(10),
      }),
      execute: async ({ formId, limit }) => {
        // Verify form belongs to org
        const [form] = await db.select({ id: forms.id, name: forms.name })
          .from(forms).where(and(eq(forms.id, formId), eq(forms.organizationId, organizationId))).limit(1);
        if (!form) return { found: false, message: "Formulario no encontrado" };

        const instances = await db.select({ id: formInstances.id, type: formInstances.type, slug: formInstances.slug, eventId: formInstances.eventId })
          .from(formInstances).where(eq(formInstances.formId, formId));

        const subs = await db.select({
          id: formSubmissions.id, respondentName: formSubmissions.respondentName,
          respondentEmail: formSubmissions.respondentEmail, createdAt: formSubmissions.createdAt,
          instanceId: formSubmissions.instanceId,
        }).from(formSubmissions)
          .where(eq(formSubmissions.formId, formId))
          .orderBy(desc(formSubmissions.createdAt)).limit(limit);

        return {
          found: true, formName: form.name,
          instances: instances.length, totalSubmissions: subs.length,
          submissions: subs.map(s => ({
            id: s.id, name: s.respondentName, email: s.respondentEmail,
            date: s.createdAt ? new Date(s.createdAt).toLocaleDateString("es-ES") : null,
          })),
        };
      },
    }),

    // ============================================
    // ENHANCED EVENT FULL REPORT
    // ============================================

    getEventFullReport: tool({
      description: "Genera un reporte completo de un evento: tareas, proveedores, invitados, finanzas, formularios. Ideal para '¿como va la boda?' o 'dame un resumen completo del evento'.",
      inputSchema: z.object({
        eventId: z.number().optional().describe("ID del evento"),
        eventName: z.string().optional().describe("Nombre del evento"),
      }),
      execute: async ({ eventId, eventName }) => {
        let event;
        if (eventId) {
          const result = await db.select().from(events)
            .where(and(eq(events.id, eventId), eq(events.organizationId, organizationId))).limit(1);
          event = result[0];
        } else if (eventName) {
          const allEvents = await db.select().from(events)
            .where(eq(events.organizationId, organizationId)).limit(50);
          event = allEvents.find(e => e.name?.toLowerCase().includes(eventName.toLowerCase()));
        }
        if (!event) return { found: false, message: "No se encontro el evento" };

        // Tasks
        const eventTasks = await db.select({
          id: tasks.id, title: tasks.title, status: tasks.status, priority: tasks.priority, dueDate: tasks.dueDate,
        }).from(tasks).where(eq(tasks.eventId, event.id));

        const tasksByStatus = {
          pending: eventTasks.filter(t => t.status === "pending").length,
          in_progress: eventTasks.filter(t => t.status === "in_progress").length,
          completed: eventTasks.filter(t => t.status === "completed").length,
          total: eventTasks.length,
          overdue: eventTasks.filter(t => t.dueDate && t.status !== "completed" && new Date(t.dueDate) < new Date()).length,
        };

        // Vendors
        const eventVendorsList = await db.select({
          vendorName: vendors.name, vendorCategory: vendors.category, status: eventVendors.status,
        }).from(eventVendors)
          .innerJoin(vendors, eq(vendors.id, eventVendors.vendorId))
          .where(eq(eventVendors.eventId, event.id));

        // Guests & RSVP
        const guestRows = await db.select({
          id: guests.id, rsvpStatus: rsvpResponses.status, menuPreference: guests.menuPreference,
        }).from(guests)
          .leftJoin(rsvpResponses, eq(guests.id, rsvpResponses.guestId))
          .where(eq(guests.eventId, event.id));

        const guestStats = {
          total: guestRows.length,
          confirmed: guestRows.filter(g => g.rsvpStatus === "confirmed").length,
          pending: guestRows.filter(g => !g.rsvpStatus || g.rsvpStatus === "pending").length,
          declined: guestRows.filter(g => g.rsvpStatus === "declined").length,
        };

        // Finance for this event
        const eventDocs = await db.select({
          type: financialDocuments.type, status: financialDocuments.status,
          total: financialDocuments.total, paidAmount: financialDocuments.paidAmount,
        }).from(financialDocuments)
          .where(and(eq(financialDocuments.organizationId, organizationId), eq(financialDocuments.eventId, event.id)));

        const eventPayments = await db.select({
          amount: paymentRecords.amount, direction: paymentRecords.direction,
        }).from(paymentRecords)
          .where(and(eq(paymentRecords.organizationId, organizationId), eq(paymentRecords.eventId, event.id)));

        const totalInvoiced = eventDocs.filter(d => d.type === "invoice").reduce((s, d) => s + parseFloat(d.total || "0"), 0);
        const totalPaid = eventDocs.filter(d => d.type === "invoice").reduce((s, d) => s + parseFloat(d.paidAmount || "0"), 0);
        const totalQuoted = eventDocs.filter(d => d.type === "quote").reduce((s, d) => s + parseFloat(d.total || "0"), 0);
        const incomingPayments = eventPayments.filter(p => p.direction === "incoming").reduce((s, p) => s + parseFloat(p.amount || "0"), 0);
        const outgoingPayments = eventPayments.filter(p => p.direction === "outgoing").reduce((s, p) => s + parseFloat(p.amount || "0"), 0);

        // Forms
        const eventForms = await db.select({ id: formInstances.id, formName: forms.name, type: formInstances.type, slug: formInstances.slug })
          .from(formInstances).leftJoin(forms, eq(formInstances.formId, forms.id))
          .where(eq(formInstances.eventId, event.id));

        const daysUntilEvent = event.date ? Math.ceil((new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

        return {
          found: true,
          event: { id: event.id, name: event.name, type: event.type, status: event.status,
            date: event.date ? new Date(event.date).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : null,
            location: event.location, guestCount: event.guestCount, daysUntilEvent },
          tasks: tasksByStatus,
          urgentTasks: eventTasks.filter(t => t.dueDate && t.status !== "completed" && new Date(t.dueDate) < new Date())
            .map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString("es-ES") : null })),
          vendors: { count: eventVendorsList.length, list: eventVendorsList },
          guests: guestStats,
          finance: { totalQuoted, totalInvoiced, totalPaid, pendingCollection: totalInvoiced - totalPaid,
            incomingPayments, outgoingPayments, documentsCount: eventDocs.length },
          forms: { count: eventForms.length, list: eventForms },
        };
      },
    }),
  };
}
