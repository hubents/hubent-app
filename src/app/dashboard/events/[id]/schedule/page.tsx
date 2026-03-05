"use client";

import { use, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  RiAddLine,
  RiCalendarLine,
} from "@remixicon/react";
import { useUserSessionContext } from "@/contexts/user-session-context";
import { useEventPermissions } from "@/hooks/use-event-permissions";
import { CalendarView } from "@/components/calendar/calendar-view";
import { CalendarFilters } from "@/components/calendar/calendar-filters";
import { CalendarUpcoming } from "@/components/calendar/calendar-upcoming";
import { useCalendar } from "@/hooks/use-calendar";
import { CALENDAR_COLORS, CALENDAR_LABELS } from "@/lib/calendar";
import type { CalendarItemType } from "@/lib/calendar";

const ALL_LEGEND_TYPES: CalendarItemType[] = [
  "event",
  "task",
  "meeting",
  "payment",
  "task_payment",
  "document",
  "schedule",
];

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
  } = useCalendar({ eventId });

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
      }
    } finally {
      setAdding(false);
    }
  };

  return (
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
              {(allowedTypes.length < ALL_LEGEND_TYPES.length ? allowedTypes : ALL_LEGEND_TYPES).map((type) => (
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
            <CalendarUpcoming items={filteredItems} maxDays={30} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
