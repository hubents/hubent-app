import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizationIntegrations, taskMessages, users, tasks } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { getPusherServer, CHANNELS, EVENTS } from "@/lib/pusher";

/**
 * Composio Webhook Endpoint
 * 
 * Receives events from Composio when:
 * - Connection status changes (connected, disconnected, expired)
 * - Triggers fire (email received, WhatsApp received)
 * 
 * Configure in Composio Dashboard → Settings → Webhook:
 * URL: https://app.hubents.com/api/webhooks/composio
 * 
 * Webhook secret should be set as COMPOSIO_WEBHOOK_SECRET env var.
 */

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.COMPOSIO_WEBHOOK_SECRET;
    
    // Log signature status (don't block — Composio may not send signatures for trigger events)
    if (webhookSecret) {
      const signature = req.headers.get("x-composio-signature") || req.headers.get("x-webhook-signature");
      if (!signature) {
        console.warn("[Composio Webhook] Missing signature header — allowing request (trigger events may not include signatures)");
      }
      // TODO: Implement HMAC verification when Composio documents their signing format
    }

    const payload = await req.json();
    const eventType = payload.event || payload.type;

    console.log("[Composio Webhook] Received event:", eventType, JSON.stringify(payload).slice(0, 500));

    switch (eventType) {
      case "connection.active":
      case "connection.created": {
        const connectedAccountId = payload.data?.connected_account_id || payload.connected_account_id;
        if (connectedAccountId) {
          await db
            .update(organizationIntegrations)
            .set({ status: "connected", updatedAt: new Date() })
            .where(eq(organizationIntegrations.composioConnectedAccountId, connectedAccountId));
          console.log("[Composio Webhook] Connection activated:", connectedAccountId);
        }
        break;
      }

      case "connection.revoked":
      case "connection.expired":
      case "connection.deleted": {
        const connectedAccountId = payload.data?.connected_account_id || payload.connected_account_id;
        if (connectedAccountId) {
          await db
            .update(organizationIntegrations)
            .set({ 
              status: "disconnected",
              composioConnectedAccountId: null,
              updatedAt: new Date(),
            })
            .where(eq(organizationIntegrations.composioConnectedAccountId, connectedAccountId));
          console.log("[Composio Webhook] Connection revoked/expired:", connectedAccountId);
        }
        break;
      }

      // Composio V3 trigger events
      case "composio.trigger.message": {
        const triggerSlug = payload.metadata?.trigger_slug;
        const data = payload.data || {};
        const connectedAccountId = payload.metadata?.connected_account_id;

        if (triggerSlug === "GMAIL_NEW_GMAIL_MESSAGE") {
          await handleInboundEmail(data, connectedAccountId);
        } else if (triggerSlug === "WHATSAPP_NEW_MESSAGE") {
          await handleInboundWhatsApp(data, connectedAccountId);
        } else {
          console.log("[Composio Webhook] Unhandled trigger slug:", triggerSlug);
        }
        break;
      }

      default:
        console.log("[Composio Webhook] Unhandled event type:", eventType);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Composio Webhook] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal error processing webhook" },
      { status: 500 }
    );
  }
}

// GET for webhook verification/health check
export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    endpoint: "composio-webhook",
    version: "2.0",
  });
}

// ============================================
// Inbound Email Handler
// ============================================

interface GmailTriggerData {
  id?: string;
  threadId?: string;
  subject?: string;
  from?: string;
  to?: string;
  message_text?: string;
  date?: string;
  messageId?: string;
}

async function handleInboundEmail(data: GmailTriggerData, connectedAccountId?: string) {
  const { threadId, subject, from, to, message_text, messageId } = data;

  if (!threadId && !subject) {
    console.warn("[Inbound Email] No threadId or subject — cannot match to task");
    return;
  }

  // Deduplicate: skip if we already have this messageId
  if (messageId) {
    const existing = await db
      .select({ id: taskMessages.id })
      .from(taskMessages)
      .where(eq(taskMessages.emailMessageId, messageId))
      .limit(1);
    if (existing.length > 0) {
      console.log("[Inbound Email] Duplicate messageId, skipping:", messageId);
      return;
    }
  }

  // Strategy 1: Match by threadId
  let matchedTaskId: number | null = null;
  let senderId: string | null = null;

  if (threadId) {
    const threadMatch = await db
      .select({
        taskId: taskMessages.taskId,
        senderId: taskMessages.senderId,
      })
      .from(taskMessages)
      .where(eq(taskMessages.emailThreadId, threadId))
      .orderBy(desc(taskMessages.createdAt))
      .limit(1);

    if (threadMatch.length > 0) {
      matchedTaskId = threadMatch[0].taskId;
      senderId = threadMatch[0].senderId;
    }
  }

  // Strategy 2: Match by subject tag [HE-{taskId}]
  if (!matchedTaskId && subject) {
    const tagMatch = subject.match(/\[HE-(\d+)\]/);
    if (tagMatch) {
      const candidateTaskId = parseInt(tagMatch[1], 10);
      // Verify task actually exists to prevent FK violation
      const taskExists = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(eq(tasks.id, candidateTaskId))
        .limit(1);
      if (taskExists.length > 0) {
        matchedTaskId = candidateTaskId;
      } else {
        console.warn("[Inbound Email] Subject tag [HE-" + candidateTaskId + "] references non-existent task");
      }
    }
  }

  if (!matchedTaskId) {
    console.log("[Inbound Email] No task match found for threadId:", threadId, "subject:", subject?.slice(0, 50));
    return;
  }

  // Resolve senderId: use the user who connected the integration
  if (!senderId && connectedAccountId) {
    const integration = await db
      .select({ connectedBy: organizationIntegrations.connectedBy })
      .from(organizationIntegrations)
      .where(eq(organizationIntegrations.composioConnectedAccountId, connectedAccountId))
      .limit(1);
    if (integration.length > 0 && integration[0].connectedBy) {
      senderId = integration[0].connectedBy;
    }
  }

  if (!senderId) {
    console.warn("[Inbound Email] Could not resolve senderId for task:", matchedTaskId);
    return;
  }

  // Insert email_received message
  const [message] = await db
    .insert(taskMessages)
    .values({
      taskId: matchedTaskId,
      senderId,
      type: "email_received",
      content: message_text || "(sin contenido)",
      emailFrom: from || null,
      emailTo: to ? [to] : null,
      emailSubject: subject || null,
      emailThreadId: threadId || null,
      emailMessageId: messageId || null,
    })
    .returning();

  console.log("[Inbound Email] Saved to task", matchedTaskId, "message id:", message.id);

  // Broadcast via Pusher
  await broadcastInboundMessage(matchedTaskId, message, senderId);
}

