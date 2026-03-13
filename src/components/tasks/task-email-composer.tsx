"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RiSendPlane2Fill, RiCloseLine, RiMailLine } from "@remixicon/react";
import { toast } from "sonner";

interface TaskEmailComposerProps {
  taskId: number;
  onClose: () => void;
  onSent: () => void;
}

export function TaskEmailComposer({
  taskId,
  onClose,
  onSent,
}: TaskEmailComposerProps) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [showCc, setShowCc] = useState(false);

  const handleSend = async () => {
    const toList = to
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    if (toList.length === 0) {
      toast.error("Ingresá al menos un destinatario");
      return;
    }
    if (!subject.trim()) {
      toast.error("Ingresá un asunto");
      return;
    }
    if (!body.trim()) {
      toast.error("Ingresá el cuerpo del email");
      return;
    }

    setSending(true);
    try {
      const ccList = cc
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      const res = await fetch(`/api/tasks/${taskId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: toList,
          cc: ccList.length > 0 ? ccList : undefined,
          subject: subject.trim(),
          body: body.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Email enviado");
        onSent();
        onClose();
      } else {
        toast.error(data.error || "Error al enviar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border rounded-lg bg-background shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <RiMailLine className="w-4 h-4 text-red-500" />
          Nuevo Email
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <RiCloseLine className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-10">Para:</span>
          <Input
            placeholder="email@ejemplo.com, otro@ejemplo.com"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-7 text-xs"
          />
          {!showCc && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => setShowCc(true)}
            >
              CC
            </Button>
          )}
        </div>

        {showCc && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-10">CC:</span>
            <Input
              placeholder="cc@ejemplo.com"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-10">Asunto:</span>
          <Input
            placeholder="Asunto del email"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-7 text-xs"
          />
        </div>

        <Textarea
          placeholder="Escribí tu mensaje..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[100px] text-xs resize-none"
        />

        <div className="flex justify-end">
          <Button
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleSend}
            disabled={sending}
          >
            <RiSendPlane2Fill className="w-3.5 h-3.5" />
            {sending ? "Enviando..." : "Enviar Email"}
          </Button>
        </div>
      </div>
    </div>
  );
}
