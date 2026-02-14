"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiFileListLine,
  RiCalendarEventLine,
  RiTimeLine,
  RiFlag2Line,
} from "@remixicon/react";

interface VendorTask {
  id: number;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  category: string | null;
  dueDate: string | null;
  eventId: number | null;
  eventName: string;
  eventDate: string | null;
  createdAt: string | null;
}

const STATUS_MAP: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "destructive" | "default" }> = {
  completed: { label: "Completada", variant: "success" },
  in_progress: { label: "En Progreso", variant: "warning" },
  pending: { label: "Pendiente", variant: "secondary" },
  cancelled: { label: "Cancelada", variant: "destructive" },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  high: { label: "Alta", color: "text-red-600" },
  medium: { label: "Media", color: "text-yellow-600" },
  low: { label: "Baja", color: "text-green-600" },
};

export default function VendorTasksPage() {
  const [tasks, setTasks] = useState<VendorTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/vendor/tasks");
        const data = await res.json();
        if (data.success) {
          setTasks(data.data);
        }
      } catch (error) {
        console.error("Error loading vendor tasks:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tareas</h1>
        <p className="text-muted-foreground">
          Tareas de los eventos donde participas como proveedor
        </p>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RiFileListLine className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">Sin tareas</p>
            <p className="text-sm text-muted-foreground mt-1">
              Cuando tengas eventos activos, sus tareas aparecerán aquí.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const status = STATUS_MAP[task.status || "pending"] || STATUS_MAP.pending;
            const priority = PRIORITY_MAP[task.priority || "medium"] || PRIORITY_MAP.medium;

            return (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{task.title}</h3>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>

                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <RiCalendarEventLine className="h-3.5 w-3.5" />
                          {task.eventName}
                        </span>
                        <span className={`flex items-center gap-1 ${priority.color}`}>
                          <RiFlag2Line className="h-3.5 w-3.5" />
                          {priority.label}
                        </span>
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <RiTimeLine className="h-3.5 w-3.5" />
                            {new Date(task.dueDate).toLocaleDateString("es-AR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
