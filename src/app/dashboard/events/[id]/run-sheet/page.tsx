"use client";

import { use, useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  RiListOrdered2,
  RiFileDownloadLine,
  RiMapPinLine,
  RiCalendarLine,
  RiInformationLine,
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiCloseLine,
  RiCheckLine,
  RiUser3Line,
  RiPrinterLine,
  RiFilterLine,
  RiFilterOffLine,
} from "@remixicon/react";
import { useEvent } from "@/contexts/event-context";
import { useUserSessionContext } from "@/contexts/user-session-context";
import { useEventPermissions } from "@/hooks/use-event-permissions";
import { EventSectionGuard } from "@/components/events/event-section-guard";
import { downloadPDFFromHTML } from "@/lib/pdf-download";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

interface ScheduleItem {
  id: number;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  notes: string | null;
  source: "event" | "task";
  taskTitle: string | null;
  taskId: number | null;
  vendorId: number | null;
  vendorName: string | null;
}

interface TaskOption {
  id: number;
  title: string;
}

interface VendorOption {
  id: number;
  name: string;
}

const emptyForm = {
  title: "",
  date: "",
  startTime: "",
  endTime: "",
  location: "",
  description: "",
  vendorId: "",
  targetSource: "event" as "event" | "task",
  targetTaskId: "",
};

