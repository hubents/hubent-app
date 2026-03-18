"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiAddLine,
  RiCalendarEventLine,
  RiCheckboxCircleLine,
  RiLoader4Line,
  RiTimeLine,
  RiFileListLine,
} from "@remixicon/react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { VendorTaskSheet } from "@/components/vendor/vendor-task-sheet";

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

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Baja", color: "bg-gray-100 text-gray-600" },
  medium: { label: "Media", color: "bg-yellow-100 text-yellow-700" },
  high: { label: "Alta", color: "bg-orange-100 text-orange-700" },
  urgent: { label: "Urgente", color: "bg-red-100 text-red-700" },
};

export function VendorTasksContent() {
  const [ownTasks, setOwnTasks] = useState<UnifiedTask[]>([]);
  const [invitedTasks, setInvitedTasks] = useState<UnifiedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "own" | "invited">("all");
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [addingTask, setAddingTask] = useState(false);

  // Drawer state
  const [selectedOwnTaskId, setSelectedOwnTaskId] = useState<number | null>(null);
  const [ownDrawerOpen, setOwnDrawerOpen] = useState(false);
  const [selectedInvitedTaskId, setSelectedInvitedTaskId] = useState<number | null>(null);
  const [invitedSheetOpen, setInvitedSheetOpen] = useState(false);

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

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const allTasks = useMemo(() => {
    let tasks: UnifiedTask[] = [];
    if (filter === "all" || filter === "own") {
      tasks = [...tasks, ...ownTasks];
    }
    if (filter === "all" || filter === "invited") {
      tasks = [...tasks, ...invitedTasks];
    }
    // Sort by dueDate desc, nulls last
    return tasks.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
    });
  }, [ownTasks, invitedTasks, filter]);

  // Stats
  const stats = useMemo(() => {
    const all = [...ownTasks, ...invitedTasks];
    return {
      total: all.length,
      pending: all.filter((t) => t.status === "pending").length,
      inProgress: all.filter((t) => t.status === "in_progress").length,
      completed: all.filter((t) => t.status === "completed").length,
    };
  }, [ownTasks, invitedTasks]);

  const handleQuickAdd = async () => {
    if (!quickAddTitle.trim()) return;
    setAddingTask(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: quickAddTitle.trim(), priority: "medium" }),
      });
      const data = await res.json();
      if (data.success) {
        setQuickAddTitle("");
        toast.success("Tarea creada");
        fetchTasks();
      } else {
        toast.error(data.error?.message || "Error al crear tarea");
      }
    } catch {
      toast.error("Error al crear tarea");
    } finally {
      setAddingTask(false);
    }
  };

  const handleInvitedStatusChange = async (taskId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/vendor/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setInvitedTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
        toast.success("Estado actualizado");
      } else {
        toast.error(data.error?.message || "Error al actualizar");
      }
    } catch {
      toast.error("Error al actualizar estado");
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

      {/* Filters + Quick Add */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all">Todas ({ownTasks.length + invitedTasks.length})</TabsTrigger>
            <TabsTrigger value="own">Propias ({ownTasks.length})</TabsTrigger>
            <TabsTrigger value="invited">De eventos ({invitedTasks.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Nueva tarea propia..."
            value={quickAddTitle}
            onChange={(e) => setQuickAddTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
            className="w-64"
            disabled={addingTask}
          />
          <Button size="sm" onClick={handleQuickAdd} disabled={addingTask || !quickAddTitle.trim()}>
            <RiAddLine className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        </div>
      </div>

      {/* Tasks Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarea</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6} className="h-12">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : allTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <RiFileListLine className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Sin tareas</p>
                    <p className="text-sm mt-1">
                      {filter === "invited"
                        ? "No ten\u00e9s tareas asignadas de eventos"
                        : "Cre\u00e1 una tarea con el campo de arriba"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                allTasks.map((task) => {
                  const st = statusConfig[task.status || "pending"] || statusConfig.pending;
                  const pr = priorityConfig[task.priority || "medium"] || priorityConfig.medium;

                  return (
                    <TableRow
                      key={`${task.source}-${task.id}`}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleTaskClick(task)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {task.eventName ? (
                          <span className="flex items-center gap-1">
                            <RiCalendarEventLine className="h-3.5 w-3.5 text-muted-foreground" />
                            {task.eventName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">General</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={task.source === "own" ? "secondary" : "outline"}
                          className="text-[10px]"
                        >
                          {task.source === "own" ? "Propia" : "Invitado"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${pr.color} text-xs`}>{pr.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {task.dueDate
                          ? format(new Date(task.dueDate), "dd MMM yyyy", { locale: es })
                          : "-"}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {task.source === "invited" ? (
                          <Select
                            value={task.status || "pending"}
                            onValueChange={(v) => handleInvitedStatusChange(task.id, v)}
                          >
                            <SelectTrigger className="h-7 w-32 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusConfig)
                                .filter(([k]) => k !== "cancelled")
                                .map(([value, cfg]) => (
                                  <SelectItem key={value} value={value}>
                                    <span className={`text-xs ${cfg.color} px-1.5 py-0.5 rounded`}>
                                      {cfg.label}
                                    </span>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={`${st.color} text-xs`}>{st.label}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
