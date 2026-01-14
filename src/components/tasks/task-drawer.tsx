"use client";

import { useState, useEffect } from "react";
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
import {
  RiDeleteBinLine,
  RiFileListLine,
  RiInformationLine,
  RiCalendarScheduleLine,
} from "@remixicon/react";
import { useTaskDetail } from "@/hooks/use-task-detail";
import { TaskGeneralTab } from "./task-general-tab";
import { TaskInfoTab } from "./task-info-tab";
import { TaskScheduleTab } from "./task-schedule-tab";
import { TaskChat } from "./task-chat";

interface TaskDrawerProps {
  taskId: number | null;
  taskTitle?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskDeleted?: () => void;
  onTaskUpdated?: () => void;
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
}: TaskDrawerProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [deleting, setDeleting] = useState(false);

  const {
    task,
    participants,
    videos,
    attachments,
    scheduleItems,
    htmlContent,
    payments,
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
  } = useTaskDetail(taskId);

  useEffect(() => {
    if (open && taskId) {
      refetch();
    }
  }, [open, taskId, refetch]);

  const handleDelete = async () => {
    if (!taskId || !confirm("¿Estás seguro de eliminar esta tarea?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
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
              {loading ? (
                <Skeleton className="h-7 w-64" />
              ) : (
                <>
                  <SheetTitle className="text-xl font-semibold">
                    {task?.title || initialTitle || "Cargando..."}
                  </SheetTitle>
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
            <div className="flex items-center gap-4 mr-8">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={deleting || loading}
                className="text-destructive border-destructive/50 hover:bg-destructive hover:text-destructive-foreground gap-2"
              >
                <RiDeleteBinLine className="h-4 w-4" />
                {deleting ? "Eliminando..." : "Eliminar tarea"}
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Content - 2 columns layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column - Tabs Content (60%) */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-[var(--border)]">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="px-6 pt-4 flex-shrink-0">
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
                    meetings={scheduleItems}
                    loading={loading}
                    onUpdateTask={handleTaskUpdate}
                    onAddAttachment={addAttachment}
                    onDeleteAttachment={deleteAttachment}
                    onAddPayment={addPayment}
                    onDeletePayment={deletePayment}
                    onAddMeeting={addScheduleItem}
                    onDeleteMeeting={deleteScheduleItem}
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
          </div>

          {/* Right Column - Chat (40%) */}
          <div className="w-[400px] flex-shrink-0 flex flex-col overflow-hidden">
            <TaskChat taskId={taskId} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
