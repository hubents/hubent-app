"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiAddLine,
  RiCalendarEventLine,
  RiCheckboxCircleLine,
  RiLoader4Line,
  RiTimeLine,
  RiFileListLine,
  RiSearchLine,
  RiLayoutGridLine,
  RiListUnordered,
  RiDraggable,
} from "@remixicon/react";
import { toast } from "sonner";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { VendorTaskSheet } from "@/components/vendor/vendor-task-sheet";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  useDroppable,
} from "@dnd-kit/core";
import type { CollisionDetection } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTaskRefresh } from "@/hooks/use-task-refresh";

interface UnifiedTask {
  id: number;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  category?: string | null;
  dueDate: string | null;
  eventId: number | null;
  eventName: string | null;
  assignedTo?: string | null;
  assignedUserName?: string | null;
  sortOrder?: number;
  createdAt: string | null;
  source: "own" | "invited";
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700" },
  in_progress: { label: "En progreso", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Completada", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelada", color: "bg-gray-100 text-gray-500" },
};

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-green-100 text-green-700 border-green-200",
  urgent: "bg-red-100 text-red-700 border-red-200",
};

const priorityLabels: Record<string, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
  urgent: "Urgente",
};

const columns = [
  { id: "pending", title: "Por hacer", color: "bg-gray-100" },
  { id: "in_progress", title: "En progreso", color: "bg-blue-100" },
  { id: "completed", title: "Finalizado", color: "bg-green-100" },
];

