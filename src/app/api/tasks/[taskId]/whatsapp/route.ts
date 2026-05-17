import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { taskMessages, organizationIntegrations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { executeComposioTool } from "@/lib/composio";
import { canAccessTaskChat } from "@/lib/task-chat";
import { getPusherServer, CHANNELS, EVENTS } from "@/lib/pusher";
import { apiHandler, ok, badRequest, forbidden, serverError } from "@/lib/api-handler";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const { taskId: taskIdStr } = await params;
    const taskId = parseInt(taskIdStr, 10);

    if (isNaN(taskId)) {
      return badRequest("Task ID inválido");
    }

    const canAccess = await canAccessTaskChat(session, taskId);
    if (!canAccess) {
      return forbidden("Sin acceso a esta tarea");
    }

    const { to, message: msgContent, templateName } = await req.json();

    if (!to || !msgContent) {
      return badRequest("Faltan campos requeridos: to, message");
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
      return badRequest("WhatsApp no está conectado. Configuralo en Integraciones.");
    }

    try {
      await executeComposioTool(orgId, "WHATSAPP_SEND_MESSAGE", ["whatsapp"], {
        to,
        body: msgContent,
      });
    } catch (waError) {
      console.error("[Task WhatsApp] Composio send error:", waError);
      return serverError("Error al enviar el mensaje vía WhatsApp");
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

    return ok(messagePayload);
  }, "POST /api/tasks/[taskId]/whatsapp");
}
