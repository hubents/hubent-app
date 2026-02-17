import { db } from "@/db";
import { 
  events, 
  eventTemplates,
  taskTemplates,
  taskTemplateChecklists,
  eventParticipants,
  tasks,
  taskChecklistItems,
  taskHtmlContent,
  clients,
  users,
  payments,
  leads,
  financialDocuments,
  paymentRecords,
} from "@/db/schema";
import { eq, and, desc, sql, asc } from "drizzle-orm";
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

  // For eventScoped roles, filter to only events where user is a participant
  if (session.eventScoped) {
    whereClause = and(
      whereClause,
      sql`${events.id} IN (
        SELECT ${eventParticipants.eventId} 
        FROM ${eventParticipants} 
        WHERE ${eventParticipants.userId} = ${session.user.userId}
      )`
    )!;
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

  // For eventScoped roles, verify user is a participant of this event
  if (session.eventScoped) {
    const [isParticipant] = await db
      .select({ id: eventParticipants.id })
      .from(eventParticipants)
      .where(
        and(
          eq(eventParticipants.eventId, eventId),
          eq(eventParticipants.userId, session.user.userId)
        )
      )
      .limit(1);
    if (!isParticipant) return null;
  }

  // Get participants
  const participants = await db
    .select({
      id: eventParticipants.id,
      userId: eventParticipants.userId,
      vendorId: eventParticipants.vendorId,
      clientId: eventParticipants.clientId,
      type: eventParticipants.type,
      role: eventParticipants.role,
      permissions: eventParticipants.permissions,
      invitedAt: eventParticipants.invitedAt,
      acceptedAt: eventParticipants.acceptedAt,
      userName: users.name,
      userEmail: users.email,
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
    date: Date | string | null;
    endDate: Date | string | null;
    location: string;
    guestCount: number;
    budget: number;
    description: string;
    clientId: number;
  }>
) {
  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  
  // Handle date conversion - accept string, Date, or null
  if (data.date !== undefined) {
    updateData.date = data.date ? (typeof data.date === 'string' ? new Date(data.date) : data.date) : null;
  }
  if (data.endDate !== undefined) {
    updateData.endDate = data.endDate ? (typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate) : null;
  }
  
  if (data.budget !== undefined) {
    updateData.budget = data.budget?.toString() || null;
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
  // Nullify FK references in tables without onDelete cascade
  await db.update(tasks).set({ eventId: null }).where(eq(tasks.eventId, eventId));
  await db.update(payments).set({ eventId: null }).where(eq(payments.eventId, eventId));
  await db.update(leads).set({ eventId: null }).where(eq(leads.eventId, eventId));
  await db.update(financialDocuments).set({ eventId: null }).where(eq(financialDocuments.eventId, eventId));
  await db.update(paymentRecords).set({ eventId: null }).where(eq(paymentRecords.eventId, eventId));

  await db.delete(events)
    .where(
      and(
        eq(events.id, eventId),
        eq(events.organizationId, session.organizationId)
      )
    );
}

export async function cancelEvent(session: TenantSession, eventId: number) {
  // Get task count for this event
  const [{ taskCount }] = await db
    .select({ taskCount: sql<number>`count(*)` })
    .from(tasks)
    .where(eq(tasks.eventId, eventId));

  // Update event status to cancelled
  const [updated] = await db.update(events)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(events.id, eventId),
        eq(events.organizationId, session.organizationId)
      )
    )
    .returning();

  // Also cancel all associated tasks
  if (Number(taskCount) > 0) {
    await db.update(tasks)
      .set({ status: "cancelled" })
      .where(eq(tasks.eventId, eventId));
  }

  return {
    event: updated,
    cancelledTasks: Number(taskCount),
  };
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
  const taskTpls = await db
    .select()
    .from(taskTemplates)
    .where(eq(taskTemplates.eventTemplateId, templateId))
    .orderBy(asc(taskTemplates.sortOrder));

  // Get checklists for each task template
  const tasksWithChecklists = await Promise.all(
    taskTpls.map(async (task) => {
      const checklists = await db
        .select()
        .from(taskTemplateChecklists)
        .where(eq(taskTemplateChecklists.taskTemplateId, task.id))
        .orderBy(asc(taskTemplateChecklists.sortOrder));
      return { ...task, checklists };
    })
  );

  return {
    ...template,
    tasks: tasksWithChecklists,
  };
}

