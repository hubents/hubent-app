/**
 * Push Notifications Module
 * Centralized functions for sending push notifications via Pusher Beams
 */

import { sendPushToUsers } from "./beams";
import { db } from "@/db";
import { tasks, taskParticipants, events, organizationMembers, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Save notification to database for history
 */
async function saveNotification(
  userIds: string[],
  organizationId: number,
  type: string,
  title: string,
  body: string,
  link?: string,
  data?: Record<string, string>
): Promise<void> {
  try {
    for (const userId of userIds) {
      await db.insert(notifications).values({
        userId,
        organizationId,
        type,
        title,
        body,
        link,
        data,
      });
    }
  } catch (error) {
    console.error("Failed to save notification to DB:", error);
  }
}

// Base URL for deep links
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.hubents.com";

/**
 * Get all planner+ users in an organization (for org-wide notifications)
 */
async function getOrgPlanners(organizationId: string | number): Promise<string[]> {
  const orgId = typeof organizationId === "string" ? parseInt(organizationId, 10) : organizationId;
  const members = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, orgId));
  
  return members.map(m => m.userId).filter(Boolean) as string[];
}

/**
 * Get task participants (assignee + participants with userId)
 */
async function getTaskRecipients(taskId: number): Promise<string[]> {
  const task = await db.query.tasks.findFirst({
    where: (t, { eq }) => eq(t.id, taskId),
    columns: { assignedTo: true },
  });

  const participants = await db
    .select({ userId: taskParticipants.userId })
    .from(taskParticipants)
    .where(eq(taskParticipants.taskId, taskId));

  const userIds = new Set<string>();
  if (task?.assignedTo) userIds.add(task.assignedTo);
  for (const p of participants) {
    if (p.userId) userIds.add(p.userId);
  }

  return Array.from(userIds);
}

// ============================================
// TASK NOTIFICATIONS
// ============================================

/**
 * Notify when a task is assigned to someone
 */
export async function notifyTaskAssigned(
  taskId: number,
  taskTitle: string,
  assignedToUserId: string,
  assignedByName: string,
  organizationId?: number
): Promise<void> {
  const title = "📋 Nueva tarea asignada";
  const body = `${assignedByName} te asignó: ${taskTitle}`;
  const link = `${BASE_URL}/dashboard/tareas?task=${taskId}`;
  const data = { type: "task_assigned", taskId: taskId.toString() };

  await sendPushToUsers([assignedToUserId], { title, body, deep_link: link, data });
  
  // Save to DB if organizationId provided
  if (organizationId) {
    saveNotification([assignedToUserId], organizationId, "task_assigned", title, body, link, data);
  }
}

/**
 * Notify when task status changes
 */
export async function notifyTaskStatusChanged(
  taskId: number,
  taskTitle: string,
  newStatus: string,
  changedByUserId: string,
  changedByName: string
): Promise<void> {
  const recipients = await getTaskRecipients(taskId);
  const filtered = recipients.filter(id => id !== changedByUserId);
  if (filtered.length === 0) return;

  const statusLabels: Record<string, string> = {
    pending: "pendiente",
    in_progress: "en progreso",
    completed: "completada",
    cancelled: "cancelada",
  };

  await sendPushToUsers(filtered, {
    title: "🔄 Tarea actualizada",
    body: `${changedByName} marcó "${taskTitle}" como ${statusLabels[newStatus] || newStatus}`,
    deep_link: `${BASE_URL}/dashboard/tareas?task=${taskId}`,
    data: { type: "task_status_changed", taskId: taskId.toString(), status: newStatus },
  });
}

/**
 * Notify when someone is added as participant to a task
 */
export async function notifyAddedAsParticipant(
  taskId: number,
  taskTitle: string,
  addedUserId: string,
  addedByName: string
): Promise<void> {
  await sendPushToUsers([addedUserId], {
    title: "👥 Agregado a tarea",
    body: `${addedByName} te agregó como participante en: ${taskTitle}`,
    deep_link: `${BASE_URL}/dashboard/tareas?task=${taskId}`,
    data: { type: "task_participant_added", taskId: taskId.toString() },
  });
}

// ============================================
// PAYMENT NOTIFICATIONS
// ============================================

/**
 * Notify when a payment is registered
 */