// Sortable Task Card
function VendorSortableTaskCard({
  task,
  onClick,
}: {
  task: UnifiedTask;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${task.source}-${task.id}`,
    data: { task, type: "task" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const pr = task.priority || "medium";

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-shadow",
        isDragging ? "opacity-50 shadow-lg z-50" : "hover:shadow-md"
      )}
      {...listeners}
      {...attributes}
    >
      <CardContent className="p-3" onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
          <RiDraggable className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
        {task.eventName && (
          <p className="text-xs text-muted-foreground mt-1 truncate flex items-center gap-1">
            <RiCalendarEventLine className="h-3 w-3" />
            {task.eventName}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className={cn("px-2 py-0.5 rounded text-xs font-medium border", priorityColors[pr])}>
            {priorityLabels[pr] || pr}
          </span>
          <Badge
            variant={task.source === "own" ? "secondary" : "outline"}
            className="text-[10px]"
          >
            {task.source === "own" ? "Propia" : "Invitado"}
          </Badge>
          {task.dueDate && (
            <span className="text-xs text-muted-foreground">
              📅 {new Date(task.dueDate).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
        {task.category && (
          <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs bg-accent text-accent-foreground">
            {task.category}
          </span>
        )}
      </CardContent>
    </Card>
  );
}

// Sortable Column with Quick Add
function VendorSortableColumn({
  id,
  title,
  color,
  tasks,
  onTaskClick,
  onQuickAdd,
  showQuickAdd,
}: {
  id: string;
  title: string;
  color: string;
  tasks: UnifiedTask[];
  onTaskClick: (task: UnifiedTask) => void;
  onQuickAdd: (title: string, status: string) => Promise<void>;
  showQuickAdd: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const quickAddInputRef = useRef<HTMLInputElement>(null);

  const handleQuickAdd = async () => {
    if (!quickAddTitle.trim()) return;
    setIsCreating(true);
    try {
      await onQuickAdd(quickAddTitle.trim(), id);
      setQuickAddTitle("");
      setIsQuickAddOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  const openQuickAdd = () => {
    setIsQuickAddOpen(true);
    setTimeout(() => quickAddInputRef.current?.focus(), 50);
  };

  const sortedTasks = [...tasks].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.id - b.id);
  const taskIds = sortedTasks.map((t) => `${t.source}-${t.id}`);

  return (
    <div className="flex flex-col">
      <div className={cn("rounded-t-lg px-4 py-3 font-medium flex items-center justify-between", color)}>
        <div className="flex items-center gap-2">
          <span>{title}</span>
          <Badge variant="secondary">{tasks.length}</Badge>
        </div>
        {showQuickAdd && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-white/50"
            onClick={openQuickAdd}
            title={`Agregar tarea en ${title}`}
          >
            <RiAddLine className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 bg-muted/30 rounded-b-lg p-2 min-h-100 space-y-2 transition-colors",
          isOver && "bg-primary/10 ring-2 ring-primary ring-inset"
        )}
      >
        {isQuickAddOpen && (
          <Card className="border-primary border-2">
            <CardContent className="p-2">
              <Input
                ref={quickAddInputRef}
                value={quickAddTitle}
                onChange={(e) => setQuickAddTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && quickAddTitle.trim()) handleQuickAdd();
                  else if (e.key === "Escape") { setIsQuickAddOpen(false); setQuickAddTitle(""); }
                }}
                placeholder="Título de la tarea..."
                className="h-8 text-sm"
                disabled={isCreating}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" className="h-7 text-xs flex-1" onClick={handleQuickAdd} disabled={!quickAddTitle.trim() || isCreating}>
                  {isCreating ? "Creando..." : "Crear"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setIsQuickAddOpen(false); setQuickAddTitle(""); }} disabled={isCreating}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {sortedTasks.map((task) => (
            <VendorSortableTaskCard
              key={`${task.source}-${task.id}`}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && !isQuickAddOpen && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {isOver ? "Soltar aquí" : "No hay tareas"}
          </div>
        )}
      </div>
    </div>
  );
}

export function VendorTasksContent() {
  const [ownTasks, setOwnTasks] = useState<UnifiedTask[]>([]);
  const [invitedTasks, setInvitedTasks] = useState<UnifiedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "own" | "invited">("all");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTask, setActiveTask] = useState<UnifiedTask | null>(null);

  // Drawer state
  const [selectedOwnTaskId, setSelectedOwnTaskId] = useState<number | null>(null);
  const [ownDrawerOpen, setOwnDrawerOpen] = useState(false);
  const [selectedInvitedTaskId, setSelectedInvitedTaskId] = useState<number | null>(null);
  const [invitedSheetOpen, setInvitedSheetOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const kanbanCollisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return closestCorners(args);
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const [ownRes, invitedRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/vendor/tasks"),
      ]);

      const ownData = await ownRes.json();
      const invitedData = await invitedRes.json();

      if (ownData.success) {
        setOwnTasks(
          (ownData.data || []).map((t: UnifiedTask) => ({ ...t, source: "own" as const }))
        );
      }
      if (invitedData.success) {
        setInvitedTasks(
          (invitedData.data || []).map((t: UnifiedTask) => ({ ...t, source: "invited" as const }))
        );
      }
    } catch (err) {
      console.error("[VendorTasksContent] fetch error:", err);
      toast.error("Error al cargar tareas");
    } finally {
      setLoading(false);
    }
  }, []);

  const silentRefresh = useCallback(async () => {
    try {
      const [ownRes, invitedRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/vendor/tasks"),
      ]);
      const ownData = await ownRes.json();
      const invitedData = await invitedRes.json();
      if (ownData.success) {
        setOwnTasks(
          (ownData.data || []).map((t: UnifiedTask) => ({ ...t, source: "own" as const }))
        );
      }
      if (invitedData.success) {
        setInvitedTasks(
          (invitedData.data || []).map((t: UnifiedTask) => ({ ...t, source: "invited" as const }))
        );
      }
    } catch {
      // Silent — don't show error for background refreshes
    }
  }, []);

  useTaskRefresh(silentRefresh);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const displayTasks = useMemo(() => {
    let tasks: UnifiedTask[] = [];
    if (filter === "all" || filter === "own") tasks = [...tasks, ...ownTasks];
    if (filter === "all" || filter === "invited") tasks = [...tasks, ...invitedTasks];
    if (searchTerm) {
      tasks = tasks.filter((t) => t.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return tasks;
  }, [ownTasks, invitedTasks, filter, searchTerm]);

  const stats = useMemo(() => {
    const all = [...ownTasks, ...invitedTasks];
    return {
      total: all.length,
      pending: all.filter((t) => t.status === "pending").length,
      inProgress: all.filter((t) => t.status === "in_progress").length,
      completed: all.filter((t) => t.status === "completed").length,
    };
  }, [ownTasks, invitedTasks]);

  const showQuickAdd = filter !== "invited";

  const handleQuickAdd = async (title: string, status: string) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, status, priority: "medium" }),
      });
      if (res.ok) {
        toast.success("Tarea creada");
        fetchTasks();
      }
    } catch {
      toast.error("Error al crear tarea");
    }
  };

  const handleTaskClick = (task: UnifiedTask) => {
    if (task.source === "own") {
      setSelectedOwnTaskId(task.id);
      setOwnDrawerOpen(true);
    } else {
      setSelectedInvitedTaskId(task.id);
      setInvitedSheetOpen(true);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const taskData = active.data.current?.task as UnifiedTask | undefined;
    if (taskData) setActiveTask(taskData);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const taskData = active.data.current?.task as UnifiedTask | undefined;
    if (!taskData) return;

    const overId = over.id as string;
    const isColumn = columns.some((c) => c.id === overId);
    const overTaskData = over.data.current?.task as UnifiedTask | undefined;

    // Determine new status
    let newStatus: string | null = null;
    if (isColumn) {
      newStatus = overId;
    } else if (overTaskData) {
      newStatus = overTaskData.status;
    }

    if (!newStatus || taskData.status === newStatus) {
      // Same column reorder for own tasks
      if (overTaskData && taskData.source === "own" && overTaskData.source === "own" && taskData.status === overTaskData.status) {
        const colTasks = (filter === "invited" ? [] : ownTasks)
          .filter((t) => t.status === taskData.status)
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.id - b.id);
        const oldIndex = colTasks.findIndex((t) => t.id === taskData.id);
        const newIndex = colTasks.findIndex((t) => t.id === overTaskData.id);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reordered = arrayMove(colTasks, oldIndex, newIndex);
          const items = reordered.map((t, idx) => ({ taskId: t.id, sortOrder: idx }));
          setOwnTasks((prev) => {
            const other = prev.filter((t) => t.status !== taskData.status);
            return [...other, ...reordered.map((t, idx) => ({ ...t, sortOrder: idx }))];
          });
          try {
            await fetch("/api/tasks/reorder", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ items, eventId: taskData.eventId ?? null }),
            });
          } catch { fetchTasks(); }
        }
      }
      return;
    }

    // Status change
    if (taskData.source === "own") {
      setOwnTasks((prev) => prev.map((t) => t.id === taskData.id ? { ...t, status: newStatus } : t));
      try {
        const res = await fetch(`/api/tasks/${taskData.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error();
      } catch { fetchTasks(); }
    } else {
      setInvitedTasks((prev) => prev.map((t) => t.id === taskData.id ? { ...t, status: newStatus } : t));
      try {
        const res = await fetch(`/api/vendor/tasks/${taskData.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error();
        else toast.success("Estado actualizado");
      } catch { fetchTasks(); }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Mis Tareas</h1>
        <p className="text-muted-foreground">
          Tareas propias y de eventos donde participas como proveedor
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <RiFileListLine className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <RiTimeLine className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <RiLoader4Line className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">En progreso</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <RiCheckboxCircleLine className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Completadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + View Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all">Todas ({ownTasks.length + invitedTasks.length})</TabsTrigger>
            <TabsTrigger value="own">Propias ({ownTasks.length})</TabsTrigger>
            <TabsTrigger value="invited">De eventos ({invitedTasks.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          <div className="relative">
            <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-48"
            />
          </div>
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button variant={viewMode === "kanban" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("kanban")}>
              <RiLayoutGridLine className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("list")}>
              <RiListUnordered className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === "kanban" ? (
        loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (<Skeleton key={i} className="h-96" />))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={kanbanCollisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {columns.map((column) => (
                <VendorSortableColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  color={column.color}
                  tasks={displayTasks.filter((t) => t.status === column.id)}
                  onTaskClick={handleTaskClick}
                  onQuickAdd={handleQuickAdd}
                  showQuickAdd={showQuickAdd}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask ? (
                <Card className="shadow-xl rotate-3 cursor-grabbing">
                  <CardContent className="p-3">
                    <h4 className="font-medium text-sm">{activeTask.title}</h4>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn("px-2 py-0.5 rounded text-xs font-medium border", priorityColors[activeTask.priority || "medium"])}>
                        {priorityLabels[activeTask.priority || "medium"]}
                      </span>
                      <Badge variant={activeTask.source === "own" ? "secondary" : "outline"} className="text-[10px]">
                        {activeTask.source === "own" ? "Propia" : "Invitado"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </DragOverlay>
          </DndContext>
        )
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4"><Skeleton className="h-10 w-full" /></div>
                ))
              ) : displayTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <RiFileListLine className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Sin tareas</p>
                </div>
              ) : (
                displayTasks.map((task) => {
                  const st = statusConfig[task.status || "pending"] || statusConfig.pending;
                  return (
                    <div
                      key={`${task.source}-${task.id}`}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleTaskClick(task)}
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className={cn("font-medium", task.status === "completed" && "line-through text-muted-foreground")}>
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          {task.eventName && (
                            <span className="flex items-center gap-1">
                              <RiCalendarEventLine className="h-3.5 w-3.5" />
                              {task.eventName}
                            </span>
                          )}
                          {task.dueDate && (
                            <span>
                              {new Date(task.dueDate).toLocaleDateString("es-ES")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("px-2 py-0.5 rounded text-xs font-medium border", priorityColors[task.priority || "medium"])}>
                          {priorityLabels[task.priority || "medium"]}
                        </span>
                        <Badge variant={task.source === "own" ? "secondary" : "outline"} className="text-[10px]">
                          {task.source === "own" ? "Propia" : "Invitado"}
                        </Badge>
                        <Badge className={`${st.color} text-xs`}>{st.label}</Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Own Task Drawer (full edit) */}
      <TaskDrawer
        taskId={selectedOwnTaskId}
        open={ownDrawerOpen}
        onOpenChange={setOwnDrawerOpen}
        onTaskUpdated={fetchTasks}
        onTaskDeleted={fetchTasks}
      />

      {/* Invited Task Sheet (read-only + status + chat) */}
      <VendorTaskSheet
        taskId={selectedInvitedTaskId}
        open={invitedSheetOpen}
        onOpenChange={setInvitedSheetOpen}
        onStatusUpdated={fetchTasks}
      />
    </div>
  );
}