export async function createEventTemplate(
  session: TenantSession,
  data: {
    name: string;
    eventType?: "wedding" | "pre_wedding" | "post_wedding" | "birthday" | "corporate" | "social" | "other";
    description?: string;
    defaultBudget?: number;
    isGlobal?: boolean;
    tasks?: Array<{
      title: string;
      description?: string;
      htmlContent?: string;
      category?: string;
      daysBeforeEvent?: number;
      daysAfterEvent?: number;
      assignToRole?: string;
      priority?: string;
      estimatedHours?: number;
      checklists?: string[];
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

  // Create task templates with checklists
  if (data.tasks && data.tasks.length > 0) {
    for (let i = 0; i < data.tasks.length; i++) {
      const task = data.tasks[i];
      const [taskTpl] = await db.insert(taskTemplates).values({
        eventTemplateId: template.id,
        title: task.title,
        description: task.description,
        htmlContent: task.htmlContent,
        category: task.category,
        daysBeforeEvent: task.daysBeforeEvent,
        daysAfterEvent: task.daysAfterEvent,
        assignToRole: task.assignToRole,
        priority: task.priority || "medium",
        estimatedHours: task.estimatedHours?.toString(),
        sortOrder: i,
      }).returning();

      // Create checklist items for this task template
      if (task.checklists && task.checklists.length > 0) {
        for (let j = 0; j < task.checklists.length; j++) {
          await db.insert(taskTemplateChecklists).values({
            taskTemplateId: taskTpl.id,
            title: task.checklists[j],
            sortOrder: j,
          });
        }
      }
    }
  }

  return getEventTemplate(session, template.id);
}

export async function updateEventTemplate(
  session: TenantSession,
  templateId: number,
  data: {
    name?: string;
    eventType?: string;
    description?: string;
    defaultBudget?: number;
    isActive?: boolean;
  }
) {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  
  if (data.name !== undefined) updateData.name = data.name;
  if (data.eventType !== undefined) updateData.eventType = data.eventType;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.defaultBudget !== undefined) updateData.defaultBudget = data.defaultBudget?.toString();
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const [updated] = await db.update(eventTemplates)
    .set(updateData)
    .where(eq(eventTemplates.id, templateId))
    .returning();

  return updated;
}

export async function deleteEventTemplate(templateId: number) {
  await db.delete(eventTemplates).where(eq(eventTemplates.id, templateId));
}

export async function addTaskToTemplate(
  templateId: number,
  data: {
    title: string;
    description?: string;
    htmlContent?: string;
    category?: string;
    daysBeforeEvent?: number;
    daysAfterEvent?: number;
    priority?: string;
    checklists?: string[];
  }
) {
  // Get max sort order
  const existingTasks = await db
    .select({ sortOrder: taskTemplates.sortOrder })
    .from(taskTemplates)
    .where(eq(taskTemplates.eventTemplateId, templateId))
    .orderBy(desc(taskTemplates.sortOrder))
    .limit(1);

  const newSortOrder = (existingTasks[0]?.sortOrder || 0) + 1;

  const [taskTpl] = await db.insert(taskTemplates).values({
    eventTemplateId: templateId,
    title: data.title,
    description: data.description,
    htmlContent: data.htmlContent,
    category: data.category,
    daysBeforeEvent: data.daysBeforeEvent,
    daysAfterEvent: data.daysAfterEvent,
    priority: data.priority || "medium",
    sortOrder: newSortOrder,
  }).returning();

  // Create checklist items
  if (data.checklists && data.checklists.length > 0) {
    for (let j = 0; j < data.checklists.length; j++) {
      await db.insert(taskTemplateChecklists).values({
        taskTemplateId: taskTpl.id,
        title: data.checklists[j],
        sortOrder: j,
      });
    }
  }

  return taskTpl;
}

export async function updateTaskTemplate(
  taskTemplateId: number,
  data: {
    title?: string;
    description?: string;
    htmlContent?: string;
    category?: string;
    daysBeforeEvent?: number;
    daysAfterEvent?: number;
    priority?: string;
    sortOrder?: number;
  }
) {
  const updateData: Record<string, unknown> = {};
  
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.htmlContent !== undefined) updateData.htmlContent = data.htmlContent;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.daysBeforeEvent !== undefined) updateData.daysBeforeEvent = data.daysBeforeEvent;
  if (data.daysAfterEvent !== undefined) updateData.daysAfterEvent = data.daysAfterEvent;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

  const [updated] = await db.update(taskTemplates)
    .set(updateData)
    .where(eq(taskTemplates.id, taskTemplateId))
    .returning();

  return updated;
}

