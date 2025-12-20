import { db } from "@/db";
import { 
  events, 
  eventTemplates,
  taskTemplates,
  eventParticipants,
  tasks,
  clients,
  users
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type { TenantSession, PaginationParams, FilterParams } from "@/types";

// ============================================
// EVENTS
// ============================================

export async function getEvents(
  session: TenantSession,
  params: PaginationParams & FilterParams & { status?: string; type?: string } = {}
) {
  const { page = 1, limit = 50, status, type } = params;
  const offset = (page - 1) * limit;

  let whereClause = eq(events.organizationId, session.organizationId);

  if (status) {
    whereClause = and(whereClause, eq(events.status, status as any))!;
  }

  if (type) {
    whereClause = and(whereClause, eq(events.type, type as any))!;
  }

  const results = await db
    .select({
      id: events.id,
      name: events.name,
      type: events.type,
      status: events.status,
      date: events.date,
      endDate: events.endDate,
      location: events.location,
      guestCount: events.guestCount,
      budget: events.budget,
      description: events.description,
      clientId: events.clientId,
      createdAt: events.createdAt,
      clientName: clients.name,
    })
    .from(events)
    .leftJoin(clients, eq(events.clientId, clients.id))
    .where(whereClause)
    .orderBy(desc(events.date))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(whereClause);

  return {
    data: results,
    meta: {
      page,
      limit,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / limit),
    },
  };
}

export async function getEvent(session: TenantSession, eventId: number) {
  const event = await db.query.events.findFirst({
    where: (e, { eq, and }) => 
      and(
        eq(e.id, eventId),
        eq(e.organizationId, session.organizationId)
      ),
  });

  if (!event) return null;

  // Get participants
  const participants = await db
    .select({
      id: eventParticipants.id,
      userId: eventParticipants.userId,
      vendorId: eventParticipants.vendorId,
      clientId: eventParticipants.clientId,
      type: eventParticipants.type,
      role: eventParticipants.role,
      invitedAt: eventParticipants.invitedAt,
      acceptedAt: eventParticipants.acceptedAt,
      userName: users.name,
      userImage: users.image,
    })
    .from(eventParticipants)
    .leftJoin(users, eq(eventParticipants.userId, users.id))
    .where(eq(eventParticipants.eventId, eventId));

  // Get tasks count
  const [{ taskCount }] = await db
    .select({ taskCount: sql<number>`count(*)` })
    .from(tasks)
    .where(eq(tasks.eventId, eventId));

  // Get client
  const client = event.clientId
    ? await db.query.clients.findFirst({ where: (c, { eq }) => eq(c.id, event.clientId!) })
    : null;

  return {
    ...event,
    participants,
    taskCount: Number(taskCount),
    client,
  };
}

export async function createEvent(
  session: TenantSession,
  data: {
    name: string;
    type?: "wedding" | "pre_wedding" | "post_wedding" | "birthday" | "corporate" | "social" | "other";
    date?: Date;
    endDate?: Date;
    location?: string;
    guestCount?: number;
    budget?: number;
    description?: string;
    clientId?: number;
    templateId?: number;
  }
) {
  const [event] = await db.insert(events).values({
    organizationId: session.organizationId,
    name: data.name,
    type: data.type || "wedding",
    status: "draft",
    date: data.date,
    endDate: data.endDate,
    location: data.location,
    guestCount: data.guestCount || 0,
    budget: data.budget?.toString(),
    description: data.description,
    clientId: data.clientId,
    createdBy: session.user.userId,
  }).returning();

  // If template provided, create tasks from template
  if (data.templateId) {
    await createTasksFromTemplate(session, event.id, data.templateId, data.date);
  }

  return event;
}

export async function updateEvent(
  session: TenantSession,
  eventId: number,
  data: Partial<{
    name: string;
    type: string;
    status: string;
    date: Date;
    endDate: Date;
    location: string;
    guestCount: number;
    budget: number;
    description: string;
    clientId: number;
  }>
) {
  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  
  if (data.budget !== undefined) {
    updateData.budget = data.budget.toString();
  }

  const [updated] = await db.update(events)
    .set(updateData)
    .where(
      and(
        eq(events.id, eventId),
        eq(events.organizationId, session.organizationId)
      )
    )
    .returning();

  return updated;
}

export async function deleteEvent(session: TenantSession, eventId: number) {
  await db.delete(events)
    .where(
      and(
        eq(events.id, eventId),
        eq(events.organizationId, session.organizationId)
      )
    );
}

// ============================================
// EVENT TEMPLATES
// ============================================

export async function getEventTemplates(session: TenantSession) {
  // Get org-specific and global templates
  const templates = await db.query.eventTemplates.findMany({
    where: (t, { eq, or, and, isNull }) => 
      and(
        eq(t.isActive, true),
        or(
          eq(t.organizationId, session.organizationId),
          eq(t.isGlobal, true),
          isNull(t.organizationId)
        )
      ),
    orderBy: (t, { asc }) => [asc(t.name)],
  });

  return templates;
}

