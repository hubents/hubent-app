"use client";

import { use, useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  RiAddLine,
  RiCalendarLine,
  RiEditLine,
  RiDeleteBinLine,
  RiCheckLine,
  RiCloseLine,
  RiMapPinLine,
} from "@remixicon/react";
import { useUserSessionContext } from "@/contexts/user-session-context";
import { useEventPermissions } from "@/hooks/use-event-permissions";
import { CalendarView } from "@/components/calendar/calendar-view";
import { CalendarFilters } from "@/components/calendar/calendar-filters";
import { CalendarUpcoming } from "@/components/calendar/calendar-upcoming";
import { EventSectionGuard } from "@/components/events/event-section-guard";
import { useCalendar } from "@/hooks/use-calendar";
import { CALENDAR_COLORS, CALENDAR_LABELS } from "@/lib/calendar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function EventSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);
  const { eventScoped } = useUserSessionContext();
  const { canEdit } = useEventPermissions(eventId, eventScoped);

  const {
    month,
    year,
    filteredItems,
    filteredItemsByDate,
    loading,
    filters,
    allowedTypes,
    toggleFilter,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
    refetch,
  } = useCalendar({ eventId, visibleTypes: ["event", "task", "meeting", "payment", "task_payment", "document", "schedule"], filterKey: "hubents-calendar-filters-event" });

  // Schedule items CRUD state
  interface ScheduleItem {
    id: number;
    title: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    description: string | null;
    location: string | null;
    source: string;
    taskTitle: string | null;
  }
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<Partial<ScheduleItem>>({});
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchScheduleItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/schedule`);
      const data = await res.json();
      if (data.success) setScheduleItems(data.data);
    } catch { /* ignore */ }
    finally { setItemsLoading(false); }
  }, [eventId]);

  useEffect(() => {
    fetchScheduleItems();
  }, [fetchScheduleItems]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    description: "",
    location: "",
  });

  const handleAdd = async () => {
    if (!newItem.title.trim() || !newItem.date) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/events/${eventId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newItem.title.trim(),
          date: newItem.date,
          startTime: newItem.startTime || undefined,
          endTime: newItem.endTime || undefined,
          description: newItem.description.trim() || undefined,
          location: newItem.location.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewItem({ title: "", date: "", startTime: "", endTime: "", description: "", location: "" });
        setShowAddForm(false);
        refetch();
        fetchScheduleItems();
      }
    } finally {
      setAdding(false);
    }
  };

  return (
    <EventSectionGuard eventId={eventId} section="general">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RiCalendarLine className="h-6 w-6" />
            Cronograma
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Calendario del evento
          </p>
        </div>
        {canEdit("general") && (
          <Button className="gap-1" onClick={() => setShowAddForm(!showAddForm)}>
            <RiAddLine className="h-4 w-4" />
            Agregar Item
          </Button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                placeholder="Título *"
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              />
              <Input
                type="date"
                value={newItem.date}
                onChange={(e) => setNewItem({ ...newItem, date: e.target.value })}
              />
              <div className="flex gap-2">
                <Input
                  type="time"
                  placeholder="Inicio"
                  value={newItem.startTime}
                  onChange={(e) => setNewItem({ ...newItem, startTime: e.target.value })}
                />
                <Input
                  type="time"
                  placeholder="Fin"
                  value={newItem.endTime}
                  onChange={(e) => setNewItem({ ...newItem, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="Ubicación (opcional)"
                value={newItem.location}
                onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
              />
              <Textarea
                placeholder="Descripción (opcional)"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                rows={1}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={adding || !newItem.title.trim() || !newItem.date}>
                {adding ? "Agregando..." : "Agregar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <CalendarFilters filters={filters} onToggle={toggleFilter} allowedTypes={allowedTypes} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <CalendarView
              month={month}
              year={year}
              itemsByDate={filteredItemsByDate}
              loading={loading}
              onPrevMonth={goToPrevMonth}
              onNextMonth={goToNextMonth}
              onToday={goToToday}
            />

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4">
              {allowedTypes.map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded ${CALENDAR_COLORS[type]}`} />
                  <span className="text-xs text-muted-foreground">
                    {CALENDAR_LABELS[type]}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle>Próximos</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarUpcoming items={filteredItems} />
          </CardContent>
        </Card>
      </div>

      {/* Schedule Items List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Items del Cronograma</CardTitle>
          <span className="text-xs text-muted-foreground">
            {scheduleItems.filter((i) => i.source === "event").length} propios
            {scheduleItems.filter((i) => i.source === "task").length > 0 &&
              ` · ${scheduleItems.filter((i) => i.source === "task").length} de tareas`}
          </span>
        </CardHeader>
        <CardContent>
          {itemsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : scheduleItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No hay items en el cronograma
            </div>
          ) : (
            <div className="space-y-1">
              {scheduleItems.map((item) => {
                const isEditing = editingId === item.id && item.source === "event";
                const isEventItem = item.source === "event";
                const dateStr = new Date(item.date).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });

                if (isEditing) {
                  return (
                    <div key={`${item.source}-${item.id}`} className="p-3 rounded-lg border bg-muted/50 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Input
                          value={editFields.title ?? ""}
                          onChange={(e) => setEditFields({ ...editFields, title: e.target.value })}
                          placeholder="Título"
                          className="h-8 text-sm"
                        />
                        <Input
                          type="date"
                          value={editFields.date ?? ""}
                          onChange={(e) => setEditFields({ ...editFields, date: e.target.value })}
                          className="h-8 text-sm"
                        />
                        <div className="flex gap-1">
                          <Input
                            type="time"
                            value={editFields.startTime ?? ""}
                            onChange={(e) => setEditFields({ ...editFields, startTime: e.target.value })}
                            className="h-8 text-sm"
                          />
                          <Input
                            type="time"
                            value={editFields.endTime ?? ""}
                            onChange={(e) => setEditFields({ ...editFields, endTime: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input
                          value={editFields.location ?? ""}
                          onChange={(e) => setEditFields({ ...editFields, location: e.target.value })}
                          placeholder="Ubicación"
                          className="h-8 text-sm"
                        />
                        <Input
                          value={editFields.description ?? ""}
                          onChange={(e) => setEditFields({ ...editFields, description: e.target.value })}
                          placeholder="Descripción"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => { setEditingId(null); setEditFields({}); }}
                        >
                          <RiCloseLine className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="default"
                          size="icon"
                          className="h-7 w-7"
                          onClick={async () => {
                            const body: Record<string, unknown> = { scheduleItemId: item.id };
                            if (editFields.title !== undefined) body.title = editFields.title;
                            if (editFields.date !== undefined) body.date = editFields.date;
                            if (editFields.startTime !== undefined) body.startTime = editFields.startTime || null;
                            if (editFields.endTime !== undefined) body.endTime = editFields.endTime || null;
                            if (editFields.location !== undefined) body.location = editFields.location || null;
                            if (editFields.description !== undefined) body.description = editFields.description || null;
                            const res = await fetch(`/api/events/${eventId}/schedule`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(body),
                            });
                            const data = await res.json();
                            if (data.success) {
                              setEditingId(null);
                              setEditFields({});
                              refetch();
                              fetchScheduleItems();
                            }
                          }}
                        >
                          <RiCheckLine className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={`${item.source}-${item.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg border text-sm group hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-14 text-center shrink-0">
                      <span className="text-xs font-medium">
                        {item.startTime || "--:--"}
                      </span>
                    </div>
                    <div
                      className="w-1 h-8 rounded-full shrink-0"
                      style={{ backgroundColor: isEventItem ? "#6366f1" : "#f59e0b" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{dateStr}</span>
                        {item.endTime && <span>→ {item.endTime}</span>}
                        {item.location && (
                          <span className="flex items-center gap-0.5">
                            <RiMapPinLine className="h-3 w-3" />
                            {item.location}
                          </span>
                        )}
                        {!isEventItem && item.taskTitle && (
                          <span className="text-amber-600">Tarea: {item.taskTitle}</span>
                        )}
                      </div>
                    </div>
                    {isEventItem && canEdit("general") && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditFields({
                              title: item.title,
                              date: new Date(item.date).toISOString().split("T")[0],
                              startTime: item.startTime ?? "",
                              endTime: item.endTime ?? "",
                              location: item.location ?? "",
                              description: item.description ?? "",
                            });
                          }}
                        >
                          <RiEditLine className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeletingId(item.id)}
                        >
                          <RiDeleteBinLine className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar item del cronograma?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deletingId) return;
                const res = await fetch(
                  `/api/events/${eventId}/schedule?scheduleItemId=${deletingId}`,
                  { method: "DELETE" }
                );
                const data = await res.json();
                if (data.success) {
                  setDeletingId(null);
                  refetch();
                  fetchScheduleItems();
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </EventSectionGuard>
  );
}
