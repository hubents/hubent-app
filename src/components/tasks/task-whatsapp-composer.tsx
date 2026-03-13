"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RiSendPlane2Fill, RiCloseLine, RiWhatsappLine } from "@remixicon/react";
import { toast } from "sonner";

interface TaskWhatsAppComposerProps {
  taskId: number;
  onClose: () => void;
  onSent: () => void;
}

export function TaskWhatsAppComposer({
  taskId,
  onClose,
  onSent,
}: TaskWhatsAppComposerProps) {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!to.trim()) {
      toast.error("Ingresá un número de teléfono");
      return;
    }
    if (!message.trim()) {
      toast.error("Ingresá un mensaje");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Mensaje de WhatsApp enviado");
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
          <RiWhatsappLine className="w-4 h-4 text-green-500" />
          Nuevo WhatsApp
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <RiCloseLine className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-10">Para:</span>
          <Input
            placeholder="+54 9 11 1234-5678"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-7 text-xs"
          />
        </div>

        <Textarea
          placeholder="Escribí tu mensaje..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[80px] text-xs resize-none"
        />

        <div className="flex justify-end">
          <Button
            size="sm"
            className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
            onClick={handleSend}
            disabled={sending}
          >
            <RiSendPlane2Fill className="w-3.5 h-3.5" />
            {sending ? "Enviando..." : "Enviar WhatsApp"}
          </Button>
        </div>
      </div>
    </div>
  );
}
