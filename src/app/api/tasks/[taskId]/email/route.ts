import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { taskMessages, organizationIntegrations, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createComposioSession } from "@/lib/composio";
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

    const { to, cc, bcc, subject, body } = await req.json();

    if (!to || !Array.isArray(to) || to.length === 0 || !subject || !body) {
      return NextResponse.json(
        { success: false, error: "Faltan campos requeridos: to, subject, body" },
        { status: 400 }
      );
    }

    const orgId = session.organizationId;

    const [gmailIntegration] = await db
      .select()
      .from(organizationIntegrations)
      .where(
        and(
          eq(organizationIntegrations.organizationId, orgId),
          eq(organizationIntegrations.toolkit, "gmail"),
          eq(organizationIntegrations.status, "connected")
        )
      )
      .limit(1);

    if (!gmailIntegration) {
      return NextResponse.json(
        { success: false, error: "Gmail no está conectado. Configuralo en Integraciones." },
        { status: 400 }
      );
    }

    const composioSession = await createComposioSession(orgId, ["gmail"]);
    const tools = await composioSession.tools();

    const sendEmailTool = Object.entries(tools).find(
      ([key]) => key.toLowerCase().includes("gmail_send_email")
    );

    if (!sendEmailTool) {
      return NextResponse.json(
        { success: false, error: "Herramienta de envío de email no disponible" },
        { status: 500 }
      );
    }

    let emailResult;
    try {
      const [, tool] = sendEmailTool;
      if (tool && typeof tool === "object" && "execute" in tool && typeof tool.execute === "function") {
        emailResult = await tool.execute({
          recipient_email: to.join(", "),
          subject,
          body,
          cc: cc?.join(", ") || undefined,
          bcc: bcc?.join(", ") || undefined,
        }, { toolCallId: `task_email_${taskId}_${Date.now()}`, messages: [] });
      }
    } catch (emailError) {
      console.error("[Task Email] Composio send error:", emailError);
      return NextResponse.json(
        { success: false, error: "Error al enviar el email vía Gmail" },
        { status: 500 }
      );
    }

    const emailFrom = gmailIntegration.connectedEmail || session.user.email || "sin-email";

    const [message] = await db
      .insert(taskMessages)
      .values({
        taskId,
        senderId: session.user.userId,
        type: "email_sent",
        content: body,
        emailFrom: emailFrom,
        emailTo: to,
        emailCc: cc || null,
        emailBcc: bcc || null,
        emailSubject: subject,
        emailThreadId: emailResult?.threadId || null,
        emailMessageId: emailResult?.messageId || null,
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
      console.warn("[Task Email] Pusher broadcast failed:", pusherError);
    }

    return NextResponse.json({ success: true, data: messagePayload });
  } catch (error) {
    console.error("[Task Email] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error" },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
