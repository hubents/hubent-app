"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RiAddLine,
  RiCalendarLine,
  RiMapPinLine,
  RiGroupLine,
  RiMoneyDollarCircleLine,
  RiCalendarEventLine,
} from "@remixicon/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateEventDialog } from "@/components/events/create-event-dialog";

interface Event {
  id: string;
  name: string;
  eventType: string;
  date: string | null;
  venue: string | null;
  guestCount: number | null;
  status: string;
  budget: number | null;
}

const statusMap: Record<string, { label: string; variant: "secondary" | "warning" | "success" | "default" }> = {
  planning: { label: "Planificando", variant: "secondary" },
  in_progress: { label: "En progreso", variant: "warning" },
  active: { label: "Activo", variant: "success" },
  completed: { label: "Completado", variant: "success" },
  cancelled: { label: "Cancelado", variant: "default" },
};

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const loadEvents = async () => {
    try {
      const res = await fetch("/api/events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Eventos</h1>
          <p className="text-[var(--muted-foreground)]">
            Gestiona todas tus bodas y eventos
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
          <RiAddLine className="h-4 w-4" />
          Nuevo Evento
        </Button>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-[var(--muted-foreground)]">Cargando eventos...</p>
        </div>
      ) : events.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => {
            const status = statusMap[event.status] || statusMap.planning;

            return (
              <Link key={event.id} href={`/dashboard/events/${event.id}`}>
                <Card className="h-full transition-all hover:shadow-md hover:border-[var(--primary)]">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{event.name}</h3>
                          <p className="text-sm text-[var(--muted-foreground)]">
                            {event.eventType}
                          </p>
                        </div>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>

                      {/* Info */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                          <RiCalendarLine className="h-4 w-4" />
                          <span>
                            {event.date 
                              ? new Date(event.date).toLocaleDateString("es-ES", {
                                  weekday: "long",
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                })
                              : "Fecha por definir"
                            }
                          </span>
                        </div>
                        {event.venue && (
                          <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                            <RiMapPinLine className="h-4 w-4" />
                            <span>{event.venue}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                          <RiGroupLine className="h-4 w-4" />
                          <span>{event.guestCount || 0} invitados</span>
                        </div>
                      </div>

                      {/* Budget */}
                      {event.budget && (
                        <div className="flex items-center justify-between rounded-lg bg-[var(--muted)] p-3">
                          <div className="flex items-center gap-2">
                            <RiMoneyDollarCircleLine className="h-4 w-4 text-[var(--muted-foreground)]" />
                            <span className="text-sm text-[var(--muted-foreground)]">
                              Presupuesto
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              ${event.budget.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <RiCalendarEventLine className="h-16 w-16 mx-auto text-[var(--muted-foreground)] mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay eventos aún</h3>
              <p className="text-[var(--muted-foreground)] mb-4">
                Crea tu primer evento para comenzar a organizar
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <RiAddLine className="h-4 w-4 mr-2" />
                Crear primer evento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <CreateEventDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onEventCreated={loadEvents}
      />
    </div>
  );
}
