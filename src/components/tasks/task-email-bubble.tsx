"use client";

import { RiMailLine, RiMailSendLine, RiReplyLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";

interface TaskEmailBubbleProps {
  type: "email_sent" | "email_received";
  subject: string | null;
  from: string | null;
  to: string[] | null;
  cc: string[] | null;
  content: string;
  senderName: string | null;
  createdAt: string;
  onReply?: (to: string, subject: string) => void;
}

function cleanSubject(subject: string): string {
  return subject.replace(/\[HE-\d+\]\s*/g, "").trim() || subject;
}

function extractEmail(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return match ? match[1] : value.trim();
}

function cleanEmailContent(content: string): string {
  // Remove quoted reply chains (lines starting with > or "El ... escribió:")
  const lines = content.split("\n");
  const cleanLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith(">") || line.match(/^El .+ escribi[oó]:/i) || line.match(/^On .+ wrote:/i)) break;
    if (line.match(/^-{3,}/) || line.match(/^_{3,}/)) break;
    cleanLines.push(line);
  }
  return cleanLines.join("\n").trim() || content;
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
  onReply,
}: TaskEmailBubbleProps) {
  const isSent = type === "email_sent";
  const isReceived = type === "email_received";
  const date = new Date(createdAt);
  const timeStr = date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const displaySubject = subject ? cleanSubject(subject) : null;
  const replyTo = isReceived && from ? extractEmail(from) : to?.[0] ? extractEmail(to[0]) : null;
  const replySubject = subject ? (subject.startsWith("Re:") ? subject : `Re: ${subject}`) : "Re:";

  return (
    <div className={`border rounded-lg overflow-hidden ${
      isReceived
        ? "bg-blue-50/30 dark:bg-blue-950/10"
        : "bg-red-50/30 dark:bg-red-950/10"
    }`}>
      <div className={`flex items-center gap-2 px-3 py-1.5 border-b ${
        isReceived
          ? "bg-blue-100/50 dark:bg-blue-900/20"
          : "bg-red-100/50 dark:bg-red-900/20"
      }`}>
        {isSent ? (
          <RiMailSendLine className="w-3.5 h-3.5 text-red-600" />
        ) : (
          <RiMailLine className="w-3.5 h-3.5 text-blue-600" />
        )}
        <span className={`text-[10px] font-medium ${
          isReceived
            ? "text-blue-700 dark:text-blue-400"
            : "text-red-700 dark:text-red-400"
        }`}>
          {isSent ? "Email enviado" : "Email recibido"}
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto">{timeStr}</span>
      </div>

      <div className="px-3 py-2 space-y-1">
        {displaySubject && (
          <p className="text-xs font-medium">{displaySubject}</p>
        )}

        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
          {from && <span>De: {from}</span>}
          {to && to.length > 0 && <span>Para: {to.join(", ")}</span>}
          {cc && cc.length > 0 && <span>CC: {cc.join(", ")}</span>}
        </div>

        <p className="text-xs mt-1 whitespace-pre-wrap">{isReceived ? cleanEmailContent(content) : content}</p>

        <div className="flex items-center justify-between mt-1.5">
          {senderName && (
            <p className="text-[10px] text-muted-foreground">
              {isSent ? "Enviado por" : "Recibido vía cuenta de"} {senderName}
            </p>
          )}
          {onReply && replyTo && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => onReply(replyTo, replySubject)}
            >
              <RiReplyLine className="w-3 h-3 mr-0.5" />
              Responder
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
