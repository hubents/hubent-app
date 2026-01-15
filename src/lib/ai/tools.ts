import { tool } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { events, tasks, organizationMembers, users, roles, eventVendors, vendors } from "@/db/schema";
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
      description: "Obtiene las tareas de la organizacion. Puede filtrar por estado y/o por evento.",
      inputSchema: z.object({
        status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional().describe("Filtrar por estado"),
        eventId: z.number().optional().describe("Filtrar por ID de evento"),
        limit: z.number().optional().default(20),
      }),
      execute: async ({ status, eventId, limit }) => {
        let allTasks = await db.select({
          id: tasks.id, title: tasks.title, status: tasks.status,
          priority: tasks.priority, dueDate: tasks.dueDate, eventId: tasks.eventId,
        }).from(tasks).where(eq(tasks.organizationId, organizationId)).orderBy(desc(tasks.dueDate)).limit(100);
        
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
  };
}
