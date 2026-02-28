"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiCalendarEventLine,
  RiMapPinLine,
  RiTimeLine,
  RiBuilding2Line,
  RiCheckLine,
  RiCloseLine,
} from "@remixicon/react";

interface VendorEvent {
  accessId: number;
  status: string | null;
  invitedAt: string | null;
  acceptedAt: string | null;
  eventId: number;
  eventName: string;
  eventDate: string | null;
  eventEndDate: string | null;
  eventStatus: string | null;
  eventLocation: string | null;
  plannerOrgName: string;
  plannerOrgLogo: string | null;
}

const ACCESS_STATUS: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "destructive" }> = {
  active: { label: "Activo", variant: "success" },
  pending: { label: "Pendiente", variant: "warning" },
  rejected: { label: "Rechazado", variant: "destructive" },
  revoked: { label: "Revocado", variant: "secondary" },
};

export default function VendorEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<VendorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/vendor/events");
      const data = await res.json();
      if (data.success) {
        setEvents(data.data);
      }
    } catch (error) {
      console.error("Error loading vendor events:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  async function handleAction(accessId: number, action: "accept" | "reject") {
    setActionLoading(accessId);
    try {
      const res = await fetch(`/api/vendor/events/${accessId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        await loadEvents();
      }
    } catch (error) {
      console.error("Error updating invitation:", error);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis Eventos</h1>
        <p className="text-muted-foreground">
          Eventos donde participas como proveedor
        </p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RiCalendarEventLine className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">Sin eventos asignados</p>
            <p className="text-sm text-muted-foreground mt-1">
              Cuando un planificador te asigne a un evento, aparecerá aquí.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const accessStatus = ACCESS_STATUS[event.status || "pending"] || ACCESS_STATUS.pending;

            return (
              <Card 
                key={event.accessId} 
                className={`hover:shadow-md transition-shadow ${event.status === "active" ? "cursor-pointer" : ""}`}
                onClick={() => event.status === "active" && router.push(`/vendor/events/${event.accessId}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <RiCalendarEventLine className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{event.eventName}</h3>
                        <Badge variant={accessStatus.variant}>{accessStatus.label}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <RiBuilding2Line className="h-3.5 w-3.5" />
                          {event.plannerOrgName}
                        </span>
                        {event.eventDate && (
                          <span className="flex items-center gap-1">
                            <RiTimeLine className="h-3.5 w-3.5" />
                            {new Date(event.eventDate).toLocaleDateString("es-AR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        )}
                        {event.eventLocation && (
                          <span className="flex items-center gap-1">
                            <RiMapPinLine className="h-3.5 w-3.5" />
                            {event.eventLocation}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Accept/Reject buttons for pending invitations */}
                    {event.status === "pending" && (
                      <div className="flex gap-2 shrink-0 ml-2">
                        <Button
                          size="sm"
                          onClick={() => handleAction(event.accessId, "accept")}
                          disabled={actionLoading === event.accessId}
                        >
                          <RiCheckLine className="h-4 w-4 mr-1" />
                          Aceptar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(event.accessId, "reject")}
                          disabled={actionLoading === event.accessId}
                        >
                          <RiCloseLine className="h-4 w-4 mr-1" />
                          Rechazar
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
