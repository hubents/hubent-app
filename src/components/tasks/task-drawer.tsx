"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiDeleteBinLine,
  RiFileListLine,
  RiInformationLine,
  RiCalendarScheduleLine,
  RiSurveyLine,
  RiFileCopyLine,
  RiCloseLine,
} from "@remixicon/react";
import { Sparkles } from "lucide-react";
import { useTaskDetail } from "@/hooks/use-task-detail";
import { useEventPermissions } from "@/hooks/use-event-permissions";
import { useUserSessionContext } from "@/contexts/user-session-context";
import { TaskGeneralTab } from "./task-general-tab";
import { TaskInfoTab } from "./task-info-tab";
import { TaskScheduleTab } from "./task-schedule-tab";
import { TaskFormsTab } from "./task-forms-tab";
import { TaskChat } from "./task-chat";
import { TaskAIDrawer } from "./task-ai-drawer";
import { cn } from "@/lib/utils";

interface TaskDrawerProps {
  taskId: number | null;
  taskTitle?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskDeleted?: () => void;
  onTaskUpdated?: () => void;
  onTaskCreated?: (taskId: number) => void;
  mode?: "view" | "create";
  readOnly?: boolean;
  initialData?: {
    eventId?: number;
    eventName?: string;
    status?: string;
    title?: string;
  };
}

// Tag-pill palette (matches the prototype TK_TAG bg/fg pairs)
const categoryTagStyle: Record<string, { bg: string; fg: string }> = {
  general:   { bg: "#EDE1F7", fg: "#6A3A9E" },
  evento:    { bg: "#F9D7CE", fg: "#9B3A24" },
  proveedor: { bg: "#FBE3C6", fg: "#8A4E1A" },
  cliente:   { bg: "#D9EAFB", fg: "#2B5CA6" },
  pago:      { bg: "#D9EDE3", fg: "#2C6B4A" },
};

