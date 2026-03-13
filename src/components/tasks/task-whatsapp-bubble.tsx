"use client";

import { RiWhatsappLine } from "@remixicon/react";

interface TaskWhatsAppBubbleProps {
  type: "whatsapp_sent" | "whatsapp_received";
  to: string | null;
  from: string | null;
  content: string;
  template: string | null;
  senderName: string | null;
  createdAt: string;
}

export function TaskWhatsAppBubble({
  type,
  to,
  from,
  content,
  template,
  senderName,
  createdAt,
}: TaskWhatsAppBubbleProps) {
  const isSent = type === "whatsapp_sent";
  const date = new Date(createdAt);
  const timeStr = date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="border rounded-lg overflow-hidden bg-green-50/30 dark:bg-green-950/10">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100/50 dark:bg-green-900/20 border-b">
        <RiWhatsappLine className="w-3.5 h-3.5 text-green-600" />
        <span className="text-[10px] font-medium text-green-700 dark:text-green-400">
          {isSent ? "WhatsApp enviado" : "WhatsApp recibido"}
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto">{timeStr}</span>
      </div>

      <div className="px-3 py-2 space-y-1">
        {from && (
          <p className="text-[10px] text-muted-foreground">De: {from}</p>
        )}
        {to && (
          <p className="text-[10px] text-muted-foreground">Para: {to}</p>
        )}

        <p className="text-xs whitespace-pre-wrap">{content}</p>

        {template && (
          <p className="text-[10px] text-muted-foreground">
            Template: {template}
          </p>
        )}

        {senderName && (
          <p className="text-[10px] text-muted-foreground mt-1">
            {isSent ? "Enviado por" : "Recibido vía cuenta de"} {senderName}
          </p>
        )}
      </div>
    </div>
  );
}
