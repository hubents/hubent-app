"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiArrowLeftLine,
  RiCalendarLine,
  RiMapPinLine,
  RiGroupLine,
  RiMoneyDollarCircleLine,
  RiFileListLine,
  RiStore2Line,
  RiFileTextLine,
  RiEditLine,
  RiAddLine,
} from "@remixicon/react";
import Link from "next/link";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { EditEventDialog } from "@/components/events/edit-event-dialog";

interface Event {
  id: number;
  name: string;
  type: string;
  status: string;
  date: string | null;
  location: string | null;
  guestCount: number;
  budget: string | null;
  description: string | null;
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  eventId: number;
}

const statusMap: Record<string, { label: string; variant: "secondary" | "warning" | "success" | "destructive" }> = {
  draft: { label: "Borrador", variant: "secondary" },
  confirmed: { label: "Confirmado", variant: "success" },
  in_progress: { label: "En progreso", variant: "warning" },
  completed: { label: "Completado", variant: "success" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

interface EventDetailClientProps {
  eventId: number;
}

export function EventDetailClient({ eventId }: EventDetailClientProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedTaskTitle, setSelectedTaskTitle] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      const data = await res.json();
      if (data.success) {
        setEvent(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch event:", error);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/tasks?eventId=${eventId}`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await Promise.all([fetchEvent(), fetchTasks()]);
      setLoading(false);
    }
    loadData();
  }, [eventId]);

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
    setSelectedTaskTitle(task.title);
    setIsDrawerOpen(true);
  };

  const handleTaskCreated = () => {
    fetchTasks();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Evento no encontrado</p>
        <Link href="/dashboard/events">
          <Button variant="outline" className="mt-4">
            Volver a eventos
          </Button>
        </Link>
      </div>
    );
  }

  const status = statusMap[event.status] || statusMap.draft;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/dashboard/events">
        <Button variant="ghost" className="gap-2">
          <RiArrowLeftLine className="h-4 w-4" />
          Volver a eventos
        </Button>
      </Link>

      {/* Event Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{event.name}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          {event.description && (
            <p className="text-lg text-muted-foreground">{event.description}</p>
          )}
        </div>
        <Button className="gap-2" onClick={() => setIsEditEventOpen(true)}>
          <RiEditLine className="h-4 w-4" />
          Editar Evento
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <RiCalendarLine className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha</p>
              <p className="font-semibold">
                {event.date
                  ? new Date(event.date).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "Sin fecha"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-success/10 p-3">
              <RiMapPinLine className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lugar</p>
              <p className="font-semibold">{event.location || "Sin definir"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-warning/10 p-3">
              <RiGroupLine className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Invitados</p>
              <p className="font-semibold">{event.guestCount} personas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-accent/10 p-3">
              <RiMoneyDollarCircleLine className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Presupuesto</p>
              <p className="font-semibold">
                {event.budget ? `$${parseFloat(event.budget).toLocaleString()}` : "Sin definir"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Section */}
      <Card>
        <CardHeader>
          <CardTitle>Progreso General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Tareas completadas: {completedTasks} de {tasks.length}
            </span>
            <span className="text-muted-foreground">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-3" />
        </CardContent>
      </Card>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiFileListLine className="h-5 w-5" />
              Tareas ({tasks.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setIsCreateTaskOpen(true)}
              >
                <RiAddLine className="h-4 w-4" />
                Nueva
              </Button>
              <Link href={`/dashboard/tasks?eventId=${eventId}`}>
                <Button variant="outline" size="sm">
                  Ver todas
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleTaskClick(task)}
                  >
                    <div>
                      <p className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {task.dueDate
                          ? `Vence: ${new Date(task.dueDate).toLocaleDateString("es-ES")}`
                          : "Sin fecha"}
                      </p>
                    </div>
                    <Badge
                      variant={
                        task.priority === "high"
                          ? "destructive"
                          : task.priority === "medium"
                          ? "warning"
                          : "secondary"
                      }
                    >
                      {task.priority === "high"
                        ? "Alta"
                        : task.priority === "medium"
                        ? "Media"
                        : "Baja"}
                    </Badge>
                  </div>
                ))}
                {tasks.length > 5 && (
                  <p className="text-center text-sm text-muted-foreground">
                    +{tasks.length - 5} tareas más
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No hay tareas asignadas</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setIsCreateTaskOpen(true)}
                >
                  <RiAddLine className="h-4 w-4" />
                  Crear primera tarea
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vendors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiStore2Line className="h-5 w-5" />
              Proveedores
            </CardTitle>
            <Button variant="outline" size="sm">
              Agregar
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No hay proveedores asignados
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiFileTextLine className="h-5 w-5" />
              Documentos
            </CardTitle>
            <Button variant="outline" size="sm">
              Subir
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No hay documentos
            </div>
          </CardContent>
        </Card>

        {/* Timeline Preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiCalendarLine className="h-5 w-5" />
              Cronograma
            </CardTitle>
            <Button variant="outline" size="sm">
              Ver completo
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No hay items en el cronograma
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        onTaskCreated={handleTaskCreated}
        preselectedEventId={eventId}
      />

      {/* Task Drawer */}
      <TaskDrawer
        taskId={selectedTaskId}
        taskTitle={selectedTaskTitle}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onTaskDeleted={handleTaskCreated}
        onTaskUpdated={handleTaskCreated}
      />

      {/* Edit Event Dialog */}
      <EditEventDialog
        open={isEditEventOpen}
        onOpenChange={setIsEditEventOpen}
        event={event}
        onEventUpdated={fetchEvent}
      />
    </div>
  );
}
