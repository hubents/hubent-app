"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RiCalendarLine, RiMapPinLine, RiTeamLine, RiCheckLine, RiCloseLine } from "@remixicon/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface InvitationData {
  id: number;
  eventName: string;
  eventDate: string | null;
  eventLocation: string | null;
  hostOrgName: string;
  hostOrgLogo: string | null;
  status: string;
  permissions: Record<string, string> | null;
  invitedAt: string;
}

export default function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvitation() {
      try {
        const res = await fetch(`/api/events/collaborations/resolve?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (data.success) {
          setInvitation(data.data);
        } else {
          setError(data.error?.message || "Invitación no encontrada");
        }
      } catch {
        setError("Error al cargar la invitación");
      } finally {
        setLoading(false);
      }
    }
    loadInvitation();
  }, [token]);

  async function handleAction(action: "accept" | "reject") {
    if (!invitation) return;
    setActing(true);
    try {
      const res = await fetch(`/api/events/collaborations/${invitation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(action === "accept" ? "Invitación aceptada" : "Invitación rechazada");
        if (action === "accept") {
          router.push("/dashboard/events");
        } else {
          router.push("/dashboard");
        }
      } else {
        toast.error(data.error?.message || "Error al procesar la invitación");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 space-y-4">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Ir al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) return null;

  const isPending = invitation.status === "pending";
  const permissionLabels: Record<string, string> = {
    general: "General", calendar: "Calendario", tasks: "Tareas",
    partners: "Partners", finances: "Finanzas", rsvp: "RSVP",
    guests: "Invitados", runsheet: "Orden del día",
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <RiTeamLine className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-xl">Invitación a colaborar</CardTitle>
          <CardDescription>
            <strong>{invitation.hostOrgName}</strong> te invita a colaborar en un evento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2">
            <h3 className="font-semibold text-lg">{invitation.eventName}</h3>
            {invitation.eventDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RiCalendarLine className="h-4 w-4" />
                {new Date(invitation.eventDate).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}
              </div>
            )}
            {invitation.eventLocation && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RiMapPinLine className="h-4 w-4" />
                {invitation.eventLocation}
              </div>
            )}
          </div>

          {invitation.permissions && (
            <div>
              <p className="text-sm font-medium mb-2">Acceso otorgado:</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(invitation.permissions)
                  .filter(([, v]) => v !== "none")
                  .map(([k, v]) => (
                    <Badge key={k} variant={v === "edit" ? "default" : "secondary"}>
                      {permissionLabels[k] || k}
                    </Badge>
                  ))}
              </div>
            </div>
          )}

          {!isPending && (
            <div className="text-center py-2">
              <Badge variant={invitation.status === "active" ? "success" : "secondary"}>
                {invitation.status === "active" ? "Aceptada" : invitation.status === "rejected" ? "Rechazada" : invitation.status}
              </Badge>
            </div>
          )}

          {isPending && (
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleAction("reject")}
                disabled={acting}
              >
                <RiCloseLine className="h-4 w-4 mr-1" />
                Rechazar
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleAction("accept")}
                disabled={acting}
              >
                <RiCheckLine className="h-4 w-4 mr-1" />
                Aceptar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