// Header action button — prototype's pill-shaped colored buttons
function HeaderActionBtn({
  bg,
  fg,
  onClick,
  disabled,
  title,
  icon,
  children,
}: {
  bg: string;
  fg: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center cursor-pointer transition-opacity"
      style={{
        gap: 5,
        background: bg,
        color: fg,
        border: "none",
        padding: "6px 11px",
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 500,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

const TABS: Array<{ id: string; label: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { id: "general",  label: "General",       Icon: RiFileListLine },
  { id: "info",     label: "Información",   Icon: RiInformationLine },
  { id: "schedule", label: "Orden del día", Icon: RiCalendarScheduleLine },
  { id: "forms",    label: "Formularios",   Icon: RiSurveyLine },
];

export function TaskDrawer({
  taskId,
  taskTitle: initialTitle,
  open,
  onOpenChange,
  onTaskDeleted,
  onTaskUpdated,
  onTaskCreated,
  mode = "view",
  readOnly: readOnlyProp = false,
  initialData,
}: TaskDrawerProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [deleting, setDeleting] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  // Create mode state
  const [isCreateMode, setIsCreateMode] = useState(mode === "create");
  const [creating, setCreating] = useState(false);
  const [titleVal, setTitleVal] = useState(initialData?.title || "");
  const [internalTaskId, setInternalTaskId] = useState<number | null>(taskId);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Reset state when drawer opens / mode changes
  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      setIsCreateMode(true);
      setTitleVal(initialData?.title || "");
      setInternalTaskId(null);
      setActiveTab("general");
      setTimeout(() => titleInputRef.current?.focus(), 100);
    } else {
      setIsCreateMode(false);
      setInternalTaskId(taskId);
    }
  }, [open, mode, taskId, initialData?.title]);

  const effectiveTaskId = isCreateMode ? internalTaskId : taskId;

  const {
    task,
    participants,
    videos,
    attachments,
    scheduleItems,
    htmlContent,
    payments,
    unifiedPayments,
    meetings,
    checklistItems,
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
    updatePayment,
    deletePayment,
    deleteLegacyPayment,
    addMeeting,
    updateMeeting,
    deleteMeeting,
    addChecklistItem,
    updateChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    addChecklistAssignee,
    removeChecklistAssignee,
  } = useTaskDetail(effectiveTaskId);

  // Mirror server title into input when in view mode
  useEffect(() => {
    if (!isCreateMode && task?.title) setTitleVal(task.title);
  }, [task?.title, isCreateMode]);

  // Compute readOnly (parent prop OR per-event scoped permission)
  const { eventScoped } = useUserSessionContext();
  const taskEventId = task?.eventId ?? initialData?.eventId;
  const { canEdit: canEditEventSection, isParticipant } = useEventPermissions(
    taskEventId ?? undefined,
    eventScoped,
  );
  const readOnly = readOnlyProp || (
    eventScoped && taskEventId && isParticipant
      ? !canEditEventSection("tasks")
      : false
  );

  useEffect(() => {
    if (open && effectiveTaskId && !isCreateMode) refetch();
  }, [open, effectiveTaskId, refetch, isCreateMode]);

  const handleCreateTask = async () => {
    if (!titleVal.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleVal.trim(),
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
      }
    } catch (error) {
      console.error("Failed to create task:", error);
    } finally {
      setCreating(false);
    }
  };

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
    if (result) onTaskUpdated?.();
    return result;
  };

  // Live-edit title in view mode: commit on blur or Enter
  const commitTitle = async () => {
    if (isCreateMode) return;
    const trimmed = titleVal.trim();
    if (!trimmed || trimmed === task?.title) return;
    await handleTaskUpdate({ title: trimmed });
  };

  const resolvedTag = task?.category || (initialData?.eventId ? "evento" : "general");
  const tagStyle = categoryTagStyle[resolvedTag] || categoryTagStyle.general;
  const tagLabel = (resolvedTag.charAt(0).toUpperCase() + resolvedTag.slice(1));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="p-0 flex flex-col w-full sm:max-w-[1100px] [&>button:last-child]:hidden"
        style={{ borderRadius: 0, background: "#FFFFFF" }}
      >
        {/* Header — prototype style: inline title input + tag pill + colored action buttons */}
        <SheetHeader
          className="flex-shrink-0 gap-0"
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid var(--line-2)",
          }}
        >
          <SheetTitle className="sr-only">{task?.title || initialTitle || "Tarea"}</SheetTitle>
          <div className="flex items-center" style={{ gap: 12 }}>
            {/* Inline title input */}
            {loading && !isCreateMode ? (
              <Skeleton className="h-8 flex-1 max-w-md" />
            ) : (
              <input
                ref={titleInputRef}
                value={titleVal}
                onChange={(e) => setTitleVal(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (isCreateMode && titleVal.trim()) handleCreateTask();
                    else (e.target as HTMLInputElement).blur();
                  }
                  if (e.key === "Escape") {
                    if (isCreateMode) onOpenChange(false);
                    else (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder={isCreateMode ? "Nombre de la tarea" : "Título de la tarea"}
                readOnly={readOnly && !isCreateMode}
                className="bg-transparent border-none outline-none flex-1 min-w-0"
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: "var(--ink-1)",
                  cursor: readOnly && !isCreateMode ? "default" : "text",
                }}
                aria-label="Nombre de la tarea"
              />
            )}

            {/* Tag pill */}
            {!loading && (
              <span
                style={{
                  background: tagStyle.bg,
                  color: tagStyle.fg,
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {tagLabel}
              </span>
            )}

            {/* Actions */}
            <div className="flex items-center" style={{ gap: 8 }}>
              {isCreateMode ? (
                <HeaderActionBtn
                  bg="#D9ECD1"
                  fg="#1F6A3A"
                  onClick={handleCreateTask}
                  disabled={creating || !titleVal.trim()}
                  title="Guardar tarea"
                  icon={<RiFileCopyLine className="h-3 w-3" style={{ display: "none" }} />}
                >
                  {creating ? "Guardando..." : "Guardar tarea"}
                </HeaderActionBtn>
              ) : (
                <>
                  {!readOnly && (
                    <HeaderActionBtn
                      bg="#EDE6FB"
                      fg="#6A3A9E"
                      onClick={() => setAiDrawerOpen(true)}
                      disabled={loading}
                      title="HubIA"
                      icon={<Sparkles className="h-3 w-3" />}
                    >
                      HubIA
                    </HeaderActionBtn>
                  )}
                  {!readOnly && (
                    <HeaderActionBtn
                      bg="#F4EFE7"
                      fg="#6E5A3A"
                      onClick={handleDuplicateTask}
                      disabled={loading || !task}
                      title="Duplicar"
                      icon={<RiFileCopyLine className="h-3 w-3" />}
                    >
                      Duplicar
                    </HeaderActionBtn>
                  )}
                  {!readOnly && (
                    <HeaderActionBtn
                      bg="#FDE5E1"
                      fg="#B83E3E"
                      onClick={handleDelete}
                      disabled={deleting || loading}
                      title="Eliminar"
                      icon={<RiDeleteBinLine className="h-3 w-3" />}
                    >
                      {deleting ? "Eliminando..." : "Eliminar"}
                    </HeaderActionBtn>
                  )}
                </>
              )}

              {/* Close button — prototype-style icon-btn */}
              <button
                onClick={() => onOpenChange(false)}
                className="icon-btn cursor-pointer inline-flex items-center justify-center"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: "none",
                  background: "transparent",
                  color: "var(--ink-2)",
                  marginLeft: 4,
                }}
                title="Cerrar"
                aria-label="Cerrar"
              >
                <RiCloseLine className="h-4 w-4" />
              </button>
            </div>
          </div>
        </SheetHeader>

        {/* Content — 2 columns */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left column — main */}
          <div
            className="flex-1 flex flex-col overflow-hidden"
            style={{ borderRight: "1px solid var(--line-2)" }}
          >
            {isCreateMode && !effectiveTaskId ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <RiFileListLine
                    className="mx-auto mb-3"
                    style={{ width: 36, height: 36, color: "var(--ink-3)" }}
                  />
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--ink-1)",
                      marginBottom: 6,
                    }}
                  >
                    Nueva tarea
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
                    Escribe un nombre arriba y presiona{" "}
                    <kbd
                      style={{
                        padding: "1px 6px",
                        background: "var(--bg-subtle)",
                        borderRadius: 4,
                        fontSize: 11,
                      }}
                    >
                      Enter
                    </kbd>{" "}
                    o pulsa &ldquo;Guardar tarea&rdquo;.
                  </p>
                  {initialData?.eventName && (
                    <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 8 }}>
                      Se creará en el evento:{" "}
                      <strong style={{ color: "var(--ink-1)" }}>{initialData.eventName}</strong>
                    </p>
                  )}
                  {!initialData?.eventId && (
                    <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 8 }}>
                      Se creará como <strong style={{ color: "var(--ink-1)" }}>tarea general</strong>.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tabs — prototype underline style */}
                <div
                  className="flex-shrink-0 flex"
                  style={{
                    padding: "12px 22px 0",
                    gap: 0,
                    borderBottom: "1px solid var(--line-2)",
                  }}
                  role="tablist"
                >
                  {TABS.map((t) => {
                    const active = activeTab === t.id;
                    const Icon = t.Icon;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={cn(
                          "inline-flex items-center cursor-pointer transition-colors",
                          active ? "" : "hover:text-[var(--ink-1)]",
                        )}
                        style={{
                          gap: 6,
                          padding: "10px 18px",
                          background: "transparent",
                          border: "1px solid transparent",
                          borderBottom: active
                            ? "2px solid var(--ink-1)"
                            : "2px solid transparent",
                          borderTopLeftRadius: 8,
                          borderTopRightRadius: 8,
                          fontSize: 13,
                          fontWeight: active ? 600 : 500,
                          color: active ? "var(--ink-1)" : "var(--ink-3)",
                          marginBottom: -1,
                        }}
                        role="tab"
                        aria-selected={active}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto">
                  {activeTab === "general" && (
                    <TaskGeneralTab
                      task={task}
                      participants={participants}
                      videos={videos}
                      htmlContent={htmlContent}
                      checklistItems={checklistItems}
                      loading={loading}
                      readOnly={readOnly}
                      onUpdateTask={handleTaskUpdate}
                      onAddVideo={addVideo}
                      onDeleteVideo={deleteVideo}
                      onSaveHtmlContent={saveHtmlContent}
                      onAddParticipant={addParticipant}
                      onRemoveParticipant={removeParticipant}
                      onAddChecklistItem={addChecklistItem}
                      onUpdateChecklistItem={updateChecklistItem}
                      onToggleChecklistItem={toggleChecklistItem}
                      onDeleteChecklistItem={deleteChecklistItem}
                      onAddChecklistAssignee={addChecklistAssignee}
                      onRemoveChecklistAssignee={removeChecklistAssignee}
                    />
                  )}
                  {activeTab === "info" && (
                    <TaskInfoTab
                      task={task}
                      attachments={attachments}
                      payments={payments}
                      unifiedPayments={unifiedPayments}
                      meetings={meetings}
                      loading={loading}
                      readOnly={readOnly}
                      onUpdateTask={handleTaskUpdate}
                      onAddAttachment={addAttachment}
                      onDeleteAttachment={deleteAttachment}
                      onAddPayment={addPayment}
                      onUpdatePayment={updatePayment}
                      onDeletePayment={deletePayment}
                      onDeleteLegacyPayment={deleteLegacyPayment}
                      onAddMeeting={addMeeting}
                      onUpdateMeeting={updateMeeting}
                      onDeleteMeeting={deleteMeeting}
                      onTaskRefetch={refetch}
                    />
                  )}
                  {activeTab === "schedule" && effectiveTaskId !== null && (
                    <TaskScheduleTab
                      taskId={effectiveTaskId}
                      scheduleItems={scheduleItems}
                      loading={loading}
                      readOnly={readOnly}
                      onAddScheduleItem={addScheduleItem}
                      onUpdateScheduleItem={updateScheduleItem}
                      onDeleteScheduleItem={deleteScheduleItem}
                    />
                  )}
                  {activeTab === "forms" && effectiveTaskId !== null && (
                    <TaskFormsTab taskId={effectiveTaskId} />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right column — Comentarios */}
          <div
            className="w-[320px] shrink-0 flex flex-col overflow-hidden"
            style={{ background: "#FFFFFF" }}
          >
            {/* Comments header — aligned with the left-column tab bar */}
            <div
              className="flex flex-shrink-0"
              style={{
                padding: "12px 22px 0",
                borderBottom: "1px solid var(--line-2)",
                boxSizing: "border-box",
              }}
            >
              <span
                className="inline-flex items-center"
                style={{
                  gap: 8,
                  padding: "10px 4px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--ink-1)",
                  border: "1px solid transparent",
                  borderBottom: "2px solid transparent",
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                  marginBottom: -1,
                  boxSizing: "border-box",
                }}
              >
                Comentarios
                <span
                  className="inline-flex items-center"
                  style={{
                    gap: 4,
                    background: "#DCEEDD",
                    color: "#2C6B4A",
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#4DA363",
                      display: "inline-block",
                    }}
                  />
                  En vivo
                </span>
              </span>
            </div>

            {/* Chat (existing real-time component) */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {effectiveTaskId ? (
                <TaskChat taskId={effectiveTaskId} />
              ) : (
                <div
                  className="flex-1 flex flex-col items-center justify-center"
                  style={{ gap: 4, color: "var(--ink-3)", padding: 18 }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>
                    No hay comentarios aún
                  </div>
                  <div style={{ fontSize: 12 }}>
                    El chat estará disponible al guardar la tarea
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI drawer — secondary sheet */}
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
