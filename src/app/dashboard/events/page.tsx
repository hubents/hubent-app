"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AvatarGroup } from "@/components/ui/avatar-group";
import {
  RiAddLine,
  RiCalendarLine,
  RiMapPinLine,
  RiUserLine,
  RiCalendarEventLine,
  RiGridLine,
  RiListUnordered,
  RiSearchLine,
  RiMoreLine,
  RiFileCopyLine,
  RiFileList3Line,
  RiFilter3Line,
  RiArrowUpDownLine,
  RiCheckLine,
} from "@remixicon/react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { NumericPagination } from "@/components/ui/numeric-pagination";
import { CreateEventDrawer } from "@/components/events/create-event-drawer";
import { DuplicateEventDrawer } from "@/components/events/duplicate-event-drawer";
import { SaveAsTemplateDrawer } from "@/components/events/save-as-template-drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUserSessionContext } from "@/contexts/user-session-context";

interface Participant {
  userId: string;
  userName: string | null;
  userImage: string | null;
}

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
  progress: number;
  totalTasks: number;
  completedTasks: number;
  participantCount: number;
  participants: Participant[];
}

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
  wedding: "bg-pink-50 text-pink-700",
  pre_wedding: "bg-green-50 text-green-700",
  post_wedding: "bg-orange-50 text-orange-700",
  birthday: "bg-purple-50 text-purple-700",
  corporate: "bg-blue-50 text-blue-700",
  social: "bg-yellow-50 text-yellow-700",
  other: "bg-gray-50 text-gray-700",
};

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  confirmed: "Confirmado",
  in_progress: "En progreso",
  completed: "Completado",
  cancelled: "Cancelado",
};

type SortOption = "date_desc" | "date_asc" | "name_asc" | "name_desc" | "budget_desc" | "budget_asc";

