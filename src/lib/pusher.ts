/**
 * Pusher Server-Side Client
 * 
 * Handles real-time messaging for task chat, notifications, and presence.
 * 
 * IMPORTANT: Config is read at RUNTIME (inside functions) to work with Vercel.
 */

import Pusher from "pusher";

// Get Pusher config at runtime (not build time)
function getPusherConfig() {
  return {
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
    useTLS: true,
  };
}

// Create a new Pusher instance each time in serverless environment
export function getPusherServer(): Pusher {
  const config = getPusherConfig();
  
  if (!config.appId || !config.key || !config.secret || !config.cluster) {
    console.error("Pusher config missing:", {
      hasAppId: !!config.appId,
      hasKey: !!config.key,
      hasSecret: !!config.secret,
      hasCluster: !!config.cluster,
    });
    throw new Error("Pusher configuration is incomplete. Check environment variables.");
  }
  
  return new Pusher(config);
}

// Channel naming conventions
export const CHANNELS = {
  // Private channel for task chat - only participants can access
  taskChat: (taskId: number) => `private-task-${taskId}`,
  
  // Presence channel for task - shows who's viewing
  taskPresence: (taskId: number) => `presence-task-${taskId}`,
  
  // Private channel for user notifications
  userNotifications: (userId: string) => `private-user-${userId}`,
  
  // Organization-wide notifications
  orgNotifications: (orgId: number) => `private-org-${orgId}`,
};

// Event types
export const EVENTS = {
  // Task chat events
  MESSAGE_NEW: "message:new",
  MESSAGE_EDITED: "message:edited",
  MESSAGE_DELETED: "message:deleted",
  FILE_UPLOADED: "file:uploaded",
  
  // Typing indicator (client event - no server roundtrip)
  CLIENT_TYPING: "client-typing",
  
  // Notifications
  TASK_ASSIGNED: "task:assigned",
  TASK_UPDATED: "task:updated",
  TASK_COMMENT: "task:comment",
  EVENT_UPDATED: "event:updated",
  
  // Presence events (built-in Pusher events)
  MEMBER_ADDED: "pusher:member_added",
  MEMBER_REMOVED: "pusher:member_removed",
  SUBSCRIPTION_SUCCEEDED: "pusher:subscription_succeeded",
};

// Types for Pusher events
export interface TaskMessageEvent {
  id: number;
  taskId: number;
  senderId: string;
  senderName?: string | null;
  senderImage?: string | null;
  content: string;
  type: string | null;
  isPrivate: boolean | null;
  createdAt: string;
  attachments?: Array<{
    id: number;
    name: string;
    url: string;
    type: string;
    size: number | null;
  }>;
}

export interface TypingEvent {
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface TaskNotificationEvent {
  taskId: number;
  taskTitle: string;
  eventType: "assigned" | "updated" | "comment";
  actorName: string;
  actorImage?: string;
  message?: string;
  timestamp: string;
}

export interface PresenceMember {
  id: string;
  info: {
    name: string;
    email: string;
    image?: string;
  };
}

// Helper to trigger events
export async function triggerTaskMessage(
  taskId: number,
  event: string,
  data: TaskMessageEvent
) {
  const pusher = getPusherServer();
  await pusher.trigger(CHANNELS.taskChat(taskId), event, data);
}

export async function triggerUserNotification(
  userId: string,
  event: string,
  data: TaskNotificationEvent
) {
  const pusher = getPusherServer();
  await pusher.trigger(CHANNELS.userNotifications(userId), event, data);
}

export async function triggerOrgNotification(
  orgId: number,
  event: string,
  data: TaskNotificationEvent
) {
  const pusher = getPusherServer();
  await pusher.trigger(CHANNELS.orgNotifications(orgId), event, data);
}

// Batch trigger for multiple users (e.g., all task participants)
export async function triggerToMultipleUsers(
  userIds: string[],
  event: string,
  data: TaskNotificationEvent
) {
  const pusher = getPusherServer();
  const channels = userIds.map(id => CHANNELS.userNotifications(id));
  
  // Pusher allows triggering to up to 100 channels at once
  const batchSize = 100;
  for (let i = 0; i < channels.length; i += batchSize) {
    const batch = channels.slice(i, i + batchSize);
    await pusher.trigger(batch, event, data);
  }
}
