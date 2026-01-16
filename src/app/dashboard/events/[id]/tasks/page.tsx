"use client";

import { useState, useEffect, use } from "react";
import { useEvent } from "@/contexts/event-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiAddLine,
  RiSearchLine,
  RiListUnordered,
  RiLayoutGridLine,
  RiDraggable,
} from "@remixicon/react";
import { TaskDrawer } from "@/components/tasks/task-drawer";
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
  useDroppable,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  eventId: number;
  category: string | null;
}

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

const priorityLabels: Record<string, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const statusLabels: Record<string, string> = {
  pending: "Por hacer",
  in_progress: "En progreso",
  completed: "Finalizado",
};

// Draggable Task Card Component
function DraggableTaskCard({ 
  task, 
  onClick 
}: { 
  task: Task; 
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id.toString(),
    data: { task },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-shadow",
        isDragging ? "opacity-50 shadow-lg" : "hover:shadow-md"
      )}
      {...listeners}
      {...attributes}
    >
      <CardContent className="p-3" onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
          <RiDraggable className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className={cn("px-2 py-0.5 rounded text-xs font-medium border", priorityColors[task.priority])}>
            {priorityLabels[task.priority]}
          </span>
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

// Droppable Column Component
function DroppableColumn({ 
  id, 
  title, 
  color, 
  tasks, 
  onTaskClick,
  onAddTask,
}: { 
  id: string; 
  title: string; 
  color: string; 
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (status: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

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
          onClick={() => onAddTask(id)}
          title={`Agregar tarea en ${title}`}
        >
          <RiAddLine className="h-4 w-4" />
        </Button>
      </div>
      <div 
        ref={setNodeRef}
        className={cn(
          "flex-1 bg-muted/30 rounded-b-lg p-2 min-h-[400px] space-y-2 transition-colors",
          isOver && "bg-primary/10 ring-2 ring-primary ring-inset"
        )}
      >
        {tasks.map((task) => (
          <DraggableTaskCard 
            key={task.id} 
            task={task} 
            onClick={() => onTaskClick(task)} 
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {isOver ? "Soltar aquí" : "No hay tareas"}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EventTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);
  const { setActiveEvent } = useEvent();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"view" | "create">("view");
  const [drawerInitialData, setDrawerInitialData] = useState<{ eventId?: number; status?: string } | undefined>(undefined);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        const data = await res.json();
        if (data.success) {
          setActiveEvent(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch event:", error);
      }
    }
    fetchEvent();
  }, [eventId, setActiveEvent]);

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/tasks?eventId=${eventId}`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [eventId]);

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
    setDrawerMode("view");
    setIsDrawerOpen(true);
  };

  const openCreateDrawer = (status?: string) => {
    setSelectedTaskId(null);
    setDrawerMode("create");
    setDrawerInitialData({ eventId, status });
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
    fetchTasks();
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id.toString() === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = parseInt(active.id as string, 10);
    const newStatus = over.id as string;
    const task = tasks.find((t) => t.id === taskId);

    if (!task || task.status === newStatus) return;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (error) {
      console.error("Failed to update task:", error);
      fetchTasks(); // Revert on error
    }
  };

  const filteredTasks = tasks.filter((task) =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { id: "pending", title: "Por hacer", color: "bg-gray-100" },
    { id: "in_progress", title: "En progreso", color: "bg-blue-100" },
    { id: "completed", title: "Finalizado", color: "bg-green-100" },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tareas</h1>
          <p className="text-muted-foreground">
            {tasks.length} tareas en total
          </p>
        </div>
        <Button className="gap-2" onClick={() => openCreateDrawer()}>
          <RiAddLine className="h-4 w-4" />
          Nueva Tarea
        </Button>
      </div>

      {/* Filters */}
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

      {/* Kanban View with Drag & Drop */}
      {viewMode === "kanban" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {columns.map((column) => (
              <DroppableColumn
                key={column.id}
                id={column.id}
                title={column.title}
                color={column.color}
                tasks={filteredTasks.filter((t) => t.status === column.id)}
                onTaskClick={handleTaskClick}
                onAddTask={openCreateDrawer}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? (
              <Card className="shadow-xl rotate-3 cursor-grabbing">
                <CardContent className="p-3">
                  <h4 className="font-medium text-sm">{activeTask.title}</h4>
                  <span className={cn("inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium border", priorityColors[activeTask.priority])}>
                    {priorityLabels[activeTask.priority]}
                  </span>
                </CardContent>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleTaskClick(task)}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className={cn("font-medium", task.status === "completed" && "line-through text-muted-foreground")}>
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        {task.dueDate && (
                          <span>
                            📅 {new Date(task.dueDate).toLocaleDateString("es-ES")}
                          </span>
                        )}
                        {task.category && <span>• {task.category}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("px-2 py-0.5 rounded text-xs font-medium border", priorityColors[task.priority])}>
                        {priorityLabels[task.priority]}
                      </span>
                      <Badge variant="secondary">{statusLabels[task.status]}</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No hay tareas que coincidan con la búsqueda
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Drawer - for both view and create */}
      <TaskDrawer
        taskId={selectedTaskId}
        open={isDrawerOpen}
        onOpenChange={handleDrawerClose}
        onTaskDeleted={fetchTasks}
        onTaskUpdated={fetchTasks}
        onTaskCreated={handleTaskCreated}
        mode={drawerMode}
        initialData={drawerInitialData}
      />
    </div>
  );
}
