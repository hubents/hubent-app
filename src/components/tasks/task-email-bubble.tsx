"use client";

import { RiMailLine, RiMailSendLine } from "@remixicon/react";

interface TaskEmailBubbleProps {
  type: "email_sent" | "email_received";
  subject: string | null;
  from: string | null;
  to: string[] | null;
  cc: string[] | null;
  content: string;
  senderName: string | null;
  createdAt: string;
}

export function TaskEmailBubble({
  type,
  subject,
  from,
  to,
  cc,
  content,
  senderName,
  createdAt,
}: TaskEmailBubbleProps) {
  const isSent = type === "email_sent";
  const date = new Date(createdAt);
  const timeStr = date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="border rounded-lg overflow-hidden bg-red-50/30 dark:bg-red-950/10">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100/50 dark:bg-red-900/20 border-b">
        {isSent ? (
          <RiMailSendLine className="w-3.5 h-3.5 text-red-600" />
        ) : (
          <RiMailLine className="w-3.5 h-3.5 text-red-600" />
        )}
        <span className="text-[10px] font-medium text-red-700 dark:text-red-400">
          {isSent ? "Email enviado" : "Email recibido"}
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto">{timeStr}</span>
      </div>

      <div className="px-3 py-2 space-y-1">
        {subject && (
          <p className="text-xs font-medium">{subject}</p>
        )}

        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
          {from && <span>De: {from}</span>}
          {to && to.length > 0 && <span>Para: {to.join(", ")}</span>}
          {cc && cc.length > 0 && <span>CC: {cc.join(", ")}</span>}
        </div>

        <p className="text-xs mt-1 whitespace-pre-wrap">{content}</p>

        {senderName && (
          <p className="text-[10px] text-muted-foreground mt-1">
            {isSent ? "Enviado por" : "Recibido vía cuenta de"} {senderName}
          </p>
        )}
      </div>
    </div>
  );
}
