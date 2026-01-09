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
} from "@remixicon/react";
import { useTasks } from "@/hooks/use-tasks";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

const fallbackTasks = [
  {
    id: "1",
    title: "Confirmar menú con catering",
    description: "Revisar opciones vegetarianas y alergias",
    eventName: "Boda García-López",
    dueDate: "2025-01-20",
    status: "pending",
    priority: "high",
    assignee: "María",
  },
  {
    id: "2",
    title: "Revisar contrato fotógrafo",
    description: "Verificar horas incluidas y entregables",
    eventName: "Boda García-López",
    dueDate: "2025-01-18",
    status: "pending",
    priority: "medium",
    assignee: "Carlos",
  },
  {
    id: "3",
    title: "Enviar invitaciones",
    description: "Diseño aprobado, enviar a imprenta",
    eventName: "Boda Martínez-Ruiz",
    dueDate: "2025-02-01",
    status: "in_progress",
    priority: "high",
    assignee: "Ana",
  },
  {
    id: "4",
    title: "Prueba de sonido",
    description: "Coordinar con DJ y venue",
    eventName: "Boda Fernández-Torres",
    dueDate: "2025-02-10",
    status: "in_progress",
    priority: "medium",
    assignee: "Pedro",
  },
  {
    id: "5",
    title: "Confirmar transporte novios",
    description: "Reservar coche clásico",
    eventName: "Boda García-López",
    dueDate: "2025-03-10",
    status: "pending",
    priority: "low",
    assignee: "María",
  },
  {
    id: "6",
    title: "Degustación de pastel",
    description: "Cita con pastelería confirmada",
    eventName: "Boda Sánchez-Moreno",
    dueDate: "2025-01-25",
    status: "completed",
    priority: "medium",
    assignee: "Laura",
  },
  {
    id: "7",
    title: "Confirmar lista de invitados",
    description: "Actualizar RSVPs recibidos",
    eventName: "Boda García-López",
    dueDate: "2025-02-15",
    status: "pending",
    priority: "high",
    assignee: "Carlos",
  },
  {
    id: "8",
    title: "Reunión con florista",
    description: "Definir arreglos y centros de mesa",
    eventName: "Boda Martínez-Ruiz",
    dueDate: "2025-02-05",
    status: "pending",
    priority: "medium",
    assignee: "Ana",
  },
];

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

export default function TasksPage() {
  const { tasks: apiTasks, stats, loading, updateTaskStatus, refetch } = useTasks();
  const searchParams = useSearchParams();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Handle ?new=true query param to auto-open create dialog
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setIsCreateDialogOpen(true);
    }
  }, [searchParams]);
  
  // Use API data if available, otherwise use fallback for demo
  const displayTasks = apiTasks.length > 0 ? apiTasks : [];
  const completionRate = stats.completionRate;

  const handleTaskClick = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tareas</h1>
          <p className="text-[var(--muted-foreground)]">
            Gestiona las tareas de todos tus eventos
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
          <RiAddLine className="h-4 w-4" />
          Nueva Tarea
        </Button>
      </div>

      {/* Stats */}
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
                <p className="text-sm text-[var(--muted-foreground)]">Total Tareas</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-[var(--muted-foreground)]">Completadas</p>
                <p className="text-2xl font-bold text-[var(--success)]">
                  {stats.completed}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-[var(--muted-foreground)]">En Progreso</p>
                <p className="text-2xl font-bold text-[var(--warning)]">
                  {stats.inProgress}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-[var(--muted-foreground)]">Progreso General</p>
                <div className="flex items-center gap-2">
                  <Progress value={completionRate} className="flex-1" />
                  <span className="text-sm font-medium">{completionRate}%</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <RiSearchLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <Input placeholder="Buscar tareas..." className="pl-10" />
      </div>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>Todas las Tareas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : displayTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[var(--muted-foreground)]">
                No hay tareas. Crea una nueva tarea para comenzar.
              </p>
            </div>
          ) : (
          <div className="space-y-3">
            {displayTasks.map((task) => {
              const priority = priorityConfig[(task.priority || "medium") as keyof typeof priorityConfig];
              const status = statusConfig[(task.status || "pending") as keyof typeof statusConfig];

              return (
                <div
                  key={task.id}
                  className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted cursor-pointer"
                  onClick={() => handleTaskClick(task.id)}
                >
                  <button 
                    className="text-muted-foreground hover:text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {task.status === "completed" ? (
                      <RiCheckboxCircleLine className="h-6 w-6 text-[var(--success)]" />
                    ) : (
                      <RiCheckboxBlankCircleLine className="h-6 w-6" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`font-medium ${
                          task.status === "completed"
                            ? "line-through text-[var(--muted-foreground)]"
                            : ""
                        }`}
                      >
                        {task.title}
                      </p>
                      <Badge variant={status.variant} className="text-xs">
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)] truncate">
                      {task.description}
                    </p>
                    <div className="mt-1 flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
                      <span>{task.eventName || "Sin evento"}</span>
                      <span>•</span>
                      <span>Asignado a: {task.assignedUserName || "Sin asignar"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <RiFlag2Line className={`h-4 w-4 ${priority.color}`} />
                      <span className={`text-xs ${priority.color}`}>
                        {priority.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
                      <RiCalendarLine className="h-4 w-4" />
                      <span className="text-xs">
                        {task.dueDate 
                          ? new Date(task.dueDate).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "short",
                            })
                          : "Sin fecha"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </CardContent>
      </Card>

      <CreateTaskDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onTaskCreated={refetch}
      />

      <TaskDrawer
        taskId={selectedTaskId}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onTaskDeleted={refetch}
        onTaskUpdated={refetch}
      />
    </div>
  );
}
