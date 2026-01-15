import PushNotifications from "@pusher/push-notifications-server";

// Pusher Beams server instance
let beamsClient: PushNotifications | null = null;

export function getBeamsClient(): PushNotifications | null {
  if (beamsClient) return beamsClient;

  const instanceId = process.env.PUSHER_BEAMS_INSTANCE_ID;
  const secretKey = process.env.PUSHER_BEAMS_SECRET_KEY;

  if (!instanceId || !secretKey) {
    console.warn("Pusher Beams not configured - push notifications disabled");
    return null;
  }

  beamsClient = new PushNotifications({
    instanceId,
    secretKey,
  });

  return beamsClient;
}

// Types for push notifications
export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, string>;
  deep_link?: string;
}

/**
 * Send push notification to specific users
 */
export async function sendPushToUsers(
  userIds: string[],
  notification: PushNotificationPayload
): Promise<boolean> {
  const client = getBeamsClient();
  if (!client) return false;

  try {
    await client.publishToUsers(userIds, {
      web: {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || "/images/icon-192.png",
          deep_link: notification.deep_link || "https://hubents.napsixai.com",
        },
        data: notification.data,
      },
    });
    return true;
  } catch (error) {
    console.error("Failed to send push notification:", error);
    return false;
  }
}

/**
 * Send push notification to users interested in a specific topic
 * Topics: task-{taskId}, event-{eventId}, org-{orgId}
 */
export async function sendPushToInterest(
  interest: string,
  notification: PushNotificationPayload
): Promise<boolean> {
  const client = getBeamsClient();
  if (!client) return false;

  try {
    await client.publishToInterests([interest], {
      web: {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || "/images/icon-192.png",
          deep_link: notification.deep_link,
        },
        data: notification.data,
      },
    });
    return true;
  } catch (error) {
    console.error("Failed to send push to interest:", error);
    return false;
  }
}

// Notification types for different events
export const NotificationTypes = {
  NEW_MESSAGE: "new_message",
  TASK_ASSIGNED: "task_assigned",
  TASK_UPDATED: "task_updated",
  EVENT_REMINDER: "event_reminder",
  MENTION: "mention",
  PAYMENT_RECEIVED: "payment_received",
} as const;
