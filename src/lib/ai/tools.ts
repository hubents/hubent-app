import { z } from "zod";
import { db } from "@/db";
import { events, tasks, payments, contacts, organizationMembers, users, roles } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

interface UserContext {
  userId: string;
  organizationId: number;
  role: string;
}

export function createAITools(userContext: UserContext) {
  const { userId, organizationId } = userContext;

  return {
    getEvents: {
      description: "Obtiene eventos",
      parameters: z.object({ limit: z.number().default(10) }),
      execute: async ({ limit }: { limit: number }) => {
        const results = await db.select({ id: events.id, name: events.name, date: events.date })
          .from(events).where(eq(events.organizationId, organizationId)).limit(limit);
        return { success: true, events: results };
      },
    },
    getTasks: {
      description: "Obtiene tareas",
      parameters: z.object({ limit: z.number().default(15) }),
      execute: async ({ limit }: { limit: number }) => {
        const results = await db.select({ id: tasks.id, title: tasks.title, status: tasks.status })
          .from(tasks).where(eq(tasks.organizationId, organizationId)).limit(limit);
        return { success: true, tasks: results };
      },
    },
    getTeamMembers: {
      description: "Obtiene miembros del equipo",
      parameters: z.object({}),
      execute: async () => {
        const members = await db.select({ userName: users.name, roleName: roles.name })
          .from(organizationMembers)
          .innerJoin(users, eq(users.id, organizationMembers.userId))
          .innerJoin(roles, eq(roles.id, organizationMembers.roleId))
          .where(eq(organizationMembers.organizationId, organizationId));
        return { success: true, members };
      },
    },
    getDailySummary: {
      description: "Resumen del dia",
      parameters: z.object({}),
      execute: async () => {
        const pendingTasks = await db.select({ id: tasks.id }).from(tasks)
          .where(and(eq(tasks.organizationId, organizationId), eq(tasks.status, "pending"))).limit(50);
        return { success: true, summary: { tasks: pendingTasks.length } };
      },
    },
  };
}

export type AITools = ReturnType<typeof createAITools>;
