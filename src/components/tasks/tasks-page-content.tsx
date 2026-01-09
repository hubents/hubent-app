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

export function TasksPageContent() {
  const { tasks: apiTasks, stats, loading, refetch } = useTasks();
  const searchParams = useSearchParams();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setIsCreateDialogOpen(true);
    }
  }, [searchParams]);
  
  const displayTasks = apiTasks.length > 0 ? apiTasks : [];
  const completionRate = stats.completionRate;

  const handleTaskClick = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIsDrawerOpen(true);
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
        <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
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

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Tareas</CardTitle>
            <div className="relative w-64">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar tareas..." className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : displayTasks.length === 0 ? (
            <div className="text-center py-12">
              <RiCheckboxBlankCircleLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No hay tareas</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crea tu primera tarea para comenzar
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <RiAddLine className="h-4 w-4 mr-2" />
                Nueva Tarea
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {displayTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleTaskClick(task.id)}
                >
                  <button
                    className="flex-shrink-0"
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

                  <div className="flex items-center gap-2 flex-shrink-0">
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
