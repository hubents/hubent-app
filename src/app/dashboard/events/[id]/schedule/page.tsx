"use client";

import { use, useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiAddLine,
  RiDeleteBinLine,
  RiTimeLine,
  RiCalendarLine,
  RiMapPinLine,
  RiEditLine,
  RiCloseLine,
  RiCheckLine,
  RiLinkM,
} from "@remixicon/react";
import { useUserSessionContext } from "@/contexts/user-session-context";
import { useEventPermissions } from "@/hooks/use-event-permissions";

interface ScheduleItem {
  id: number;
  eventId: number;
  organizationId: number;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  notes: string | null;
  color: string | null;
  sortOrder: number;
  source: "event" | "task";
  taskId: number | null;
  taskTitle: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export default function EventSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);
  const { eventScoped } = useUserSessionContext();
  const { canEdit } = useEventPermissions(eventId, eventScoped);

  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ title: "", date: "", startTime: "", endTime: "", description: "", location: "" });
  const [newItem, setNewItem] = useState({
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    description: "",
    location: "",
  });

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/schedule`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch schedule:", err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

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
        await fetchItems();
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (itemId: number) => {
    if (!confirm("¿Eliminar este item del cronograma?")) return;
    try {
      await fetch(`/api/events/${eventId}/schedule?scheduleItemId=${itemId}`, { method: "DELETE" });
      await fetchItems();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const startEdit = (item: ScheduleItem) => {
    setEditingId(item.id);
    setEditData({
      title: item.title,
      date: item.date ? item.date.split("T")[0] : "",
      startTime: item.startTime || "",
      endTime: item.endTime || "",
      description: item.description || "",
      location: item.location || "",
    });
  };

  const handleUpdate = async () => {
    if (!editingId || !editData.title.trim() || !editData.date) return;
    try {
      const res = await fetch(`/api/events/${eventId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleItemId: editingId,
          title: editData.title.trim(),
          date: editData.date,
          startTime: editData.startTime || null,
          endTime: editData.endTime || null,
          description: editData.description.trim() || null,
          location: editData.location.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        await fetchItems();
      }
    } catch (err) {
      console.error("Failed to update:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-ES", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Group items by date
  const groupedItems = items.reduce<Record<string, ScheduleItem[]>>((acc, item) => {
    const dateKey = item.date.split("T")[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedItems).sort();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

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
            Agenda y timeline del evento
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

      {/* Timeline */}
      {sortedDates.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <RiCalendarLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay items en el cronograma</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Agrega actividades, horarios y puntos importantes del evento.
            </p>
            {canEdit("general") && (
              <Button variant="outline" onClick={() => setShowAddForm(true)} className="gap-1">
                <RiAddLine className="h-4 w-4" />
                Crear primer item
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        sortedDates.map((dateKey) => (
          <Card key={dateKey}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <RiCalendarLine className="h-4 w-4 text-muted-foreground" />
                {formatDate(dateKey)}
                <Badge variant="secondary" className="text-xs">
                  {groupedItems[dateKey].length} {groupedItems[dateKey].length === 1 ? "item" : "items"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {groupedItems[dateKey].map((item) => (
                <div
                  key={`${item.source}-${item.id}`}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  {/* Time */}
                  <div className="w-20 shrink-0 text-center pt-0.5">
                    {item.startTime ? (
                      <div>
                        <p className="text-sm font-medium">{item.startTime}</p>
                        {item.endTime && (
                          <p className="text-xs text-muted-foreground">{item.endTime}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">--:--</p>
                    )}
                  </div>

                  {/* Color bar */}
                  <div
                    className="w-1 self-stretch rounded-full shrink-0"
                    style={{ backgroundColor: item.color || (item.source === "task" ? "#f59e0b" : "#3b82f6") }}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {editingId === item.id && item.source === "event" ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            value={editData.title}
                            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                            placeholder="Título"
                          />
                          <Input
                            type="date"
                            value={editData.date}
                            onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                          />
                          <div className="flex gap-1">
                            <Input
                              type="time"
                              value={editData.startTime}
                              onChange={(e) => setEditData({ ...editData, startTime: e.target.value })}
                            />
                            <Input
                              type="time"
                              value={editData.endTime}
                              onChange={(e) => setEditData({ ...editData, endTime: e.target.value })}
                            />
                          </div>
                        </div>
                        <Input
                          value={editData.location}
                          onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                          placeholder="Ubicación"
                        />
                        <Textarea
                          value={editData.description}
                          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                          placeholder="Descripción"
                          rows={2}
                        />
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleUpdate}>
                            <RiCheckLine className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                            <RiCloseLine className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.title}</p>
                          {item.source === "task" && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <RiLinkM className="h-2.5 w-2.5" />
                              {item.taskTitle || "Tarea"}
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        )}
                        {item.location && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <RiMapPinLine className="h-3 w-3" />
                            {item.location}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions (only for event items, not task-inherited) */}
                  {canEdit("general") && item.source === "event" && editingId !== item.id && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(item)}>
                        <RiEditLine className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        <RiDeleteBinLine className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