export async function deleteTaskTemplate(taskTemplateId: number) {
  await db.delete(taskTemplates).where(eq(taskTemplates.id, taskTemplateId));
}

export async function addChecklistToTaskTemplate(taskTemplateId: number, title: string) {
  const existing = await db
    .select({ sortOrder: taskTemplateChecklists.sortOrder })
    .from(taskTemplateChecklists)
    .where(eq(taskTemplateChecklists.taskTemplateId, taskTemplateId))
    .orderBy(desc(taskTemplateChecklists.sortOrder))
    .limit(1);

  const newSortOrder = (existing[0]?.sortOrder || 0) + 1;

  const [item] = await db.insert(taskTemplateChecklists).values({
    taskTemplateId,
    title,
    sortOrder: newSortOrder,
  }).returning();

  return item;
}

export async function deleteChecklistFromTaskTemplate(checklistId: number) {
  await db.delete(taskTemplateChecklists).where(eq(taskTemplateChecklists.id, checklistId));
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

  for (let i = 0; i < template.tasks.length; i++) {
    const taskTpl = template.tasks[i];
    // Calculate due date based on days before/after event
    let dueDate: Date | undefined;
    
    if (taskTpl.daysBeforeEvent) {
      dueDate = new Date(baseDate);
      dueDate.setDate(dueDate.getDate() - taskTpl.daysBeforeEvent);
    } else if (taskTpl.daysAfterEvent) {
      dueDate = new Date(baseDate);
      dueDate.setDate(dueDate.getDate() + taskTpl.daysAfterEvent);
    }

    const [newTask] = await db.insert(tasks).values({
      organizationId: session.organizationId,
      title: taskTpl.title,
      description: taskTpl.description,
      category: taskTpl.category,
      status: "pending",
      priority: taskTpl.priority || "medium",
      dueDate,
      eventId,
      createdBy: session.user.userId,
      sortOrder: i,
    }).returning();

    // Create HTML content if exists
    if (taskTpl.htmlContent) {
      await db.insert(taskHtmlContent).values({
        taskId: newTask.id,
        content: taskTpl.htmlContent,
        updatedBy: session.user.userId,
      });
    }

    // Create checklist items from template
    if (taskTpl.checklists && taskTpl.checklists.length > 0) {
      for (let i = 0; i < taskTpl.checklists.length; i++) {
        await db.insert(taskChecklistItems).values({
          taskId: newTask.id,
          title: taskTpl.checklists[i].title,
          sortOrder: i,
          createdBy: session.user.userId,
        });
      }
    }
  }
}

// ============================================
// DUPLICATE EVENT
// ============================================

export async function duplicateEvent(
  session: TenantSession,
  eventId: number,
  options: {
    newName?: string;
    newDate?: Date;
    includeTasks?: boolean;
    includeChecklists?: boolean;
  } = {}
) {
  const { 
    newName, 
    newDate, 
    includeTasks = true, 
    includeChecklists = true 
  } = options;

  // Get original event
  const originalEvent = await getEvent(session, eventId);
  if (!originalEvent) {
    throw new Error("Event not found");
  }

  // Create new event
  const [newEvent] = await db.insert(events).values({
    organizationId: session.organizationId,
    name: newName || `${originalEvent.name} (copia)`,
    type: originalEvent.type,
    status: "draft",
    date: newDate || null,
    endDate: null,
    location: originalEvent.location,
    guestCount: originalEvent.guestCount,
    budget: originalEvent.budget,
    description: originalEvent.description,
    clientId: originalEvent.clientId,
    createdBy: session.user.userId,
  }).returning();

  // Duplicate tasks if requested
  if (includeTasks) {
    const originalTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.eventId, eventId))
      .orderBy(asc(tasks.id));

    for (const task of originalTasks) {
      // Calculate new due date if both original event date and task due date exist
      let newDueDate: Date | null = null;
      if (newDate && originalEvent.date && task.dueDate) {
        const daysDiff = Math.floor(
          (task.dueDate.getTime() - originalEvent.date.getTime()) / (1000 * 60 * 60 * 24)
        );
        newDueDate = new Date(newDate);
        newDueDate.setDate(newDueDate.getDate() + daysDiff);
      }

      const [newTask] = await db.insert(tasks).values({
        organizationId: session.organizationId,
        title: task.title,
        description: task.description,
        category: task.category,
        status: "pending",
        priority: task.priority,
        dueDate: newDueDate,
        eventId: newEvent.id,
        createdBy: session.user.userId,
        sortOrder: task.sortOrder,
      }).returning();

      // Duplicate HTML content
      const [htmlContent] = await db
        .select()
        .from(taskHtmlContent)
        .where(eq(taskHtmlContent.taskId, task.id))
        .limit(1);

      if (htmlContent) {
        await db.insert(taskHtmlContent).values({
          taskId: newTask.id,
          content: htmlContent.content,
          updatedBy: session.user.userId,
        });
      }

      // Duplicate checklists if requested
      if (includeChecklists) {
        const checklists = await db
          .select()
          .from(taskChecklistItems)
          .where(eq(taskChecklistItems.taskId, task.id))
          .orderBy(asc(taskChecklistItems.sortOrder));

        for (const checklist of checklists) {
          await db.insert(taskChecklistItems).values({
            taskId: newTask.id,
            title: checklist.title,
            sortOrder: checklist.sortOrder,
            isCompleted: false,
            createdBy: session.user.userId,
          });
        }
      }
    }
  }

  return newEvent;
}

