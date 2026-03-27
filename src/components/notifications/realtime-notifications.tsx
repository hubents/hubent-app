"use client";

/**
 * Real-time Notifications Component
 * 
 * Listens to Pusher events for task assignments, updates, comments,
 * RSVP, contacts, leads, events, payments, and documents.
 * Shows toast notifications when events occur.
 */

import { useCallback } from "react";
import { useUserNotifications } from "@/hooks/use-pusher";
import { toast } from "sonner";
import { 
  RiChat1Line, 
  RiEditLine,
  RiUserAddLine,
  RiCalendarEventLine,
  RiCheckDoubleLine,
  RiContactsLine,
  RiTargetLine,
  RiMoneyDollarCircleLine,
  RiFileTextLine,
} from "@remixicon/react";
import { useRouter, usePathname } from "next/navigation";

interface InAppNotification {
  type?: string;
  eventType?: string;
  taskId?: number;
  taskTitle?: string;
  eventId?: number;
  eventName?: string;
  actorName?: string;
  title?: string;
  body?: string;
  link?: string;
  timestamp?: string;
}

export function RealtimeNotifications() {
  const router = useRouter();
  const pathname = usePathname();
  const base = "/dashboard";

  const handleNotification = useCallback((data: unknown) => {
    const n = data as InAppNotification;
    const eventType = n.eventType || n.type || "unknown";

    let title = "";
    let description = "";
    let icon = <RiEditLine className="h-4 w-4 text-muted-foreground" />;
    let link = "";

    switch (eventType) {
      case "assigned":
        title = "Nueva tarea asignada";
        description = `${n.actorName} te asignó "${n.taskTitle}"`;
        icon = <RiUserAddLine className="h-4 w-4 text-blue-500" />;
        link = `${base}/tasks?taskId=${n.taskId}`;
        break;
      case "updated":
        title = "Tarea actualizada";
        description = `${n.actorName} actualizó "${n.taskTitle}"`;
        icon = <RiEditLine className="h-4 w-4 text-yellow-500" />;
        link = `${base}/tasks?taskId=${n.taskId}`;
        break;
      case "comment":
        title = "Nuevo comentario";
        description = `${n.actorName} comentó en "${n.taskTitle}"`;
        icon = <RiChat1Line className="h-4 w-4 text-green-500" />;
        link = `${base}/tasks?taskId=${n.taskId}`;
        break;
      case "rsvp_received":
        title = "RSVP recibido";
        description = n.body || "Un invitado respondió";
        icon = <RiCheckDoubleLine className="h-4 w-4 text-emerald-500" />;
        link = n.link || (n.eventId ? `${base}/events/${n.eventId}/guests` : "");
        break;
      case "new_contact":
        title = "Nuevo contacto";
        description = n.body || "Contacto agregado al CRM";
        icon = <RiContactsLine className="h-4 w-4 text-blue-500" />;
        link = `${base}/contacts`;
        break;
      case "lead_assigned":
      case "lead_stage_changed":
        title = n.title || "Lead actualizado";
        description = n.body || "Movimiento en el pipeline";
        icon = <RiTargetLine className="h-4 w-4 text-orange-500" />;
        link = `${base}/crm`;
        break;
      case "new_event":
        title = "Nuevo evento";
        description = n.body || `${n.eventName || "Evento"} creado`;
        icon = <RiCalendarEventLine className="h-4 w-4 text-violet-500" />;
        link = n.eventId ? `${base}/events/${n.eventId}` : "";
        break;
      case "payment_registered":
      case "payment_received":
        title = n.title || "Pago registrado";
        description = n.body || "Nuevo movimiento financiero";
        icon = <RiMoneyDollarCircleLine className="h-4 w-4 text-green-600" />;
        link = `${base}/finance/payments`;
        break;
      case "document_received":
      case "document_status_changed":
        title = n.title || "Documento recibido";
        description = n.body || "Nuevo documento financiero";
        icon = <RiFileTextLine className="h-4 w-4 text-amber-500" />;
        link = `${base}/finance/invoices`;
        break;
      default:
        title = n.title || "Notificación";
        description = n.body || "";
        break;
    }

    toast(title, {
      description,
      icon,
      action: link ? {
        label: "Ver",
        onClick: () => router.push(link),
      } : undefined,
      duration: 5000,
    });
  }, [router, base]);

  // Subscribe to user notifications channel
  useUserNotifications(handleNotification);

  return null;
}

/**
 * Hook to trigger notifications when tasks are assigned/updated
 * Use this in API routes or server actions
 */
export async function notifyTaskAssigned(
  assigneeId: string,
  taskId: number,
  taskTitle: string,
  actorName: string
) {
  const { triggerUserNotification, EVENTS } = await import("@/lib/pusher");
  
  await triggerUserNotification(assigneeId, EVENTS.TASK_ASSIGNED, {
    taskId,
    taskTitle,
    eventType: "assigned",
    actorName,
    timestamp: new Date().toISOString(),
  });
}

export async function notifyTaskComment(
  participantIds: string[],
  taskId: number,
  taskTitle: string,
  actorName: string,
  excludeUserId?: string
) {
  const { triggerToMultipleUsers, EVENTS } = await import("@/lib/pusher");
  
  // Exclude the person who made the comment
  const recipients = excludeUserId 
    ? participantIds.filter(id => id !== excludeUserId)
    : participantIds;

  if (recipients.length === 0) return;

  await triggerToMultipleUsers(recipients, EVENTS.TASK_COMMENT, {
    taskId,
    taskTitle,
    eventType: "comment",
    actorName,
    timestamp: new Date().toISOString(),
  });
}