export default function EventsPage() {
  const { can } = useUserSessionContext();
  const canCreate = can("events:create");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [duplicateEvent, setDuplicateEvent] = useState<Event | null>(null);
  const [saveAsTemplateEvent, setSaveAsTemplateEvent] = useState<Event | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("date_desc");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString() });
      const res = await fetch(`/api/events?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.data || []);
        if (data.meta) setMeta(data.meta);
      }
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const activeFilterCount = (filterType ? 1 : 0) + (filterStatus ? 1 : 0);

  const filteredAndSortedEvents = useMemo(() => {
    let result = events.filter((event) =>
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeLabels[event.type] || event.type).toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filterType) {
      result = result.filter((e) => e.type === filterType);
    }
    if (filterStatus) {
      result = result.filter((e) => e.status === filterStatus);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "date_desc":
          return (b.date || "").localeCompare(a.date || "");
        case "date_asc":
          return (a.date || "").localeCompare(b.date || "");
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "budget_desc":
          return (parseFloat(b.budget || "0")) - (parseFloat(a.budget || "0"));
        case "budget_asc":
          return (parseFloat(a.budget || "0")) - (parseFloat(b.budget || "0"));
        default:
          return 0;
      }
    });

    return result;
  }, [events, searchTerm, filterType, filterStatus, sortBy]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Por definir";
    return new Date(dateStr).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatBudget = (budget: string | null) => {
    if (!budget) return null;
    const num = parseFloat(budget);
    if (num >= 1000) {
      return `€${num.toLocaleString("es-ES", { maximumFractionDigits: 0 })}`;
    }
    return `€${num.toLocaleString("es-ES")}`;
  };

  const sortLabels: Record<SortOption, string> = {
    date_desc: "Fecha (más reciente)",
    date_asc: "Fecha (más antigua)",
    name_asc: "Nombre (A-Z)",
    name_desc: "Nombre (Z-A)",
    budget_desc: "Presupuesto (mayor)",
    budget_asc: "Presupuesto (menor)",
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Todos tus eventos</h1>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-12"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘1
          </kbd>
        </div>

        {/* Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <RiFilter3Line className="h-4 w-4" />
              Filtrar
              {activeFilterCount > 0 && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-3 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Tipo</p>
              <div className="space-y-1">
                {Object.entries(typeLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFilterType(filterType === key ? null : key)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    {filterType === key && <RiCheckLine className="h-3.5 w-3.5" />}
                    <span className={filterType === key ? "" : "ml-5"}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <DropdownMenuSeparator />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Estado</p>
              <div className="space-y-1">
                {Object.entries(statusLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFilterStatus(filterStatus === key ? null : key)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    {filterStatus === key && <RiCheckLine className="h-3.5 w-3.5" />}
                    <span className={filterStatus === key ? "" : "ml-5"}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
            {activeFilterCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <button
                  onClick={() => { setFilterType(null); setFilterStatus(null); }}
                  className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
                >
                  Limpiar filtros
                </button>
              </>
            )}
          </PopoverContent>
        </Popover>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <RiArrowUpDownLine className="h-4 w-4" />
              Ordenar por
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {(Object.entries(sortLabels) as [SortOption, string][]).map(([key, label]) => (
              <DropdownMenuItem key={key} onClick={() => setSortBy(key)}>
                {sortBy === key && <RiCheckLine className="h-3.5 w-3.5 mr-2" />}
                <span className={sortBy === key ? "" : "ml-5"}>{label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        {/* View Toggle */}
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewMode("grid")}
          >
            <RiGridLine className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewMode("list")}
          >
            <RiListUnordered className="h-4 w-4" />
          </Button>
        </div>

        {canCreate && (
          <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
            <RiAddLine className="h-4 w-4" />
            Nuevo evento
          </Button>
        )}
      </div>

      {/* Events Display */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando eventos...</p>
        </div>
      ) : filteredAndSortedEvents.length > 0 ? (
        viewMode === "grid" ? (
          /* Grid View */
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredAndSortedEvents.map((event) => (
              <Card key={event.id} className="group h-full transition-shadow hover:shadow-sm relative">
                {/* Hover menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 right-3 h-7 w-7 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.preventDefault()}
                    >
                      <RiMoreLine className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canCreate && (
                      <DropdownMenuItem onClick={() => setDuplicateEvent(event)}>
                        <RiFileCopyLine className="h-4 w-4 mr-2" />
                        Duplicar evento
                      </DropdownMenuItem>
                    )}
                    {canCreate && (
                      <DropdownMenuItem onClick={() => setSaveAsTemplateEvent(event)}>
                        <RiFileList3Line className="h-4 w-4 mr-2" />
                        Guardar como template
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Link href={`/dashboard/events/${event.id}`}>
                  <CardContent className="p-5 space-y-4">
                    {/* Name + Avatars */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Nombre del evento</p>
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-base truncate">{event.name}</h3>
                        {(event.participants.length > 0 || event.participantCount > 0) && (
                          <AvatarGroup
                            items={event.participants.map((p) => ({ name: p.userName, image: p.userImage }))}
                            max={3}
                            total={event.participantCount}
                            size="sm"
                          />
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Progreso</p>
                      <Progress value={event.progress} className="h-2" />
                    </div>

                    {/* Data grid 2x2 */}
                    <div className="border-t pt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Presupuesto</p>
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">€</span>
                          <span className="font-medium">{formatBudget(event.budget) || "—"}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Lugar</p>
                        <div className="flex items-center gap-1.5 text-sm">
                          <RiMapPinLine className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{event.location || "—"}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Fecha del evento</p>
                        <div className="flex items-center gap-1.5 text-sm">
                          <RiCalendarLine className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{formatDate(event.date)}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Invitados</p>
                        <div className="flex items-center gap-1.5 text-sm">
                          <RiUserLine className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span>{event.guestCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        ) : (
          /* List View */
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Nombre del evento</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Fecha de inicio</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Fecha de finalización</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Progreso</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Participantes</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedEvents.map((event) => {
                    const typeLabel = typeLabels[event.type] || event.type;
                    const typeColor = typeColors[event.type] || typeColors.other;

                    return (
                      <tr key={event.id} className="group border-b hover:bg-muted/50 transition-colors relative">
                        <td className="p-4">
                          <Link href={`/dashboard/events/${event.id}`} className="font-medium hover:text-primary">
                            {event.name}
                          </Link>
                        </td>
                        <td className="p-4 text-sm">{formatDate(event.date)}</td>
                        <td className="p-4 text-sm">{formatDate(event.endDate)}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium w-8">{event.progress}%</span>
                            <Progress value={event.progress} className="h-1.5 w-20" />
                          </div>
                        </td>
                        <td className="p-4">
                          {(event.participants.length > 0 || event.participantCount > 0) && (
                            <AvatarGroup
                              items={event.participants.map((p) => ({ name: p.userName, image: p.userImage }))}
                              max={3}
                              total={event.participantCount}
                              size="sm"
                            />
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeColor}`}>
                            {typeLabel}
                          </span>
                        </td>
                        {/* Hover actions */}
                        <td className="p-4 w-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <RiMoreLine className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canCreate && (
                                <DropdownMenuItem onClick={() => setDuplicateEvent(event)}>
                                  <RiFileCopyLine className="h-4 w-4 mr-2" />
                                  Duplicar evento
                                </DropdownMenuItem>
                              )}
                              {canCreate && (
                                <DropdownMenuItem onClick={() => setSaveAsTemplateEvent(event)}>
                                  <RiFileList3Line className="h-4 w-4 mr-2" />
                                  Guardar como template
                                </DropdownMenuItem>
                              )}
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
              <RiCalendarEventLine className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm || filterType || filterStatus ? "No se encontraron eventos" : "No hay eventos aún"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterType || filterStatus
                  ? "Intenta con otra búsqueda o ajusta los filtros" 
                  : "Crea tu primer evento para comenzar a organizar"
                }
              </p>
              {!searchTerm && !filterType && !filterStatus && canCreate && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <RiAddLine className="h-4 w-4 mr-2" />
                  Crear primer evento
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((meta.page - 1) * meta.limit) + 1}–{Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
          </p>
          <NumericPagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      <CreateEventDrawer
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onEventCreated={loadEvents}
      />

      {duplicateEvent && (
        <DuplicateEventDrawer
          open={!!duplicateEvent}
          onOpenChange={(open) => !open && setDuplicateEvent(null)}
          eventId={duplicateEvent.id}
          eventName={duplicateEvent.name}
          onDuplicated={loadEvents}
        />
      )}

      {saveAsTemplateEvent && (
        <SaveAsTemplateDrawer
          open={!!saveAsTemplateEvent}
          onOpenChange={(open) => !open && setSaveAsTemplateEvent(null)}
          eventId={saveAsTemplateEvent.id}
          eventName={saveAsTemplateEvent.name}
        />
      )}
    </div>
  );
}