export async function notifyPaymentRegistered(
  organizationId: string,
  paymentDescription: string,
  amount: string,
  currency: string,
  eventName?: string,
  registeredByUserId?: string
): Promise<void> {
  const recipients = await getOrgPlanners(organizationId);
  const filtered = registeredByUserId 
    ? recipients.filter(id => id !== registeredByUserId)
    : recipients;
  if (filtered.length === 0) return;

  const formattedAmount = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency || "ARS",
  }).format(parseFloat(amount));

  const body = eventName
    ? `${paymentDescription} - ${formattedAmount} (${eventName})`
    : `${paymentDescription} - ${formattedAmount}`;

  await sendPushToUsers(filtered, {
    title: "💰 Pago registrado",
    body,
    deep_link: `${BASE_URL}/dashboard/pagos`,
    data: { type: "payment_registered" },
  });
}

/**
 * Notify when a payment status changes (e.g., marked as paid)
 */
export async function notifyPaymentStatusChanged(
  organizationId: string,
  paymentDescription: string,
  newStatus: string,
  changedByUserId?: string
): Promise<void> {
  const recipients = await getOrgPlanners(organizationId);
  const filtered = changedByUserId 
    ? recipients.filter(id => id !== changedByUserId)
    : recipients;
  if (filtered.length === 0) return;

  const statusEmoji = newStatus === "paid" ? "✅" : newStatus === "overdue" ? "⚠️" : "📝";
  const statusLabel = newStatus === "paid" ? "pagado" : newStatus === "overdue" ? "vencido" : newStatus;

  await sendPushToUsers(filtered, {
    title: `${statusEmoji} Pago ${statusLabel}`,
    body: paymentDescription,
    deep_link: `${BASE_URL}/dashboard/pagos`,
    data: { type: "payment_status_changed", status: newStatus },
  });
}

// ============================================
// RSVP / GUEST NOTIFICATIONS
// ============================================

/**
 * Notify when a guest confirms attendance (RSVP)
 */
export async function notifyGuestRsvp(
  organizationId: string,
  eventId: number,
  eventName: string,
  guestName: string,
  response: "confirmed" | "declined" | "maybe",
  guestCount?: number
): Promise<void> {
  const recipients = await getOrgPlanners(organizationId);
  if (recipients.length === 0) return;

  const responseEmoji = response === "confirmed" ? "✅" : response === "declined" ? "❌" : "🤔";
  const responseLabel = response === "confirmed" ? "confirmó asistencia" 
    : response === "declined" ? "no podrá asistir" 
    : "respondió 'tal vez'";

  const body = guestCount && guestCount > 1
    ? `${guestName} ${responseLabel} (${guestCount} personas) - ${eventName}`
    : `${guestName} ${responseLabel} - ${eventName}`;

  await sendPushToUsers(recipients, {
    title: `${responseEmoji} RSVP recibido`,
    body,
    deep_link: `${BASE_URL}/dashboard/eventos/${eventId}/invitados`,
    data: { type: "rsvp_received", eventId: eventId.toString(), response },
  });
}

// ============================================
// CONTACT / CRM NOTIFICATIONS
// ============================================

/**
 * Notify when a new contact is created
 */
export async function notifyNewContact(
  organizationId: string,
  contactName: string,
  contactType: "person" | "company",
  createdByUserId: string
): Promise<void> {
  const recipients = await getOrgPlanners(organizationId);
  const filtered = recipients.filter(id => id !== createdByUserId);
  if (filtered.length === 0) return;

  const typeLabel = contactType === "person" ? "persona" : "empresa";

  await sendPushToUsers(filtered, {
    title: "👤 Nuevo contacto",
    body: `${contactName} (${typeLabel}) agregado al CRM`,
    deep_link: `${BASE_URL}/dashboard/contactos`,
    data: { type: "new_contact", contactType },
  });
}

/**
 * Notify when a new lead is created
 */
export async function notifyNewLead(
  organizationId: string,
  leadTitle: string,
  contactName: string,
  value?: string,
  currency?: string,
  createdByUserId?: string,
  assignedToUserId?: string
): Promise<void> {
  // Notify assigned user if different from creator
  if (assignedToUserId && assignedToUserId !== createdByUserId) {
    const valueStr = value && currency
      ? ` - ${new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(parseFloat(value))}`
      : "";

    await sendPushToUsers([assignedToUserId], {
      title: "🎯 Nuevo lead asignado",
      body: `${leadTitle} (${contactName})${valueStr}`,
      deep_link: `${BASE_URL}/dashboard/crm`,
      data: { type: "lead_assigned" },
    });
  }
}

/**
 * Notify when a lead moves to a new stage
 */
