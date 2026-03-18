"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiCalendarEventLine,
  RiTimeLine,
  RiUserLine,
  RiTeamLine,
} from "@remixicon/react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { TaskChat } from "@/components/tasks/task-chat";

interface VendorTaskDetail {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  dueDate: string | null;
  eventId: number | null;
  eventName: string | null;
  assignedTo: string | null;
  assignedUserName: string | null;
  createdAt: string;
  updatedAt: string;
  participants: Array<{
    id: number;
    userId: string | null;
    vendorId: number | null;
    type: string;
    name: string | null;
    canEdit: boolean;
    canComment: boolean;
  }>;
}

interface VendorTaskSheetProps {
  taskId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated?: () => void;
}

const statusOptions = [
  { value: "pending", label: "Pendiente", color: "bg-yellow-100 text-yellow-700" },
  { value: "in_progress", label: "En progreso", color: "bg-blue-100 text-blue-700" },
  { value: "completed", label: "Completada", color: "bg-green-100 text-green-700" },
];

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Baja", color: "bg-gray-100 text-gray-600" },
  medium: { label: "Media", color: "bg-yellow-100 text-yellow-700" },
  high: { label: "Alta", color: "bg-orange-100 text-orange-700" },
  urgent: { label: "Urgente", color: "bg-red-100 text-red-700" },
};

export function VendorTaskSheet({
  taskId,
  open,
  onOpenChange,
  onStatusUpdated,
}: VendorTaskSheetProps) {
  const [task, setTask] = useState<VendorTaskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchTask = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/vendor/tasks/${taskId}`);
      const data = await res.json();
      if (data.success) {
        setTask(data.data);
      } else {
        console.error("[VendorTaskSheet] fetch failed:", data.error);
        toast.error(data.error?.message || "Error al cargar tarea");
      }
    } catch (err) {
      console.error("[VendorTaskSheet] fetch error:", err);
      toast.error("Error al cargar tarea");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (open && taskId) {
      fetchTask();
    }
    if (!open) {
      setTask(null);
    }
  }, [open, taskId, fetchTask]);

  const handleStatusChange = async (newStatus: string) => {
    if (!taskId || !task) return;
    const oldStatus = task.status;
    setUpdatingStatus(true);

    // Optimistic update
    setTask((prev) => (prev ? { ...prev, status: newStatus } : prev));

    try {
      const res = await fetch(`/api/vendor/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Estado actualizado");
        onStatusUpdated?.();
      } else {
        // Revert
        setTask((prev) => (prev ? { ...prev, status: oldStatus } : prev));
        toast.error(data.error?.message || "Error al actualizar estado");
      }
    } catch {
      setTask((prev) => (prev ? { ...prev, status: oldStatus } : prev));
      toast.error("Error al actualizar estado");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const pr = priorityConfig[task?.priority || "medium"] || priorityConfig.medium;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-4xl p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {loading ? (
                <Skeleton className="h-7 w-64" />
              ) : (
                <>
                  <SheetTitle className="text-xl font-semibold">
                    {task?.title || "Cargando..."}
                  </SheetTitle>
                  {task?.category && (
                    <Badge variant="secondary" className="capitalize">
                      {task.category}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    Solo lectura
                  </Badge>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mr-8">
              {task && (
                <Select
                  value={task.status}
                  onValueChange={handleStatusChange}
                  disabled={updatingStatus}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded text-xs font-medium ${opt.color}`}>
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Task Info (60%) */}
          <div className="flex-1 overflow-y-auto border-r border-border p-6 space-y-6">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : task ? (
              <>
                {/* Description */}
                {task.description && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Descripci&oacute;n</h3>
                    <p className="text-sm whitespace-pre-wrap">{task.description}</p>
                  </div>
                )}

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {task.eventName && (
                    <div className="flex items-start gap-2">
                      <RiCalendarEventLine className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Evento</p>
                        <p className="text-sm font-medium">{task.eventName}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Prioridad</p>
                      <Badge className={`${pr.color} text-xs`}>{pr.label}</Badge>
                    </div>
                  </div>
                  {task.dueDate && (
                    <div className="flex items-start gap-2">
                      <RiTimeLine className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Vencimiento</p>
                        <p className="text-sm font-medium">
                          {format(new Date(task.dueDate), "dd MMM yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>
                  )}
                  {task.assignedUserName && (
                    <div className="flex items-start gap-2">
                      <RiUserLine className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Asignado a</p>
                        <p className="text-sm font-medium">{task.assignedUserName}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Participants */}
                {task.participants.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <RiTeamLine className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium text-muted-foreground">Participantes</h3>
                    </div>
                    <div className="space-y-2">
                      {task.participants.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 text-sm">
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {(p.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <span>{p.name || "Sin nombre"}</span>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {p.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-sm">No se pudo cargar la tarea</p>
            )}
          </div>

          {/* Right Panel - Chat (40%) */}
          <div className="w-95 shrink-0 flex flex-col overflow-hidden">
            {taskId ? (
              <TaskChat taskId={taskId} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Selecciona una tarea para ver el chat
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
