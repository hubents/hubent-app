"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiAddLine,
  RiSearchLine,
  RiCheckboxCircleLine,
  RiCheckboxBlankCircleLine,
  RiCalendarLine,
  RiFlag2Line,
  RiLayoutGridLine,
  RiListUnordered,
  RiDraggable,
} from "@remixicon/react";
import { useTasks } from "@/hooks/use-tasks";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const priorityConfig = {
  high: { label: "Alta", variant: "destructive" as const, color: "text-red-500" },
  medium: { label: "Media", variant: "warning" as const, color: "text-yellow-500" },
  low: { label: "Baja", variant: "secondary" as const, color: "text-gray-500" },
};

const statusConfig = {
  pending: { label: "Pendiente", variant: "secondary" as const },
  in_progress: { label: "En progreso", variant: "warning" as const },
  completed: { label: "Completada", variant: "success" as const },
};

const columns = [
  { id: "pending", title: "Por hacer", color: "bg-gray-100" },
  { id: "in_progress", title: "En progreso", color: "bg-blue-100" },
  { id: "completed", title: "Finalizado", color: "bg-green-100" },
];

interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  eventName: string | null;
  eventId?: number | null;
  sortOrder?: number | null;
}

// Sortable Task Card Component
function SortableTaskCard({ 
  task, 
  onClick 
}: { 
  task: Task; 
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
    id: task.id.toString(),
    data: { task, type: "task" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
          <p className="text-xs text-muted-foreground mt-1 truncate">{task.eventName}</p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className={cn(
            "px-2 py-0.5 rounded text-xs font-medium border",
            task.priority === "high" && "bg-red-100 text-red-700 border-red-200",
            task.priority === "medium" && "bg-yellow-100 text-yellow-700 border-yellow-200",
            task.priority === "low" && "bg-green-100 text-green-700 border-green-200"
          )}>
            {priorityConfig[task.priority as keyof typeof priorityConfig]?.label || task.priority}
          </span>
          {task.dueDate && (
            <span className="text-xs text-muted-foreground">
              📅 {new Date(task.dueDate).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Sortable Column Component with Quick Add
function SortableColumn({ 
  id, 
  title, 
  color, 
  tasks, 
  onTaskClick,
  onAddTask,
  onQuickAdd,
}: { 
  id: string; 
  title: string; 
  color: string; 
  tasks: Task[];
  onTaskClick: (taskId: number) => void;
  onAddTask: (status: string) => void;
  onQuickAdd: (title: string, status: string) => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const quickAddInputRef = React.useRef<HTMLInputElement>(null);

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

  // Sort tasks by sortOrder
  const sortedTasks = [...tasks].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const taskIds = sortedTasks.map((t) => t.id.toString());

  return (
    <div className="flex flex-col">
      <div className={cn("rounded-t-lg px-4 py-3 font-medium flex items-center justify-between", color)}>
        <div className="flex items-center gap-2">
          <span>{title}</span>
          <Badge variant="secondary">
            {tasks.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:bg-white/50"
          onClick={openQuickAdd}
          title={`Agregar tarea en ${title}`}
        >
          <RiAddLine className="h-4 w-4" />
        </Button>
      </div>
      <div 
        ref={setNodeRef}
        className={cn(
          "flex-1 bg-muted/30 rounded-b-lg p-2 min-h-100 space-y-2 transition-colors",
          isOver && "bg-primary/10 ring-2 ring-primary ring-inset"
        )}
      >
        {/* Quick Add Input */}
        {isQuickAddOpen && (
          <Card className="border-primary border-2">
            <CardContent className="p-2">
              <Input
                ref={quickAddInputRef}
                value={quickAddTitle}
                onChange={(e) => setQuickAddTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && quickAddTitle.trim()) {
                    handleQuickAdd();
                  } else if (e.key === "Escape") {
                    setIsQuickAddOpen(false);
                    setQuickAddTitle("");
                  }
                }}
                placeholder="Título de la tarea..."
                className="h-8 text-sm"
                disabled={isCreating}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={handleQuickAdd}
                  disabled={!quickAddTitle.trim() || isCreating}
                >
                  {isCreating ? "Creando..." : "Crear"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    setQuickAddTitle("");
                  }}
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {sortedTasks.map((task) => (
            <SortableTaskCard 
              key={task.id} 
              task={task} 
              onClick={() => onTaskClick(task.id)} 
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

export function TasksPageContent() {
  const { tasks: apiTasks, stats, loading, refetch } = useTasks();
  const searchParams = useSearchParams();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"view" | "create">("view");
  const [drawerInitialData, setDrawerInitialData] = useState<{ status?: string } | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
  
  // Sync local tasks with API tasks
  useEffect(() => {
    if (apiTasks.length > 0) {
      setLocalTasks(apiTasks as Task[]);
    }
  }, [apiTasks]);
  
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      openCreateDrawer();
    }
  }, [searchParams]);
  
  const displayTasks = localTasks.length > 0 ? localTasks : [];
  const filteredTasks = displayTasks.filter((task) =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const completionRate = stats.completionRate;

  const handleTaskClick = (taskId: number) => {
    setSelectedTaskId(taskId);
    setDrawerMode("view");
    setIsDrawerOpen(true);
  };

  const openCreateDrawer = (status?: string) => {
    setSelectedTaskId(null);
    setDrawerMode("create");
    setDrawerInitialData(status ? { status } : undefined);
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = (open: boolean) => {
    setIsDrawerOpen(open);
    if (!open) {
      setDrawerInitialData(undefined);
    }
  };

  const handleTaskCreated = (newTaskId: number) => {
    setSelectedTaskId(newTaskId);
    setDrawerMode("view");
    refetch();
  };

  // Quick Add function for inline creation in Kanban columns
  const handleQuickAdd = async (title: string, status: string) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          status,
          priority: "medium",
        }),
      });
      if (res.ok) {
        refetch();
      }
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = displayTasks.find((t) => t.id.toString() === active.id);
    if (task) {
      setActiveTask(task as Task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const draggedTask = displayTasks.find((t) => t.id.toString() === activeId);
    
    if (!draggedTask) return;

    // Check if dropping on a column (status change) or on another task (reorder)
    const isColumn = columns.some((c) => c.id === overId);
    const overTask = displayTasks.find((t) => t.id.toString() === overId);
    
    if (isColumn) {
      // Dropping on a column - change status
      const newStatus = overId;
      if (draggedTask.status === newStatus) return;

      // Optimistic update
      setLocalTasks((prev) =>
        prev.map((t) => (t.id.toString() === activeId ? { ...t, status: newStatus } : t))
      );

      try {
        await fetch(`/api/tasks/${draggedTask.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
      } catch (error) {
        console.error("Failed to update task status:", error);
        refetch(); // Revert on error
      }
    } else if (overTask) {
      // Dropping on another task - reorder within same column or move to different column
      const sameColumn = draggedTask.status === overTask.status;
      
      if (sameColumn) {
        // Reorder within same column
        const columnTasks = displayTasks
          .filter((t) => t.status === draggedTask.status)
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        
        const oldIndex = columnTasks.findIndex((t) => t.id.toString() === activeId);
        const newIndex = columnTasks.findIndex((t) => t.id.toString() === overId);
        
        if (oldIndex !== newIndex) {
          const reorderedTasks = arrayMove(columnTasks, oldIndex, newIndex);
          const items = reorderedTasks.map((t, index) => ({
            taskId: t.id,
            sortOrder: index,
          }));

          // Optimistic update
          setLocalTasks((prev) => {
            const otherTasks = prev.filter((t) => t.status !== draggedTask.status);
            const updatedColumnTasks = reorderedTasks.map((t, index) => ({
              ...t,
              sortOrder: index,
            }));
            return [...otherTasks, ...updatedColumnTasks];
          });

          try {
            await fetch("/api/tasks/reorder", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ items, eventId: draggedTask.eventId ?? null }),
            });
          } catch (error) {
            console.error("Failed to reorder tasks:", error);
            refetch(); // Revert on error
          }
        }
      } else {
        // Move to different column and position
        const newStatus = overTask.status;
        const targetColumnTasks = displayTasks
          .filter((t) => t.status === newStatus)
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        
        const targetIndex = targetColumnTasks.findIndex((t) => t.id.toString() === overId);
        
        // Optimistic update
        setLocalTasks((prev) => {
          const updated = prev.map((t) => {
            if (t.id.toString() === activeId) {
              return { ...t, status: newStatus, sortOrder: targetIndex };
            }
            return t;
          });
          return updated;
        });

        try {
          await fetch(`/api/tasks/${draggedTask.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              status: newStatus,
              sortOrder: targetIndex,
            }),
          });
          
          // Reorder the target column - include the moved task
          const items = [
            ...targetColumnTasks.slice(0, targetIndex).map((t, index) => ({
              taskId: t.id,
              sortOrder: index,
            })),
            { taskId: draggedTask.id, sortOrder: targetIndex },
            ...targetColumnTasks.slice(targetIndex).map((t, index) => ({
              taskId: t.id,
              sortOrder: targetIndex + 1 + index,
            })),
          ];

          await fetch("/api/tasks/reorder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items, eventId: draggedTask.eventId ?? null }),
          });
        } catch (error) {
          console.error("Failed to move task:", error);
          refetch(); // Revert on error
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tareas</h1>
          <p className="text-muted-foreground">
            Gestiona las tareas de todos tus eventos
          </p>
        </div>
        <Button className="gap-2" onClick={() => openCreateDrawer()}>
          <RiAddLine className="h-4 w-4" />
          Nueva Tarea
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Tareas</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Completadas</p>
                <p className="text-2xl font-bold text-green-500">
                  {stats.completed}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">En Progreso</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {stats.inProgress}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Progreso</p>
                <div className="flex items-center gap-2">
                  <Progress value={completionRate} className="flex-1" />
                  <span className="text-sm font-medium">{completionRate}%</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tareas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === "kanban" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("kanban")}
          >
            <RiLayoutGridLine className="h-4 w-4" />
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

      {/* Kanban View */}
      {viewMode === "kanban" ? (
        loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        ) : filteredTasks.length === 0 && displayTasks.length === 0 ? (
          <div className="text-center py-12">
            <RiCheckboxBlankCircleLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No hay tareas</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crea tu primera tarea para comenzar
            </p>
            <Button onClick={() => openCreateDrawer()}>
              <RiAddLine className="h-4 w-4 mr-2" />
              Nueva Tarea
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {columns.map((column) => (
                <SortableColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  color={column.color}
                  tasks={filteredTasks.filter((t) => t.status === column.id) as Task[]}
                  onTaskClick={handleTaskClick}
                  onAddTask={openCreateDrawer}
                  onQuickAdd={handleQuickAdd}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask ? (
                <Card className="shadow-xl rotate-3 cursor-grabbing">
                  <CardContent className="p-3">
                    <h4 className="font-medium text-sm">{activeTask.title}</h4>
                    <span className={cn(
                      "inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium border",
                      activeTask.priority === "high" && "bg-red-100 text-red-700 border-red-200",
                      activeTask.priority === "medium" && "bg-yellow-100 text-yellow-700 border-yellow-200",
                      activeTask.priority === "low" && "bg-green-100 text-green-700 border-green-200"
                    )}>
                      {priorityConfig[activeTask.priority as keyof typeof priorityConfig]?.label || activeTask.priority}
                    </span>
                  </CardContent>
                </Card>
              ) : null}
            </DragOverlay>
          </DndContext>
        )
      ) : (
        /* List View */
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Lista de Tareas</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <RiCheckboxBlankCircleLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No hay tareas</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {displayTasks.length === 0 ? "Crea tu primera tarea para comenzar" : "No hay tareas que coincidan con la búsqueda"}
                </p>
                {displayTasks.length === 0 && (
                  <Button onClick={() => openCreateDrawer()}>
                    <RiAddLine className="h-4 w-4 mr-2" />
                    Nueva Tarea
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleTaskClick(task.id)}
                  >
                    <button
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      {task.status === "completed" ? (
                        <RiCheckboxCircleLine className="h-5 w-5 text-green-500" />
                      ) : (
                        <RiCheckboxBlankCircleLine className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium truncate ${
                          task.status === "completed"
                            ? "line-through text-muted-foreground"
                          : ""
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.eventName && (
                      <p className="text-sm text-muted-foreground truncate">
                        {task.eventName}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {task.dueDate && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <RiCalendarLine className="h-4 w-4" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    )}

                    {task.priority && (
                      <RiFlag2Line
                        className={`h-4 w-4 ${
                          priorityConfig[task.priority as keyof typeof priorityConfig]?.color ||
                          "text-gray-500"
                        }`}
                      />
                    )}

                    <Badge
                      variant={
                        statusConfig[task.status as keyof typeof statusConfig]?.variant ||
                        "secondary"
                      }
                    >
                      {statusConfig[task.status as keyof typeof statusConfig]?.label ||
                        task.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        </Card>
      )}

      <TaskDrawer
        taskId={selectedTaskId}
        open={isDrawerOpen}
        onOpenChange={handleDrawerClose}
        onTaskDeleted={refetch}
        onTaskUpdated={refetch}
        onTaskCreated={handleTaskCreated}
        mode={drawerMode}
        initialData={drawerInitialData}
      />
    </div>
  );
}