// ============================================
// SAVE EVENT AS TEMPLATE
// ============================================

export async function saveEventAsTemplate(
  session: TenantSession,
  eventId: number,
  options: {
    templateName: string;
    description?: string;
    isGlobal?: boolean;
  }
) {
  const event = await getEvent(session, eventId);
  if (!event) {
    throw new Error("Event not found");
  }

  // Create event template
  const [template] = await db.insert(eventTemplates).values({
    organizationId: options.isGlobal ? null : session.organizationId,
    name: options.templateName,
    eventType: event.type,
    description: options.description || event.description,
    defaultBudget: event.budget,
    isGlobal: options.isGlobal || false,
  }).returning();

  // Get tasks for this event
  const eventTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.eventId, eventId))
    .orderBy(asc(tasks.id));

  // Create task templates from tasks
  for (let i = 0; i < eventTasks.length; i++) {
    const task = eventTasks[i];

    // Calculate days before event
    let daysBeforeEvent: number | null = null;
    if (event.date && task.dueDate) {
      daysBeforeEvent = Math.floor(
        (event.date.getTime() - task.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Get HTML content
    const [htmlContent] = await db
      .select()
      .from(taskHtmlContent)
      .where(eq(taskHtmlContent.taskId, task.id))
      .limit(1);

    const [taskTpl] = await db.insert(taskTemplates).values({
      eventTemplateId: template.id,
      title: task.title,
      description: task.description,
      htmlContent: htmlContent?.content,
      category: task.category,
      daysBeforeEvent: daysBeforeEvent && daysBeforeEvent > 0 ? daysBeforeEvent : null,
      daysAfterEvent: daysBeforeEvent && daysBeforeEvent < 0 ? Math.abs(daysBeforeEvent) : null,
      priority: task.priority,
      sortOrder: i,
    }).returning();

    // Get checklists and create template checklists
    const checklists = await db
      .select()
      .from(taskChecklistItems)
      .where(eq(taskChecklistItems.taskId, task.id))
      .orderBy(asc(taskChecklistItems.sortOrder));

    for (let j = 0; j < checklists.length; j++) {
      await db.insert(taskTemplateChecklists).values({
        taskTemplateId: taskTpl.id,
        title: checklists[j].title,
        sortOrder: j,
      });
    }
  }

  return getEventTemplate(session, template.id);
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
      permissions: eventParticipants.permissions,
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
    permissions?: Record<string, string>;
  }
) {
  // Check for existing participant
  if (data.userId) {
    const [existing] = await db
      .select({ id: eventParticipants.id })
      .from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, data.userId)))
      .limit(1);
    if (existing) throw new Error("El usuario ya es colaborador de este evento");
  }

  const [participant] = await db.insert(eventParticipants).values({
    eventId,
    userId: data.userId,
    vendorId: data.vendorId,
    clientId: data.clientId,
    type: data.type,
    role: data.role,
    permissions: data.permissions || null,
    invitedBy: session.user.userId,
  }).returning();

  return participant;
}

export async function updateEventParticipant(
  eventId: number,
  participantId: number,
  data: {
    permissions?: Record<string, string>;
    role?: string;
  }
) {
  const updateData: Record<string, unknown> = {};
  if (data.permissions !== undefined) updateData.permissions = data.permissions;
  if (data.role !== undefined) updateData.role = data.role;

  if (Object.keys(updateData).length === 0) return null;

  const [updated] = await db.update(eventParticipants)
    .set(updateData)
    .where(
      and(
        eq(eventParticipants.id, participantId),
        eq(eventParticipants.eventId, eventId)
      )
    )
    .returning();

  return updated;
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
