"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  RiDeleteBinLine,
  RiFileListLine,
  RiInformationLine,
  RiCalendarScheduleLine,
  RiPencilLine,
  RiCheckLine,
  RiCloseLine,
  RiFileCopyLine,
} from "@remixicon/react";
import { useTaskDetail } from "@/hooks/use-task-detail";
import { TaskGeneralTab } from "./task-general-tab";
import { TaskInfoTab } from "./task-info-tab";
import { TaskScheduleTab } from "./task-schedule-tab";
import { TaskChat } from "./task-chat";
import { TaskAIDrawer } from "./task-ai-drawer";
import { Sparkles } from "lucide-react";

interface TaskDrawerProps {
  taskId: number | null;
  taskTitle?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskDeleted?: () => void;
  onTaskUpdated?: () => void;
  onTaskCreated?: (taskId: number) => void;
  mode?: "view" | "create";
  initialData?: {
    eventId?: number;
    eventName?: string;
    status?: string;
    title?: string;
  };
}

const categoryColors: Record<string, string> = {
  general: "bg-gray-500",
  evento: "bg-red-500",
  proveedor: "bg-blue-500",
  cliente: "bg-green-500",
  pago: "bg-yellow-500",
};

export function TaskDrawer({
  taskId,
  taskTitle: initialTitle,
  open,
  onOpenChange,
  onTaskDeleted,
  onTaskUpdated,
  onTaskCreated,
  mode = "view",
  initialData,
}: TaskDrawerProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [deleting, setDeleting] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  // Create mode state
  const [isCreateMode, setIsCreateMode] = useState(mode === "create");
  const [creating, setCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState(initialData?.title || "");
  const [internalTaskId, setInternalTaskId] = useState<number | null>(taskId);
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  // Reset state when mode changes or drawer opens
  useEffect(() => {
    if (open) {
      if (mode === "create") {
        setIsCreateMode(true);
        setNewTaskTitle(initialData?.title || "");
        setInternalTaskId(null);
        setTimeout(() => newTaskInputRef.current?.focus(), 100);
      } else {
        setIsCreateMode(false);
        setInternalTaskId(taskId);
      }
    }
  }, [open, mode, taskId, initialData?.title]);

  // Use internal taskId for the hook
  const effectiveTaskId = isCreateMode ? internalTaskId : taskId;

  const {
    task,
    participants,
    videos,
    attachments,
    scheduleItems,
    htmlContent,
    payments,
    meetings,
    loading,
    refetch,
    updateTask,
    addVideo,
    deleteVideo,
    addAttachment,
    deleteAttachment,
    addScheduleItem,
    updateScheduleItem,
    deleteScheduleItem,
    saveHtmlContent,
    addParticipant,
    removeParticipant,
    addPayment,
    deletePayment,
    addMeeting,
    deleteMeeting,
  } = useTaskDetail(effectiveTaskId);

  useEffect(() => {
    if (open && effectiveTaskId && !isCreateMode) {
      refetch();
    }
  }, [open, effectiveTaskId, refetch, isCreateMode]);

  // Create task function
  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    
    setCreating(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          eventId: initialData?.eventId || null,
          status: initialData?.status || "pending",
          priority: "medium",
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const newTaskId = data.data.id;
        setInternalTaskId(newTaskId);
        setIsCreateMode(false);
        onTaskCreated?.(newTaskId);
        // Refetch will happen automatically due to effectiveTaskId change
      }
    } catch (error) {
      console.error("Failed to create task:", error);
    } finally {
      setCreating(false);
    }
  };

  // Duplicate task function
  const handleDuplicateTask = async () => {
    if (!task) return;
    
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Copia de ${task.title}`,
          description: task.description,
          eventId: task.eventId,
          status: "pending",
          priority: task.priority,
          category: task.category,
          dueDate: task.dueDate,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const newTaskId = data.data.id;
        setInternalTaskId(newTaskId);
        onTaskCreated?.(newTaskId);
      }
    } catch (error) {
      console.error("Failed to duplicate task:", error);
    }
  };

  const handleDelete = async () => {
    const idToDelete = effectiveTaskId;
    if (!idToDelete || !confirm("¿Estás seguro de eliminar esta tarea?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${idToDelete}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        onOpenChange(false);
        onTaskDeleted?.();
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
    } finally {
      setDeleting(false);
    }
  };

  const handleTaskUpdate = async (updates: Record<string, unknown>) => {
    const result = await updateTask(updates);
    if (result) {
      onTaskUpdated?.();
    }
    return result;
  };

  const startEditingTitle = () => {
    setEditedTitle(task?.title || "");
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  const cancelEditingTitle = () => {
    setIsEditingTitle(false);
    setEditedTitle("");
  };

  const saveTitle = async () => {
    if (!editedTitle.trim() || editedTitle.trim() === task?.title) {
      cancelEditingTitle();
      return;
    }
    await handleTaskUpdate({ title: editedTitle.trim() });
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveTitle();
    } else if (e.key === "Escape") {
      cancelEditingTitle();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-4xl md:max-w-5xl lg:max-w-6xl p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isCreateMode ? (
                /* Create Mode Header */
                <div className="flex items-center gap-3 flex-1">
                  <Input
                    ref={newTaskInputRef}
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newTaskTitle.trim()) {
                        handleCreateTask();
                      } else if (e.key === "Escape") {
                        onOpenChange(false);
                      }
                    }}
                    className="text-xl font-semibold h-10 w-80"
                    placeholder="Título de la nueva tarea..."
                    disabled={creating}
                  />
                  {initialData?.eventName && (
                    <Badge variant="outline" className="text-muted-foreground">
                      {initialData.eventName}
                    </Badge>
                  )}
                  {!initialData?.eventId && (
                    <Badge variant="secondary" className="text-muted-foreground">
                      Tarea General
                    </Badge>
                  )}
                </div>
              ) : loading ? (
                <Skeleton className="h-7 w-64" />
              ) : isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    ref={titleInputRef}
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    className="text-xl font-semibold h-9 w-64"
                    placeholder="Título de la tarea"
                  />
                  <Button size="icon" variant="ghost" onClick={saveTitle} className="h-8 w-8">
                    <RiCheckLine className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={cancelEditingTitle} className="h-8 w-8">
                    <RiCloseLine className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 group cursor-pointer" onClick={startEditingTitle}>
                    <SheetTitle className="text-xl font-semibold">
                      {task?.title || initialTitle || "Cargando..."}
                    </SheetTitle>
                    <RiPencilLine className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {task?.category && (
                    <Badge
                      className={`${categoryColors[task.category] || categoryColors.general} text-white`}
                    >
                      {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
                    </Badge>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mr-8">
              {isCreateMode ? (
                /* Create Mode Actions */
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    disabled={creating}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreateTask}
                    disabled={creating || !newTaskTitle.trim()}
                    className="gap-2"
                  >
                    {creating ? "Creando..." : "Crear Tarea"}
                  </Button>
                </>
              ) : (
                /* View Mode Actions */
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAiDrawerOpen(true)}
                    disabled={loading}
                    className="gap-2 border-violet-300 text-violet-600 hover:bg-violet-50 hover:text-violet-700"
                  >
                    <Sparkles className="h-4 w-4" />
                    Enti
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDuplicateTask}
                    disabled={loading || !task}
                    className="gap-2"
                    title="Duplicar tarea"
                  >
                    <RiFileCopyLine className="h-4 w-4" />
                    Duplicar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting || loading}
                    className="text-destructive border-destructive/50 hover:bg-destructive hover:text-destructive-foreground gap-2"
                  >
                    <RiDeleteBinLine className="h-4 w-4" />
                    {deleting ? "Eliminando..." : "Eliminar"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Content - 2 columns layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column - Tabs Content (60%) */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-[var(--border)]">
            {isCreateMode && !effectiveTaskId ? (
              /* Create Mode - Show placeholder */
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <RiFileListLine className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nueva Tarea</h3>
                  <p className="text-muted-foreground mb-4">
                    Escribe un título arriba y presiona <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd> o haz clic en "Crear Tarea" para comenzar.
                  </p>
                  {initialData?.eventName ? (
                    <p className="text-sm text-muted-foreground">
                      Se creará en el evento: <strong>{initialData.eventName}</strong>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Se creará como <strong>Tarea General</strong> (sin evento asociado)
                    </p>
                  )}
                  {initialData?.status && initialData.status !== "pending" && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Estado inicial: <strong>{initialData.status === "in_progress" ? "En progreso" : initialData.status === "completed" ? "Completado" : initialData.status}</strong>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* View/Edit Mode - Show tabs */
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="px-6 pt-4 shrink-0">
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="general" className="gap-2">
                      <RiFileListLine className="h-4 w-4" />
                      General
                    </TabsTrigger>
                    <TabsTrigger value="info" className="gap-2">
                      <RiInformationLine className="h-4 w-4" />
                      Información
                    </TabsTrigger>
                    <TabsTrigger value="schedule" className="gap-2">
                      <RiCalendarScheduleLine className="h-4 w-4" />
                      Orden del día
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <TabsContent value="general" className="h-full m-0">
                    <TaskGeneralTab
                      task={task}
                      participants={participants}
                      videos={videos}
                      htmlContent={htmlContent}
                      loading={loading}
                      onUpdateTask={handleTaskUpdate}
                      onAddVideo={addVideo}
                      onDeleteVideo={deleteVideo}
                      onSaveHtmlContent={saveHtmlContent}
                      onAddParticipant={addParticipant}
                      onRemoveParticipant={removeParticipant}
                    />
                  </TabsContent>

                  <TabsContent value="info" className="h-full m-0">
                    <TaskInfoTab
                      task={task}
                      attachments={attachments}
                      payments={payments}
                      meetings={meetings}
                      loading={loading}
                      onUpdateTask={handleTaskUpdate}
                      onAddAttachment={addAttachment}
                      onDeleteAttachment={deleteAttachment}
                      onAddPayment={addPayment}
                      onDeletePayment={deletePayment}
                      onAddMeeting={addMeeting}
                      onDeleteMeeting={deleteMeeting}
                    />
                  </TabsContent>

                  <TabsContent value="schedule" className="h-full m-0">
                    <TaskScheduleTab
                      scheduleItems={scheduleItems}
                      loading={loading}
                      onAddScheduleItem={addScheduleItem}
                      onUpdateScheduleItem={updateScheduleItem}
                      onDeleteScheduleItem={deleteScheduleItem}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            )}
          </div>

          {/* Right Column - Chat (40%) */}
          <div className="w-[400px] shrink-0 flex flex-col overflow-hidden">
            {effectiveTaskId ? (
              <TaskChat taskId={effectiveTaskId} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                El chat estará disponible después de crear la tarea
              </div>
            )}
          </div>
        </div>

        {/* AI Drawer - Opens as secondary sheet */}
        <TaskAIDrawer
          open={aiDrawerOpen}
          onOpenChange={setAiDrawerOpen}
          task={task}
          taskId={effectiveTaskId}
        />
      </SheetContent>
    </Sheet>
  );
}
