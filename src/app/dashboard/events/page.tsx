"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  RiAddLine,
  RiCalendarLine,
  RiMapPinLine,
  RiGroupLine,
  RiMoneyDollarCircleLine,
  RiCalendarEventLine,
  RiGridLine,
  RiListUnordered,
  RiSearchLine,
  RiMoreLine,
  RiFileCopyLine,
  RiFileList3Line,
} from "@remixicon/react";
import { useEffect, useState } from "react";
import { CreateEventDialog } from "@/components/events/create-event-drawer";
import { DuplicateEventDialog } from "@/components/events/duplicate-event-drawer";
import { SaveAsTemplateDialog } from "@/components/events/save-as-template-drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Event {
  id: number;
  name: string;
  type: string;
  date: string | null;
  endDate: string | null;
  location: string | null;
  guestCount: number | null;
  status: string;
  budget: string | null;
  description: string | null;
  createdAt: string | null;
}

const statusMap: Record<string, { label: string; variant: "secondary" | "warning" | "success" | "default" }> = {
  draft: { label: "Borrador", variant: "secondary" },
  confirmed: { label: "Confirmado", variant: "success" },
  in_progress: { label: "En progreso", variant: "warning" },
  completed: { label: "Completado", variant: "success" },
  cancelled: { label: "Cancelado", variant: "default" },
};

const typeLabels: Record<string, string> = {
  wedding: "Boda",
  pre_wedding: "Pre-Boda",
  post_wedding: "Post-Boda",
  birthday: "Cumpleaños",
  corporate: "Corporativo",
  social: "Social",
  other: "Otro",
};

const typeColors: Record<string, string> = {
  wedding: "bg-pink-100 text-pink-700",
  pre_wedding: "bg-green-100 text-green-700",
  post_wedding: "bg-orange-100 text-orange-700",
  birthday: "bg-purple-100 text-purple-700",
  corporate: "bg-blue-100 text-blue-700",
  social: "bg-yellow-100 text-yellow-700",
  other: "bg-gray-100 text-gray-700",
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [duplicateEvent, setDuplicateEvent] = useState<Event | null>(null);
  const [saveAsTemplateEvent, setSaveAsTemplateEvent] = useState<Event | null>(null);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.data || []);
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

  const filteredEvents = events.filter((event) =>
    event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (typeLabels[event.type] || event.type).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Por definir";
    return new Date(dateStr).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateLong = (dateStr: string | null) => {
    if (!dateStr) return "Fecha por definir";
    return new Date(dateStr).toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-[var(--gap-cards-lg)]">
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

      {/* Search and View Toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            placeholder="Buscar eventos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <RiGridLine className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <RiListUnordered className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Events Display */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-[var(--muted-foreground)]">Cargando eventos...</p>
        </div>
      ) : filteredEvents.length > 0 ? (
        viewMode === "grid" ? (
          /* Grid View */
          <div className="grid gap-[var(--gap-cards)] md:grid-cols-2 xl:grid-cols-3">
            {filteredEvents.map((event) => {
              const status = statusMap[event.status] || statusMap.draft;
              const typeLabel = typeLabels[event.type] || event.type;
              const typeColor = typeColors[event.type] || typeColors.other;

              return (
                <Card key={event.id} className="h-full transition-all hover:shadow-md hover:border-[var(--primary)] relative">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 z-10"
                        onClick={(e) => e.preventDefault()}
                      >
                        <RiMoreLine className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDuplicateEvent(event)}>
                        <RiFileCopyLine className="h-4 w-4 mr-2" />
                        Duplicar evento
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSaveAsTemplateEvent(event)}>
                        <RiFileList3Line className="h-4 w-4 mr-2" />
                        Guardar como template
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Link href={`/dashboard/events/${event.id}`}>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between pr-8">
                          <div className="space-y-1">
                            <h3 className="font-semibold">{event.name}</h3>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeColor}`}>
                              {typeLabel}
                            </span>
                          </div>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>

                        {/* Info */}
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                            <RiCalendarLine className="h-4 w-4" />
                            <span>{formatDateLong(event.date)}</span>
                          </div>
                          {event.endDate && event.endDate !== event.date && (
                            <div className="flex items-center gap-2 text-[var(--muted-foreground)] pl-6">
                              <span>hasta {formatDate(event.endDate)}</span>
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                              <RiMapPinLine className="h-4 w-4" />
                              <span>{event.location}</span>
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
                                ${parseFloat(event.budget).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              );
            })}
          </div>
        ) : (
          /* List View */
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-[var(--muted)]">
                    <th className="text-left p-4 font-medium">Nombre</th>
                    <th className="text-left p-4 font-medium">Fecha Inicio</th>
                    <th className="text-left p-4 font-medium">Fecha Fin</th>
                    <th className="text-left p-4 font-medium">Invitados</th>
                    <th className="text-left p-4 font-medium">Tipo</th>
                    <th className="text-left p-4 font-medium">Estado</th>
                    <th className="text-left p-4 font-medium w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => {
                    const status = statusMap[event.status] || statusMap.draft;
                    const typeLabel = typeLabels[event.type] || event.type;
                    const typeColor = typeColors[event.type] || typeColors.other;

                    return (
                      <tr key={event.id} className="border-b hover:bg-[var(--muted)]/50 transition-colors">
                        <td className="p-4">
                          <Link href={`/dashboard/events/${event.id}`} className="font-medium hover:text-[var(--primary)]">
                            {event.name}
                          </Link>
                          {event.location && (
                            <p className="text-sm text-[var(--muted-foreground)]">{event.location}</p>
                          )}
                        </td>
                        <td className="p-4 text-sm">{formatDate(event.date)}</td>
                        <td className="p-4 text-sm">{formatDate(event.endDate)}</td>
                        <td className="p-4 text-sm">{event.guestCount || 0}</td>
                        <td className="p-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeColor}`}>
                            {typeLabel}
                          </span>
                        </td>
                        <td className="p-4">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <RiMoreLine className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setDuplicateEvent(event)}>
                                <RiFileCopyLine className="h-4 w-4 mr-2" />
                                Duplicar evento
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSaveAsTemplateEvent(event)}>
                                <RiFileList3Line className="h-4 w-4 mr-2" />
                                Guardar como template
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <RiCalendarEventLine className="h-16 w-16 mx-auto text-[var(--muted-foreground)] mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? "No se encontraron eventos" : "No hay eventos aún"}
              </h3>
              <p className="text-[var(--muted-foreground)] mb-4">
                {searchTerm 
                  ? "Intenta con otra búsqueda" 
                  : "Crea tu primer evento para comenzar a organizar"
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <RiAddLine className="h-4 w-4 mr-2" />
                  Crear primer evento
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <CreateEventDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onEventCreated={loadEvents}
      />

      {duplicateEvent && (
        <DuplicateEventDialog
          open={!!duplicateEvent}
          onOpenChange={(open) => !open && setDuplicateEvent(null)}
          eventId={duplicateEvent.id}
          eventName={duplicateEvent.name}
          onDuplicated={loadEvents}
        />
      )}

      {saveAsTemplateEvent && (
        <SaveAsTemplateDialog
          open={!!saveAsTemplateEvent}
          onOpenChange={(open) => !open && setSaveAsTemplateEvent(null)}
          eventId={saveAsTemplateEvent.id}
          eventName={saveAsTemplateEvent.name}
        />
      )}
    </div>
  );
}
