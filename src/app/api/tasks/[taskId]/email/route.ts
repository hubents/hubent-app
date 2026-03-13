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

    const { to: rawTo, cc, bcc, subject, body } = await req.json();

    // Clean email addresses: extract from "Name <email>" format
    const extractEmail = (v: string) => {
      const m = v.match(/<([^>]+)>/);
      return m ? m[1] : v.trim();
    };
    const to = Array.isArray(rawTo) ? rawTo.map(extractEmail) : rawTo;

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

    const taggedSubject = subject.includes(`[HE-${taskId}]`) ? subject : `[HE-${taskId}] ${subject}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let emailResult: any;
    try {
      emailResult = await executeComposioTool(orgId, "GMAIL_SEND_EMAIL", ["gmail"], {
        recipient_email: to.join(", "),
        subject: taggedSubject,
        body,
        cc: cc?.join(", ") || undefined,
        bcc: bcc?.join(", ") || undefined,
      });
      console.log("[Task Email] Composio result:", JSON.stringify(emailResult)?.slice(0, 500));
    } catch (emailError) {
      console.error("[Task Email] Composio send error:", emailError instanceof Error ? emailError.message : emailError);
      console.error("[Task Email] Full error:", JSON.stringify(emailError, Object.getOwnPropertyNames(emailError as object))?.slice(0, 1000));
      return NextResponse.json(
        { success: false, error: `Error al enviar el email vía Gmail: ${emailError instanceof Error ? emailError.message : "Error desconocido"}` },
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
        emailSubject: taggedSubject,
        emailThreadId: (emailResult?.data?.threadId as string) || null,
        emailMessageId: (emailResult?.data?.messageId as string) || null,
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
