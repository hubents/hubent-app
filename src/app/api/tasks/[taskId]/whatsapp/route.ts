import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { taskMessages, organizationIntegrations, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { executeComposioTool } from "@/lib/composio";
import { canAccessTaskChat } from "@/lib/task-chat";
import { getPusherServer, CHANNELS, EVENTS } from "@/lib/pusher";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await requireAuth();
    const { taskId: taskIdStr } = await params;
    const taskId = parseInt(taskIdStr, 10);

    if (isNaN(taskId)) {
      return NextResponse.json(
        { success: false, error: "Task ID inválido" },
        { status: 400 }
      );
    }

    const canAccess = await canAccessTaskChat(session, taskId);
    if (!canAccess) {
      return NextResponse.json(
        { success: false, error: "Sin acceso a esta tarea" },
        { status: 403 }
      );
    }

    const { to, message: msgContent, templateName } = await req.json();

    if (!to || !msgContent) {
      return NextResponse.json(
        { success: false, error: "Faltan campos requeridos: to, message" },
        { status: 400 }
      );
    }

    const orgId = session.organizationId;

    const [waIntegration] = await db
      .select()
      .from(organizationIntegrations)
      .where(
        and(
          eq(organizationIntegrations.organizationId, orgId),
          eq(organizationIntegrations.toolkit, "whatsapp"),
          eq(organizationIntegrations.status, "connected")
        )
      )
      .limit(1);

    if (!waIntegration) {
      return NextResponse.json(
        { success: false, error: "WhatsApp no está conectado. Configuralo en Integraciones." },
        { status: 400 }
      );
    }

    try {
      await executeComposioTool(orgId, "WHATSAPP_SEND_MESSAGE", {
        to,
        body: msgContent,
      });
    } catch (waError) {
      console.error("[Task WhatsApp] Composio send error:", waError);
      return NextResponse.json(
        { success: false, error: "Error al enviar el mensaje vía WhatsApp" },
        { status: 500 }
      );
    }

    const [message] = await db
      .insert(taskMessages)
      .values({
        taskId,
        senderId: session.user.userId,
        type: "whatsapp_sent",
        content: msgContent,
        whatsappTo: to,
        whatsappTemplate: templateName || null,
      })
      .returning();

    const sender = await db.query.users.findFirst({
      where: (u, { eq: e }) => e(u.id, session.user.userId),
    });

    const messagePayload = {
      ...message,
      senderName: sender?.name,
      senderEmail: sender?.email,
      senderImage: sender?.image,
      attachments: [],
    };

    try {
      const pusher = getPusherServer();
      await pusher.trigger(
        CHANNELS.taskChat(taskId),
        EVENTS.MESSAGE_NEW,
        messagePayload
      );
    } catch (pusherError) {
      console.warn("[Task WhatsApp] Pusher broadcast failed:", pusherError);
    }

    return NextResponse.json({ success: true, data: messagePayload });
  } catch (error) {
    console.error("[Task WhatsApp] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