export async function notifyLeadStageChanged(
  organizationId: string,
  leadTitle: string,
  newStageName: string,
  changedByUserId: string,
  assignedToUserId?: string
): Promise<void> {
  if (!assignedToUserId || assignedToUserId === changedByUserId) return;

  await sendPushToUsers([assignedToUserId], {
    title: "📊 Lead actualizado",
    body: `"${leadTitle}" movido a: ${newStageName}`,
    deep_link: `${BASE_URL}/dashboard/crm`,
    data: { type: "lead_stage_changed" },
  });
}

// ============================================
// EVENT NOTIFICATIONS
// ============================================

/**
 * Notify event reminder (to be called by a cron job)
 */
export async function notifyEventReminder(
  organizationId: string,
  eventId: number,
  eventName: string,
  eventDate: Date,
  hoursUntil: number
): Promise<void> {
  const recipients = await getOrgPlanners(organizationId);
  if (recipients.length === 0) return;

  const timeLabel = hoursUntil <= 1 ? "en 1 hora" 
    : hoursUntil <= 24 ? `en ${hoursUntil} horas`
    : `mañana`;

  await sendPushToUsers(recipients, {
    title: "⏰ Recordatorio de evento",
    body: `${eventName} comienza ${timeLabel}`,
    deep_link: `${BASE_URL}/dashboard/eventos/${eventId}`,
    data: { type: "event_reminder", eventId: eventId.toString() },
  });
}

// ============================================
// MENTION NOTIFICATIONS
// ============================================

/**
 * Parse mentions from message content and notify mentioned users
 * Mentions format: @Username or @"Full Name"
 */
export async function notifyMentions(
  taskId: number,
  taskTitle: string,
  messageContent: string,
  senderName: string,
  senderUserId: string,
  teamMembers: Array<{ id: string; name: string; email: string }>
): Promise<void> {
  // Extract mentions from message - matches @word or @"multiple words"
  const mentionRegex = /@(\w+|"[^"]+"|'[^']+')/g;
  const mentions = messageContent.match(mentionRegex);
  
  if (!mentions || mentions.length === 0) return;

  // Find mentioned users
  const mentionedUserIds: string[] = [];
  
  for (const mention of mentions) {
    // Remove @ and quotes
    const mentionName = mention.slice(1).replace(/["']/g, "").toLowerCase();
    
    // Find matching team member
    const member = teamMembers.find(m => 
      m.name?.toLowerCase().includes(mentionName) ||
      m.email?.split("@")[0].toLowerCase() === mentionName
    );
    
    if (member && member.id !== senderUserId) {
      mentionedUserIds.push(member.id);
    }
  }

  // Remove duplicates and send notifications
  const uniqueUserIds = [...new Set(mentionedUserIds)];
  if (uniqueUserIds.length === 0) return;

  const preview = messageContent.length > 80 
    ? messageContent.substring(0, 80) + "..." 
    : messageContent;

  await sendPushToUsers(uniqueUserIds, {
    title: `🔔 ${senderName} te mencionó`,
    body: preview,
    deep_link: `${BASE_URL}/dashboard/tareas?task=${taskId}`,
    data: { type: "mention", taskId: taskId.toString() },
  });
}

/**
 * Notify when someone is assigned to a checklist item
 */
export async function notifyChecklistAssigned(
  taskId: number,
  taskTitle: string,
  checklistItemTitle: string,
  assignedToUserId: string,
  assignedByName: string
): Promise<void> {
  await sendPushToUsers([assignedToUserId], {
    title: "✅ Nuevo ítem asignado",
    body: `${assignedByName} te asignó: "${checklistItemTitle}" en la tarea "${taskTitle}"`,
    deep_link: `${BASE_URL}/dashboard/tareas?task=${taskId}`,
    data: { type: "checklist_assigned", taskId: taskId.toString() },
  });
}

/**
 * Notify when a new event is created
 */
export async function notifyNewEvent(
  organizationId: string,
  eventId: number,
  eventName: string,
  eventDate: Date,
  createdByUserId: string
): Promise<void> {
  const recipients = await getOrgPlanners(organizationId);
  const filtered = recipients.filter(id => id !== createdByUserId);
  if (filtered.length === 0) return;

  const dateStr = eventDate.toLocaleDateString("es-AR", { 
    day: "numeric", 
    month: "short", 
    year: "numeric" 
  });

  await sendPushToUsers(filtered, {
    title: "🎉 Nuevo evento creado",
    body: `${eventName} - ${dateStr}`,
    deep_link: `${BASE_URL}/dashboard/eventos/${eventId}`,
    data: { type: "new_event", eventId: eventId.toString() },
  });
}
