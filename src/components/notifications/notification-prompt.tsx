"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { hgIcon } from "@/components/ui/hg-icon";
import { Notification01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

const RiBellLine = hgIcon(Notification01Icon);
const RiCloseLine = hgIcon(Cancel01Icon);
import { useNotificationPrompt } from "@/hooks/use-beams";

export function NotificationPrompt() {
  const { shouldShowPrompt, requestPermission, dismiss } = useNotificationPrompt();
  const [isRequesting, setIsRequesting] = useState(false);

  if (!shouldShowPrompt) return null;

  const handleEnable = async () => {
    setIsRequesting(true);
    await requestPermission();
    setIsRequesting(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-background border border-border rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-full shrink-0">
            <RiBellLine className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm mb-1">Activar notificaciones</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Recibe alertas cuando te asignen tareas, lleguen mensajes o tengas recordatorios importantes.
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleEnable}
                disabled={isRequesting}
                className="h-8"
              >
                {isRequesting ? "Activando..." : "Activar"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={dismiss}
                className="h-8"
              >
                Ahora no
              </Button>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0 -mt-1 -mr-1"
            onClick={dismiss}
          >
            <RiCloseLine className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