// ============================================
// Inbound WhatsApp Handler
// ============================================

interface WhatsAppTriggerData {
  from?: string;
  body?: string;
  message_id?: string;
  timestamp?: string;
}

async function handleInboundWhatsApp(data: WhatsAppTriggerData, connectedAccountId?: string) {
  const { from: whatsappFrom, body, message_id } = data;

  if (!whatsappFrom) {
    console.warn("[Inbound WhatsApp] No 'from' number — cannot match to task");
    return;
  }

  // Deduplicate
  if (message_id) {
    const existing = await db
      .select({ id: taskMessages.id })
      .from(taskMessages)
      .where(eq(taskMessages.whatsappMessageId, message_id))
      .limit(1);
    if (existing.length > 0) {
      console.log("[Inbound WhatsApp] Duplicate message_id, skipping:", message_id);
      return;
    }
  }

  // Match by phone number: find last whatsapp_sent to this number
  const normalizedFrom = normalizePhone(whatsappFrom);
  const phoneMatch = await db
    .select({
      taskId: taskMessages.taskId,
      senderId: taskMessages.senderId,
    })
    .from(taskMessages)
    .where(
      and(
        sql`${taskMessages.type} = 'whatsapp_sent'`,
        sql`replace(replace(replace(${taskMessages.whatsappTo}, '+', ''), ' ', ''), '-', '') = ${normalizedFrom}`
      )
    )
    .orderBy(desc(taskMessages.createdAt))
    .limit(1);

  if (phoneMatch.length === 0) {
    console.log("[Inbound WhatsApp] No task match for number:", whatsappFrom);
    return;
  }

  const matchedTaskId = phoneMatch[0].taskId;
  let senderId = phoneMatch[0].senderId;

  // Fallback senderId from integration
  if (!senderId && connectedAccountId) {
    const integration = await db
      .select({ connectedBy: organizationIntegrations.connectedBy })
      .from(organizationIntegrations)
      .where(eq(organizationIntegrations.composioConnectedAccountId, connectedAccountId))
      .limit(1);
    if (integration.length > 0 && integration[0].connectedBy) {
      senderId = integration[0].connectedBy;
    }
  }

  if (!senderId) {
    console.warn("[Inbound WhatsApp] Could not resolve senderId for task:", matchedTaskId);
    return;
  }

  const [message] = await db
    .insert(taskMessages)
    .values({
      taskId: matchedTaskId,
      senderId,
      type: "whatsapp_received",
      content: body || "(sin contenido)",
      whatsappFrom,
      whatsappTo: null,
      whatsappMessageId: message_id || null,
    })
    .returning();

  console.log("[Inbound WhatsApp] Saved to task", matchedTaskId, "message id:", message.id);

  await broadcastInboundMessage(matchedTaskId, message, senderId);
}

// ============================================
// Shared helpers
// ============================================

function normalizePhone(phone: string): string {
  return phone.replace(/[+\s\-()]/g, "");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function broadcastInboundMessage(taskId: number, message: any, senderId: string) {
  try {
    const sender = await db
      .select({ name: users.name, email: users.email, image: users.image })
      .from(users)
      .where(eq(users.id, senderId))
      .limit(1);

    const messagePayload = {
      ...message,
      senderName: sender[0]?.name || null,
      senderEmail: sender[0]?.email || null,
      senderImage: sender[0]?.image || null,
      attachments: [],
    };

    const pusher = getPusherServer();
    await pusher.trigger(
      CHANNELS.taskChat(taskId),
      EVENTS.MESSAGE_NEW,
      messagePayload
    );
  } catch (pusherError) {
    console.warn("[Inbound Message] Pusher broadcast failed:", pusherError);
  }
}