export default function RunSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);
  const { activeEvent } = useEvent();
  const { eventScoped } = useUserSessionContext();
  const { canEdit } = useEventPermissions(eventId, eventScoped);
  const canEditRunSheet = canEdit("general");

  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [eventTasks, setEventTasks] = useState<TaskOption[]>([]);
  const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([]);

  // CRUD state
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ ...emptyForm });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter state
  const [filterVendor, setFilterVendor] = useState("");
  const [filterTask, setFilterTask] = useState("");

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/schedule`);
      const data = await res.json();
      if (data.success) setItems(data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [eventId]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks?eventId=${eventId}`);
      const data = await res.json();
      if (data.success) {
        setEventTasks(data.data?.map((t: any) => ({ id: t.id, title: t.title })) || []);
      }
    } catch { /* ignore */ }
  }, [eventId]);

  const fetchVendors = useCallback(async () => {
    try {
      const res = await fetch("/api/vendors");
      const data = await res.json();
      if (data.success) {
        setVendorOptions(data.data?.map((v: any) => ({ id: v.id, name: v.name })) || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchTasks();
    fetchVendors();
  }, [fetchItems, fetchTasks, fetchVendors]);

  const itemKey = (item: ScheduleItem) => `${item.source}-${item.id}`;

  // --- ADD ---
  const handleAdd = async () => {
    if (!newItem.title.trim() || !newItem.date) return;
    setAdding(true);
    try {
      const isTask = newItem.targetSource === "task" && newItem.targetTaskId;
      const url = isTask
        ? `/api/tasks/${newItem.targetTaskId}/schedule`
        : `/api/events/${eventId}/schedule`;

      const body: Record<string, unknown> = {
        title: newItem.title.trim(),
        date: newItem.date,
        startTime: newItem.startTime || undefined,
        endTime: newItem.endTime || undefined,
        location: newItem.location.trim() || undefined,
        description: newItem.description.trim() || undefined,
      };
      if (isTask && newItem.vendorId) {
        body.vendorId = parseInt(newItem.vendorId, 10);
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Actividad agregada");
        setNewItem({ ...emptyForm });
        setShowAddForm(false);
        fetchItems();
      } else {
        toast.error(data.error || "Error al agregar");
      }
    } catch {
      toast.error("Error al agregar actividad");
    } finally {
      setAdding(false);
    }
  };

  // --- EDIT ---
  const startEdit = (item: ScheduleItem) => {
    setEditingId(itemKey(item));
    setEditFields({
      title: item.title,
      date: new Date(item.date).toISOString().split("T")[0],
      startTime: item.startTime || "",
      endTime: item.endTime || "",
      location: item.location || "",
      description: item.description || "",
      vendorId: item.vendorId?.toString() || "",
      targetSource: item.source,
      targetTaskId: item.taskId?.toString() || "",
    });
  };

  const handleSaveEdit = async (item: ScheduleItem) => {
    const url = item.source === "task"
      ? `/api/tasks/${item.taskId}/schedule`
      : `/api/events/${eventId}/schedule`;

    const body: Record<string, unknown> = {
      scheduleItemId: item.id,
      title: editFields.title.trim(),
      date: editFields.date,
      startTime: editFields.startTime || null,
      endTime: editFields.endTime || null,
      location: editFields.location.trim() || null,
      description: editFields.description.trim() || null,
    };
    if (item.source === "task") {
      body.vendorId = editFields.vendorId ? parseInt(editFields.vendorId, 10) : null;
    }

    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Actividad actualizada");
        setEditingId(null);
        fetchItems();
      } else {
        toast.error(data.error || "Error al actualizar");
      }
    } catch {
      toast.error("Error al actualizar");
    }
  };

  // --- DELETE ---
  const handleDelete = async (item: ScheduleItem) => {
    const key = itemKey(item);
    if (deletingId === key) {
      const url = item.source === "task"
        ? `/api/tasks/${item.taskId}/schedule?scheduleItemId=${item.id}`
        : `/api/events/${eventId}/schedule?scheduleItemId=${item.id}`;
      try {
        const res = await fetch(url, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
          toast.success("Actividad eliminada");
          fetchItems();
        } else {
          toast.error(data.error || "Error al eliminar");
        }
      } catch {
        toast.error("Error al eliminar");
      }
      setDeletingId(null);
    } else {
      setDeletingId(key);
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  // --- PDF ---
  const handleDownloadPdf = async (opts?: { taskId?: number; vendorId?: number }) => {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (opts?.taskId) params.set("taskId", opts.taskId.toString());
      if (opts?.vendorId) params.set("vendorId", opts.vendorId.toString());
      const qs = params.toString() ? `?${params.toString()}` : "";
      const url = `/api/events/${eventId}/run-sheet/pdf${qs}`;
      const eventName = activeEvent?.name || "evento";
      const suffix = opts?.taskId ? `-tarea-${opts.taskId}` : opts?.vendorId ? `-proveedor-${opts.vendorId}` : "";
      const filename = `orden-del-dia-${eventName.replace(/\s+/g, "-").toLowerCase()}${suffix}`;
      await downloadPDFFromHTML(url, filename);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    const params = new URLSearchParams();
    if (filterVendor) params.set("vendorId", filterVendor);
    if (filterTask) params.set("taskId", filterTask);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const url = `/api/events/${eventId}/run-sheet/pdf${qs}`;
    window.open(url, "_blank");
  };

  // --- FILTERING ---
  const filteredItems = items.filter((item) => {
    if (filterVendor && (item.vendorId?.toString() !== filterVendor)) return false;
    if (filterTask) {
      if (filterTask === "__event__") {
        if (item.source !== "event") return false;
      } else if (item.taskId?.toString() !== filterTask) {
        return false;
      }
    }
    return true;
  });

  const hasFilters = filterVendor || filterTask;

  // Group items by date
  const itemsByDate = filteredItems.reduce<Record<string, ScheduleItem[]>>((acc, item) => {
    const dateKey = new Date(item.date).toISOString().split("T")[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});

  Object.values(itemsByDate).forEach((dateItems) => {
    dateItems.sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"));
  });

  const sortedDates = Object.keys(itemsByDate).sort();

  // Unique tasks/vendors for dropdowns
  const uniqueTasks = items
    .filter((i) => i.source === "task" && i.taskId)
    .reduce<{ id: number; title: string }[]>((acc, item) => {
      if (!acc.find((t) => t.id === item.taskId)) {
        acc.push({ id: item.taskId!, title: item.taskTitle || `Tarea #${item.taskId}` });
      }
      return acc;
    }, []);

  const uniqueVendors = items
    .filter((i) => i.vendorId && i.vendorName)
    .reduce<{ id: number; name: string }[]>((acc, item) => {
      if (!acc.find((v) => v.id === item.vendorId)) {
        acc.push({ id: item.vendorId!, name: item.vendorName! });
      }
      return acc;
    }, []);

  return (
    <EventSectionGuard eventId={eventId} section="general">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RiListOrdered2 className="h-6 w-6" />
            Orden del día
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Timeline consolidada del evento
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEditRunSheet && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); }}
            >
              <RiAddLine className="h-4 w-4 mr-1" />
              Agregar actividad
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={items.length === 0}>
            <RiPrinterLine className="h-4 w-4 mr-1" />
            Imprimir
          </Button>
          {uniqueVendors.length > 0 && (
            <div className="relative group">
              <Button variant="outline" size="sm" disabled={downloading || items.length === 0}>
                <RiFileDownloadLine className="h-4 w-4 mr-1" />
                PDF por proveedor
              </Button>
              <div className="absolute right-0 top-full pt-1 hidden group-hover:block z-10 min-w-[200px]">
                <div className="bg-popover border rounded-md shadow-md p-1">
                  {uniqueVendors.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handleDownloadPdf({ vendorId: v.id })}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted rounded-sm transition-colors"
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {uniqueTasks.length > 0 && (
            <div className="relative group">
              <Button variant="outline" size="sm" disabled={downloading || items.length === 0}>
                <RiFileDownloadLine className="h-4 w-4 mr-1" />
                PDF por tarea
              </Button>
              <div className="absolute right-0 top-full pt-1 hidden group-hover:block z-10 min-w-[200px]">
                <div className="bg-popover border rounded-md shadow-md p-1">
                  {uniqueTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => handleDownloadPdf({ taskId: task.id })}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted rounded-sm transition-colors"
                    >
                      {task.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <Button
            size="sm"
            onClick={() => handleDownloadPdf()}
            disabled={downloading || items.length === 0}
          >
            <RiFileDownloadLine className="h-4 w-4 mr-1" />
            {downloading ? "Generando..." : "Descargar PDF"}
          </Button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && canEditRunSheet && (
        <Card>
          <CardContent className="py-4 px-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm">Nueva actividad</h3>
            </div>
            <div className="grid grid-cols-4 gap-3">
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
              <Input
                type="time"
                value={newItem.startTime}
                onChange={(e) => setNewItem({ ...newItem, startTime: e.target.value })}
              />
              <Input
                type="time"
                value={newItem.endTime}
                onChange={(e) => setNewItem({ ...newItem, endTime: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={newItem.targetSource === "task" ? newItem.targetTaskId : "__event__"}
                onChange={(e) => {
                  if (e.target.value === "__event__") {
                    setNewItem({ ...newItem, targetSource: "event", targetTaskId: "", vendorId: "" });
                  } else {
                    setNewItem({ ...newItem, targetSource: "task", targetTaskId: e.target.value });
                  }
                }}
              >
                <option value="__event__">General (evento)</option>
                {eventTasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              {newItem.targetSource === "task" && (
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={newItem.vendorId}
                  onChange={(e) => setNewItem({ ...newItem, vendorId: e.target.value })}
                >
                  <option value="">Proveedor (opcional)</option>
                  {vendorOptions.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              )}
              <Input
                placeholder="Ubicación (opcional)"
                value={newItem.location}
                onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
              />
            </div>
            <Textarea
              placeholder="Notas (opcional)"
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleAdd} disabled={adding || !newItem.title.trim() || !newItem.date}>
                {adding ? "Agregando..." : "Agregar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      {items.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <RiFilterLine className="h-4 w-4" />
            Filtros:
          </div>
          {(uniqueVendors.length > 0 || uniqueTasks.length > 0) && (
            <>
              <select
                className="h-8 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={filterVendor}
                onChange={(e) => setFilterVendor(e.target.value)}
              >
                <option value="">Todos los proveedores</option>
                {uniqueVendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              <select
                className="h-8 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={filterTask}
                onChange={(e) => setFilterTask(e.target.value)}
              >
                <option value="">Todas las fuentes</option>
                <option value="__event__">General (evento)</option>
                {uniqueTasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </>
          )}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => { setFilterVendor(""); setFilterTask(""); }}
            >
              <RiFilterOffLine className="h-3 w-3 mr-1" />
              Limpiar
            </Button>
          )}
          {hasFilters && (
            <span className="text-xs text-muted-foreground ml-auto">
              Mostrando {filteredItems.length} de {items.length}
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-sm text-muted-foreground">Total items</p>
            <p className="text-2xl font-bold">{filteredItems.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-sm text-muted-foreground">Del evento</p>
            <p className="text-2xl font-bold">{filteredItems.filter((i) => i.source === "event").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-sm text-muted-foreground">De tareas</p>
            <p className="text-2xl font-bold">{filteredItems.filter((i) => i.source === "task").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-sm text-muted-foreground">Días</p>
            <p className="text-2xl font-bold">{sortedDates.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RiListOrdered2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">
              {hasFilters ? "No hay items que coincidan con los filtros" : "No hay items en la orden del día"}
            </p>
            {!hasFilters && (
              <p className="text-xs text-muted-foreground mt-1">
                {canEditRunSheet
                  ? "Usá el botón \"Agregar actividad\" o cargá items desde cada tarea"
                  : "El organizador aún no cargó la orden del día"}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateKey) => {
            const dateItems = itemsByDate[dateKey];
            const dateObj = new Date(dateKey + "T12:00:00");

            return (
              <div key={dateKey}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                    <RiCalendarLine className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <h2 className="text-lg font-semibold">
                    {format(dateObj, "EEEE d 'de' MMMM, yyyy", { locale: es })}
                  </h2>
                  <Badge variant="secondary" className="ml-auto">
                    {dateItems.length} {dateItems.length === 1 ? "item" : "items"}
                  </Badge>
                </div>

                <div className="relative ml-4 border-l-2 border-border pl-6 space-y-1">
                  {dateItems.map((item) => {
                    const key = itemKey(item);
                    const isEditing = editingId === key;

                    if (isEditing && canEditRunSheet) {
                      return (
                        <Card key={key} className="border-primary">
                          <CardContent className="py-3 px-4 space-y-2">
                            <div className="absolute -left-[31px] top-3 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                            <div className="grid grid-cols-4 gap-2">
                              <Input size={1} value={editFields.title} onChange={(e) => setEditFields({ ...editFields, title: e.target.value })} placeholder="Título" />
                              <Input type="date" size={1} value={editFields.date} onChange={(e) => setEditFields({ ...editFields, date: e.target.value })} />
                              <Input type="time" size={1} value={editFields.startTime} onChange={(e) => setEditFields({ ...editFields, startTime: e.target.value })} />
                              <Input type="time" size={1} value={editFields.endTime} onChange={(e) => setEditFields({ ...editFields, endTime: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {item.source === "task" && (
                                <select
                                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                  value={editFields.vendorId}
                                  onChange={(e) => setEditFields({ ...editFields, vendorId: e.target.value })}
                                >
                                  <option value="">Sin proveedor</option>
                                  {vendorOptions.map((v) => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                  ))}
                                </select>
                              )}
                              <Input value={editFields.location} onChange={(e) => setEditFields({ ...editFields, location: e.target.value })} placeholder="Ubicación" />
                            </div>
                            <Textarea value={editFields.description} onChange={(e) => setEditFields({ ...editFields, description: e.target.value })} placeholder="Notas" rows={2} />
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                                <RiCloseLine className="h-4 w-4 mr-1" />Cancelar
                              </Button>
                              <Button size="sm" onClick={() => handleSaveEdit(item)}>
                                <RiCheckLine className="h-4 w-4 mr-1" />Guardar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }

                    return (
                      <div key={key} className="relative group">
                        <div
                          className="absolute -left-[31px] top-3 h-3 w-3 rounded-full border-2 border-background"
                          style={{ backgroundColor: item.source === "event" ? "#6366f1" : "#f59e0b" }}
                        />
                        <Card className="transition-colors hover:bg-muted/30">
                          <CardContent className="py-3 px-4">
                            <div className="flex items-start gap-3">
                              <div className="w-24 shrink-0 text-right">
                                {item.startTime ? (
                                  <div>
                                    <span className="text-sm font-semibold">{item.startTime}</span>
                                    {item.endTime && (
                                      <span className="text-xs text-muted-foreground block">→ {item.endTime}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Sin hora</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium text-sm">{item.title}</h3>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] shrink-0"
                                    style={{
                                      borderColor: item.source === "event" ? "#6366f1" : "#f59e0b",
                                      color: item.source === "event" ? "#6366f1" : "#f59e0b",
                                    }}
                                  >
                                    {item.source === "event" ? "General" : item.taskTitle || "Tarea"}
                                  </Badge>
                                  {item.vendorName && (
                                    <Badge variant="secondary" className="text-[10px] shrink-0 gap-0.5">
                                      <RiUser3Line className="h-2.5 w-2.5" />
                                      {item.vendorName}
                                    </Badge>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                                )}
                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                  {item.location && (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <RiMapPinLine className="h-3 w-3" />{item.location}
                                    </span>
                                  )}
                                  {item.notes && (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <RiInformationLine className="h-3 w-3" />{item.notes}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {canEditRunSheet && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(item)}>
                                    <RiEditLine className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-7 w-7 ${deletingId === key ? "text-destructive bg-destructive/10" : "text-muted-foreground"}`}
                                    onClick={() => handleDelete(item)}
                                  >
                                    <RiDeleteBinLine className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    </EventSectionGuard>
  );
}
