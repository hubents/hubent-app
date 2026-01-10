import { tool } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { events, tasks, payments, contacts, organizationMembers, users, roles, eventVendors, vendors } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

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
      description: "Obtiene detalles de un evento por ID o nombre.",
      inputSchema: z.object({
        eventId: z.number().optional(),
        eventName: z.string().optional(),
      }),
      execute: async ({ eventId, eventName }) => {
        const allEvents = await db.select().from(events).where(eq(events.organizationId, organizationId)).limit(20);
        const event = eventId ? allEvents.find(e => e.id === eventId) : allEvents.find(e => e.name?.toLowerCase().includes(eventName?.toLowerCase() || ""));
        if (!event) return { found: false, message: "No se encontro el evento" };
        const eventTasks = await db.select({ id: tasks.id, title: tasks.title, status: tasks.status }).from(tasks).where(eq(tasks.eventId, event.id)).limit(10);
        return { found: true, event: { ...event, date: event.date ? new Date(event.date).toLocaleDateString("es-ES") : null }, tasks: { total: eventTasks.length, pending: eventTasks.filter(t => t.status === "pending").length, list: eventTasks }};
      },
    }),

    getTasks: tool({
      description: "Obtiene las tareas de la organizacion.",
      inputSchema: z.object({
        status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
        limit: z.number().optional().default(15),
      }),
      execute: async ({ status, limit }) => {
        const allTasks = await db.select({ id: tasks.id, title: tasks.title, status: tasks.status, priority: tasks.priority, dueDate: tasks.dueDate })
          .from(tasks).where(eq(tasks.organizationId, organizationId)).orderBy(desc(tasks.dueDate)).limit(50);
        const filtered = status ? allTasks.filter(t => t.status === status) : allTasks;
        return { count: filtered.length, tasks: filtered.slice(0, limit).map(t => ({ ...t, dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString("es-ES") : null }))};
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
  };
}