export async function getEventTemplate(session: TenantSession, templateId: number) {
  const template = await db.query.eventTemplates.findFirst({
    where: (t, { eq }) => eq(t.id, templateId),
  });

  if (!template) return null;

  // Get task templates
  const taskTpls = await db.query.taskTemplates.findMany({
    where: (t, { eq }) => eq(t.eventTemplateId, templateId),
    orderBy: (t, { asc }) => [asc(t.sortOrder)],
  });

  return {
    ...template,
    tasks: taskTpls,
  };
}

export async function createEventTemplate(
  session: TenantSession,
  data: {
    name: string;
    eventType?: "wedding" | "birthday" | "corporate" | "social" | "other";
    description?: string;
    defaultBudget?: number;
    isGlobal?: boolean;
    tasks?: Array<{
      title: string;
      description?: string;
      category?: string;
      daysBeforeEvent?: number;
      daysAfterEvent?: number;
      assignToRole?: string;
      priority?: string;
      estimatedHours?: number;
    }>;
  }
) {
  const [template] = await db.insert(eventTemplates).values({
    organizationId: data.isGlobal ? null : session.organizationId,
    name: data.name,
    eventType: data.eventType,
    description: data.description,
    defaultBudget: data.defaultBudget?.toString(),
    isGlobal: data.isGlobal || false,
  }).returning();

  // Create task templates
  if (data.tasks && data.tasks.length > 0) {
    for (let i = 0; i < data.tasks.length; i++) {
      const task = data.tasks[i];
      await db.insert(taskTemplates).values({
        eventTemplateId: template.id,
        title: task.title,
        description: task.description,
        category: task.category,
        daysBeforeEvent: task.daysBeforeEvent,
        daysAfterEvent: task.daysAfterEvent,
        assignToRole: task.assignToRole,
        priority: task.priority || "medium",
        estimatedHours: task.estimatedHours?.toString(),
        sortOrder: i,
      });
    }
  }

  return getEventTemplate(session, template.id);
}

// ============================================
// CREATE TASKS FROM TEMPLATE
// ============================================

async function createTasksFromTemplate(
  session: TenantSession,
  eventId: number,
  templateId: number,
  eventDate?: Date
) {
  const template = await getEventTemplate(session, templateId);
  if (!template || !template.tasks) return;

  const baseDate = eventDate || new Date();

  for (const taskTpl of template.tasks) {
    // Calculate due date based on days before/after event
    let dueDate: Date | undefined;
    
    if (taskTpl.daysBeforeEvent) {
      dueDate = new Date(baseDate);
      dueDate.setDate(dueDate.getDate() - taskTpl.daysBeforeEvent);
    } else if (taskTpl.daysAfterEvent) {
      dueDate = new Date(baseDate);
      dueDate.setDate(dueDate.getDate() + taskTpl.daysAfterEvent);
    }

    await db.insert(tasks).values({
      organizationId: session.organizationId,
      title: taskTpl.title,
      description: taskTpl.description,
      status: "pending",
      priority: taskTpl.priority || "medium",
      dueDate,
      eventId,
      createdBy: session.user.userId,
    });
  }
}

// ============================================
// EVENT PARTICIPANTS
// ============================================

export async function getEventParticipants(eventId: number) {
  return db
    .select({
      id: eventParticipants.id,
      userId: eventParticipants.userId,
      vendorId: eventParticipants.vendorId,
      clientId: eventParticipants.clientId,
      type: eventParticipants.type,
      role: eventParticipants.role,
      invitedAt: eventParticipants.invitedAt,
      acceptedAt: eventParticipants.acceptedAt,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
    })
    .from(eventParticipants)
    .leftJoin(users, eq(eventParticipants.userId, users.id))
    .where(eq(eventParticipants.eventId, eventId));
}

export async function addEventParticipant(
  session: TenantSession,
  eventId: number,
  data: {
    userId?: string;
    vendorId?: number;
    clientId?: number;
    type: "planner" | "vendor" | "client" | "assistant" | "guest";
    role?: string;
  }
) {
  const [participant] = await db.insert(eventParticipants).values({
    eventId,
    userId: data.userId,
    vendorId: data.vendorId,
    clientId: data.clientId,
    type: data.type,
    role: data.role,
    invitedBy: session.user.userId,
  }).returning();

  return participant;
}

export async function removeEventParticipant(participantId: number) {
  await db.delete(eventParticipants)
    .where(eq(eventParticipants.id, participantId));
}

export async function acceptEventInvitation(participantId: number) {
  const [updated] = await db.update(eventParticipants)
    .set({ acceptedAt: new Date() })
    .where(eq(eventParticipants.id, participantId))
    .returning();

  return updated;
}
