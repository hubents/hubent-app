"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface ToolkitStatus {
  slug: string;
  name: string;
  description: string;
  icon: string;
  requiresBusiness: boolean;
  helpUrl: string | null;
  helpTooltip: string | null;
  isConnected: boolean;
  status: string;
  connectedEmail: string | null;
  connectedByName: string | null;
  connectedAt: string | null;
}

export interface ComingSoonApp {
  slug: string;
  name: string;
  description: string;
  category: string;
  logoUrl: string;
}

export function useIntegrations() {
  const [toolkits, setToolkits] = useState<ToolkitStatus[]>([]);
  const [comingSoonApps, setComingSoonApps] = useState<ComingSoonApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/integrations/status");
      const data = await res.json();
      if (data.success) {
        setToolkits(data.data.toolkits);
        setComingSoonApps(data.data.comingSoon || []);
        setError(null);
      } else {
        setError(data.error || "Error al obtener estado");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const connect = useCallback(
    async (toolkit: string) => {
      try {
        const res = await fetch("/api/integrations/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolkit }),
        });
        const data = await res.json();

        if (data.success && data.data.redirectUrl) {
          window.open(data.data.redirectUrl, "_blank", "width=600,height=700");
          toast.info("Completá la autorización en la ventana abierta");
        } else {
          toast.error(data.error || "Error al conectar");
        }
      } catch {
        toast.error("Error de conexión");
      }
    },
    []
  );

  const disconnect = useCallback(
    async (toolkit: string) => {
      try {
        const res = await fetch("/api/integrations/disconnect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolkit }),
        });
        const data = await res.json();

        if (data.success) {
          toast.success("Integración desconectada");
          await fetchStatus();
        } else {
          toast.error(data.error || "Error al desconectar");
        }
      } catch {
        toast.error("Error de conexión");
      }
    },
    [fetchStatus]
  );

  return {
    toolkits,
    comingSoonApps,
    loading,
    error,
    connect,
    disconnect,
    refresh: fetchStatus,
  };
}
