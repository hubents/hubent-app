"use client";

/**
 * Real-time Notifications Component
 * 
 * Listens to Pusher events for task assignments, updates, and comments.
 * Shows toast notifications when events occur.
 */

import { useEffect, useCallback } from "react";
import { useUserNotifications } from "@/hooks/use-pusher";
import { toast } from "sonner";
import { 
  RiTaskLine, 
  RiChat1Line, 
  RiEditLine,
  RiUserAddLine,
} from "@remixicon/react";
import { useRouter } from "next/navigation";

interface TaskNotification {
  taskId: number;
  taskTitle: string;
  eventType: "assigned" | "updated" | "comment";
  actorName: string;
  actorImage?: string;
  message?: string;
  timestamp: string;
}

export function RealtimeNotifications() {
  const router = useRouter();

  const handleNotification = useCallback((data: unknown) => {
    const notification = data as TaskNotification;
    
    const icons = {
      assigned: <RiUserAddLine className="h-4 w-4 text-blue-500" />,
      updated: <RiEditLine className="h-4 w-4 text-yellow-500" />,
      comment: <RiChat1Line className="h-4 w-4 text-green-500" />,
    };

    const titles = {
      assigned: "Nueva tarea asignada",
      updated: "Tarea actualizada",
      comment: "Nuevo comentario",
    };

    const descriptions = {
      assigned: `${notification.actorName} te asignó "${notification.taskTitle}"`,
      updated: `${notification.actorName} actualizó "${notification.taskTitle}"`,
      comment: `${notification.actorName} comentó en "${notification.taskTitle}"`,
    };

    toast(titles[notification.eventType], {
      description: descriptions[notification.eventType],
      icon: icons[notification.eventType],
      action: {
        label: "Ver",
        onClick: () => {
          router.push(`/dashboard/tasks?taskId=${notification.taskId}`);
        },
      },
      duration: 5000,
    });
  }, [router]);

  // Subscribe to user notifications channel
  useUserNotifications(handleNotification);

  return null; // This component doesn't render anything
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
