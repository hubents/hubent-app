"use client";

import { useTranslations } from "next-intl";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  PlusSignIcon, Search01Icon, RadioButtonIcon, Calendar01Icon,
  SignalLow01Icon, SignalMedium01Icon, SignalFull01Icon,
  FilterIcon, Sorting01Icon, Tick01Icon, Calendar03Icon,
  ClipboardIcon, CheckmarkCircle01Icon, Attachment01Icon,
  Chat01Icon, UserGroupIcon,
} from "@hugeicons/core-free-icons";

const RiAddLine = hgIcon(PlusSignIcon);
const RiSearchLine = hgIcon(Search01Icon);
const RiCheckboxBlankCircleLine = hgIcon(RadioButtonIcon);
const RiCalendarLine = hgIcon(Calendar01Icon);
const RiSignalWifi1Line = hgIcon(SignalLow01Icon);
const RiSignalWifi2Line = hgIcon(SignalMedium01Icon);
const RiSignalWifiLine = hgIcon(SignalFull01Icon);
const RiFilter3Line = hgIcon(FilterIcon);
const RiSortDesc = hgIcon(Sorting01Icon);
const RiCheckLine = hgIcon(Tick01Icon);
const RiCalendarEventLine = hgIcon(Calendar03Icon);
const RiClipboardLine = hgIcon(ClipboardIcon);
const RiCheckboxCircleLine = hgIcon(CheckmarkCircle01Icon);
const RiAttachmentLine = hgIcon(Attachment01Icon);
const RiChat3Line = hgIcon(Chat01Icon);
const RiTeamLine = hgIcon(UserGroupIcon);
import { useTasks, type TaskScope } from "@/hooks/use-tasks";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  useDroppable,
} from "@dnd-kit/core";
import type { CollisionDetection } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useUserSessionContext } from "@/contexts/user-session-context";
import { useTaskRefresh } from "@/hooks/use-task-refresh";
import { Skeleton } from "@/components/ui/skeleton";

// ── Column meta — pastel header per prototype TK_COL ──
const COLUMN_META = {
  pending: {
    bg: "#FDE4DE",
    dot: "#E86A55",
    ink: "#8A3A2A",
    borderLeft: "#F3B6A9",
  },
  in_progress: {
    bg: "#FCE7CC",
    dot: "#D9822B",
    ink: "#7A4B1E",
    borderLeft: "#EBC78D" as string | null,
  },
  completed: {
    bg: "#DCEEDD",
    dot: "#4DA363",
    ink: "#2E5A3A",
    borderLeft: "#BCD4C1",
  },
} as const;

const COLUMN_ORDER: Array<keyof typeof COLUMN_META> = [
  "pending",
  "in_progress",
  "completed",
];

// ── Priority — colored, with signal icon ──
const PRIO = {
  high: { color: "#C0392B", Icon: RiSignalWifiLine },
  medium: { color: "#D9822B", Icon: RiSignalWifi2Line },
  low: { color: "#6E7781", Icon: RiSignalWifi1Line },
} as const;

const PRIO_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

// ── Scope <-> tab mapping (preserves API behavior) ──
const SCOPE_TABS: Array<{
  key: TaskScope;
  Icon: React.ComponentType<{ className?: string }> | null;
}> = [
  { key: "all", Icon: null },
  { key: "event", Icon: RiCalendarEventLine },
  { key: "standalone", Icon: RiClipboardLine },
];

interface TaskAvatar {
  initials: string;
  color: string;
  name: string;
}

interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  eventName: string | null;
  eventId?: number | null;
  eventType?: string | null;
  customEventType?: string | null;
  sortOrder?: number | null;
  participants?: TaskAvatar[];
  participantCount?: number;
}

// Event-type pill palette — matches the events page typePill mapping.
const EVENT_TYPE_PILL: Record<string, { bg: string; fg: string }> = {
  wedding:      { bg: "#FCE6E2", fg: "#B03A2E" },
  pre_wedding:  { bg: "#E0F5EC", fg: "#007A49" },
  post_wedding: { bg: "#FCEBD9", fg: "#A24E0F" },
  birthday:     { bg: "#EFE5FA", fg: "#5C2EAA" },
  corporate:    { bg: "#E1ECFB", fg: "#1F4FA8" },
  social:       { bg: "#FBF1D7", fg: "#8A6300" },
  other:        { bg: "#ECEAE5", fg: "#5C5A55" },
};

const eventTypePill = (type?: string | null, customType?: string | null) => {
  if (!type) return null;
  const meta = EVENT_TYPE_PILL[type] || EVENT_TYPE_PILL.other;
  const label = type === "other" && customType?.trim() ? customType.trim() : null;
  return { type, label, bg: meta.bg, fg: meta.fg };
};

// ── Avatar stack — overlapped circular initials, prototype style ──
function AvatarStack({
  participants,
  size = 26,
  max = 3,
}: {
  participants: TaskAvatar[];
  size?: number;
  max?: number;
}) {
  if (!participants.length) return null;
  const visible = participants.slice(0, max);
  const overflow = Math.max(0, participants.length - max);
  return (
    <div className="inline-flex" style={{ flexShrink: 0 }}>
      {visible.map((p, i) => (
        <span
          key={i}
          title={p.name}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: p.color,
            color: "white",
            fontSize: size * 0.42,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid #FFFFFF",
            marginLeft: i === 0 ? 0 : -8,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.04)",
          }}
        >
          {p.initials}
        </span>
      ))}
      {overflow > 0 && (
        <span
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: "var(--bg-subtle)",
            color: "var(--ink-2)",
            fontSize: size * 0.36,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid #FFFFFF",
            marginLeft: -8,
          }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

const formatDate = (s: string | null) => {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
};

// ── Sortable card ──
function SortableTaskCard({
  task,
  onClick,
  onToggleComplete,
}: {
  task: Task;
  onClick: () => void;
  onToggleComplete: (taskId: number, currentStatus: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id.toString(),
    data: { task, type: "task" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const t = useTranslations("tasks");
  const meta = COLUMN_META[task.status as keyof typeof COLUMN_META];
  const prio = PRIO[task.priority as keyof typeof PRIO] ?? PRIO.low;
  const PrioIcon = prio.Icon;
  const isCompleted = task.status === "completed";
  const dueLabel = formatDate(task.dueDate);
  const tagPill = eventTypePill(task.eventType, task.customEventType);

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: "#FFFFFF",
        border: "1px solid var(--line-1)",
        borderLeft: meta?.borderLeft
          ? `3px solid ${meta.borderLeft}`
          : "1px solid var(--line-1)",
        borderRadius: 10,
        padding: "14px 14px 12px",
        cursor: isDragging ? "grabbing" : "grab",
        boxShadow: isDragging
          ? "0 8px 16px rgba(0,0,0,0.15)"
          : "0 1px 2px rgba(0,0,0,0.03)",
        opacity: isDragging ? 0.6 : 1,
        userSelect: "none",
        minHeight: 184,
      }}
      className="flex flex-col gap-2.5"
      {...listeners}
      {...attributes}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="flex flex-col gap-2.5 flex-1"
      >
        {/* Header — event slot + title + avatar stack */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div
              style={{
                fontSize: 12,
                color: task.eventName ? "#8B6F4E" : "var(--ink-4)",
                fontWeight: 500,
                marginBottom: 4,
                minHeight: 16,
                fontStyle: task.eventName ? "normal" : "italic",
              }}
              className="truncate"
            >
              {task.eventName || t("card.noEvent")}
            </div>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: isCompleted ? "var(--ink-3)" : "var(--ink-1)",
                textDecoration: isCompleted ? "line-through" : "none",
                textDecorationThickness: isCompleted ? "1.5px" : undefined,
                lineHeight: 1.35,
              }}
            >
              {task.title}
            </div>
          </div>
          <AvatarStack participants={task.participants || []} />
        </div>

        {/* Tag pill (event type) + origin chip */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {tagPill ? (
            <span
              style={{
                background: tagPill.bg,
                color: tagPill.fg,
                padding: "2px 9px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {tagPill.label ?? t(`eventType.${tagPill.type as "wedding" | "pre_wedding" | "post_wedding" | "birthday" | "corporate" | "social" | "other"}`)}
            </span>
          ) : (
            <span
              style={{
                background: "var(--bg-subtle)",
                color: "var(--ink-2)",
                padding: "2px 9px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {t("card.general")}
            </span>
          )}
          <span
            className="inline-flex items-center gap-1"
            style={{ fontSize: 11.5, color: "var(--ink-3)" }}
          >
            {task.eventId ? (
              <>
                <RiCalendarEventLine className="h-3 w-3" />
                {t("card.fromEvent")}
              </>
            ) : (
              <>
                <RiClipboardLine className="h-3 w-3" />
                {t("card.general")}
              </>
            )}
          </span>
        </div>

        {/* Due date — slot always reserved */}
        <div
          className="inline-flex items-center gap-1.5"
          style={{
            fontSize: 12,
            color: dueLabel ? "var(--ink-2)" : "var(--ink-4)",
          }}
        >
          <RiCalendarLine className="h-3 w-3" />
          <span>{dueLabel || t("card.noDate")}</span>
        </div>

        {/* Priority */}
        <div
          className="inline-flex items-center gap-1.5"
          style={{ fontSize: 12, color: prio.color, marginTop: "auto" }}
        >
          <PrioIcon className="h-3.5 w-3.5" />
          <span style={{ fontWeight: 500 }}>{t(`prio.${task.priority as "high" | "medium" | "low"}`)}</span>
        </div>

        {/* Footer — counters + participant count */}
        <div
          className="flex items-center gap-3.5"
          style={{
            fontSize: 11.5,
            color: "var(--ink-3)",
            paddingTop: 6,
            borderTop: "1px solid var(--line-2)",
          }}
        >
          <span className="inline-flex items-center gap-1">
            <RiCheckboxCircleLine className="h-3 w-3" />
            0/0
          </span>
          <span className="inline-flex items-center gap-1">
            <RiAttachmentLine className="h-3 w-3" />
            0
          </span>
          <span className="inline-flex items-center gap-1">
            <RiChat3Line className="h-3 w-3" />
            0
          </span>
          {(task.participantCount || 0) > 0 && (
            <span
              className="inline-flex items-center gap-1"
              style={{ marginLeft: "auto", color: "#5B8CC8", fontWeight: 500 }}
              title={t("card.participants")}
            >
              <RiTeamLine className="h-3 w-3" />
              {task.participantCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Column ──
function TaskColumn({
  id,
  tasks,
  onTaskClick,
  onQuickAdd,
  onToggleComplete,
}: {
  id: keyof typeof COLUMN_META;
  tasks: Task[];
  onTaskClick: (taskId: number) => void;
  onQuickAdd: (title: string, status: string) => Promise<void>;
  onToggleComplete: (taskId: number, currentStatus: string) => void;
}) {
  const t = useTranslations("tasks");
  const meta = COLUMN_META[id];
  const { setNodeRef, isOver } = useDroppable({ id });
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const quickAddInputRef = useRef<HTMLInputElement>(null);

  const handleQuickAdd = async () => {
    if (!quickAddTitle.trim()) return;
    setIsCreating(true);
    try {
      await onQuickAdd(quickAddTitle.trim(), id);
      setQuickAddTitle("");
      setIsQuickAddOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  const openQuickAdd = () => {
    setIsQuickAddOpen(true);
    setTimeout(() => quickAddInputRef.current?.focus(), 50);
  };

  const sortedTasks = [...tasks].sort(
    (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.id - b.id,
  );
  const taskIds = sortedTasks.map((t) => t.id.toString());

  return (
    <div
      className="flex flex-col gap-2.5"
      style={{
        borderRadius: 10,
        transition: "all 150ms ease",
        background: isOver ? "rgba(0,0,0,0.02)" : "transparent",
        padding: isOver ? 10 : 0,
        marginLeft: isOver ? -10 : 0,
        marginRight: isOver ? -10 : 0,
      }}
    >
      {/* Column header — pastel pill */}
      <div
        className="flex items-center gap-2"
        style={{
          background: meta.bg,
          borderRadius: 10,
          padding: "10px 14px",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: meta.dot,
            display: "inline-block",
          }}
        />
        <span
          style={{ fontSize: 13, fontWeight: 600, color: meta.ink }}
        >
          {t(`col.${id}`)}
        </span>
        <span style={{ fontSize: 12, color: meta.ink, opacity: 0.7 }}>
          {tasks.length}
        </span>
        <button
          onClick={openQuickAdd}
          className="ml-auto cursor-pointer inline-flex items-center justify-center"
          style={{
            background: "transparent",
            border: "none",
            color: meta.ink,
            padding: 2,
          }}
          title={t("col.addTaskIn", { col: t(`col.${id}`) })}
          aria-label={t("col.addTaskIn", { col: t(`col.${id}`) })}
        >
          <RiAddLine className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2.5"
        style={{ minHeight: 200 }}
      >
        {/* Quick add */}
        {isQuickAddOpen && (
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid var(--color-primary)",
              borderRadius: 10,
              padding: 10,
            }}
          >
            <input
              ref={quickAddInputRef}
              value={quickAddTitle}
              onChange={(e) => setQuickAddTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && quickAddTitle.trim()) handleQuickAdd();
                if (e.key === "Escape") {
                  setIsQuickAddOpen(false);
                  setQuickAddTitle("");
                }
              }}
              placeholder={t("quickAdd.placeholder")}
              disabled={isCreating}
              className="w-full outline-none"
              style={{
                fontSize: 13,
                padding: "7px 9px",
                border: "1px solid var(--line-1)",
                borderRadius: 8,
                background: "#FFFFFF",
                color: "var(--ink-1)",
              }}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleQuickAdd}
                disabled={!quickAddTitle.trim() || isCreating}
                className="flex-1 inline-flex items-center justify-center cursor-pointer"
                style={{
                  background: "var(--color-primary)",
                  color: "var(--color-primary-ink)",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "6px 10px",
                  border: "none",
                  borderRadius: 8,
                  opacity: !quickAddTitle.trim() || isCreating ? 0.6 : 1,
                }}
              >
                {isCreating ? t("quickAdd.creating") : t("quickAdd.create")}
              </button>
              <button
                onClick={() => {
                  setIsQuickAddOpen(false);
                  setQuickAddTitle("");
                }}
                disabled={isCreating}
                className="cursor-pointer"
                style={{
                  background: "transparent",
                  color: "var(--ink-2)",
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "6px 10px",
                  border: "none",
                  borderRadius: 8,
                }}
              >
                {t("quickAdd.cancel")}
              </button>
            </div>
          </div>
        )}

        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {sortedTasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task.id)}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && !isQuickAddOpen && (
          <div
            className="text-center"
            style={{
              padding: "24px 12px",
              fontSize: 12.5,
              color: "var(--ink-3)",
            }}
          >
            {isOver ? t("col.dropHere") : t("col.noTasks")}
          </div>
        )}
      </div>
    </div>
  );
}

interface TasksPageContentProps {
  /**
   * If set, scopes the page to a single event: tasks only from this event,
   * scope tabs hidden, and the create-task drawer pre-fills `eventId`.
   * Used by the event workspace's Tasks tab to share UI with the global page.
   */
  eventId?: number;
}

export function TasksPageContent({ eventId }: TasksPageContentProps = {}) {
  const t = useTranslations("tasks");
  const isEventScoped = typeof eventId === "number";
  const [scope, setScope] = useState<TaskScope>(isEventScoped ? "event" : "all");
  const { tasks: apiTasks, loading, refetch } = useTasks(
    isEventScoped ? eventId : undefined,
    isEventScoped ? "event" : scope,
  );
  const searchParams = useSearchParams();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"view" | "create">("view");
  const [drawerInitialData, setDrawerInitialData] = useState<
    { status?: string; eventId?: number } | undefined
  >(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>([]);

  // Filter / sort menus
  const [prioFilter, setPrioFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [sortBy, setSortBy] = useState<"default" | "name-az" | "name-za" | "prio">("default");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useTaskRefresh(refetch);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const kanbanCollisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return closestCorners(args);
  };

  useEffect(() => {
    if (apiTasks.length > 0) setLocalTasks(apiTasks as Task[]);
  }, [apiTasks]);

  useEffect(() => {
    const taskIdParam = searchParams.get("taskId");
    if (taskIdParam) {
      const id = parseInt(taskIdParam, 10);
      if (!isNaN(id)) {
        setSelectedTaskId(id);
        setDrawerMode("view");
        setIsDrawerOpen(true);
      }
    } else if (searchParams.get("new") === "true") {
      openCreateDrawer();
    }
  }, [searchParams]);

  // Close popovers on outside click
  useEffect(() => {
    if (!filterOpen && !sortOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (filterOpen && filterRef.current && !filterRef.current.contains(t))
        setFilterOpen(false);
      if (sortOpen && sortRef.current && !sortRef.current.contains(t))
        setSortOpen(false);
    };
    const id = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handler);
    };
  }, [filterOpen, sortOpen]);

  const displayTasks = localTasks;

  const filteredTasks = useMemo(() => {
    let result = displayTasks.filter((t) =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    if (prioFilter !== "all") result = result.filter((t) => t.priority === prioFilter);
    return result;
  }, [displayTasks, searchTerm, prioFilter]);

  const sortedDisplay = useMemo(() => {
    if (sortBy === "default") return filteredTasks;
    const arr = [...filteredTasks];
    if (sortBy === "name-az") arr.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === "name-za") arr.sort((a, b) => b.title.localeCompare(a.title));
    else if (sortBy === "prio")
      arr.sort(
        (a, b) => (PRIO_ORDER[a.priority] ?? 3) - (PRIO_ORDER[b.priority] ?? 3),
      );
    return arr;
  }, [filteredTasks, sortBy]);

  const tabCounts = useMemo(
    () => ({
      all: displayTasks.length,
      event: displayTasks.filter((t) => !!t.eventId).length,
      standalone: displayTasks.filter((t) => !t.eventId).length,
    }),
    [displayTasks],
  );

  const handleTaskClick = (taskId: number) => {
    setSelectedTaskId(taskId);
    setDrawerMode("view");
    setIsDrawerOpen(true);
  };

  const openCreateDrawer = (status?: string) => {
    setSelectedTaskId(null);
    setDrawerMode("create");
    setDrawerInitialData(status ? { status } : undefined);
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = (open: boolean) => {
    setIsDrawerOpen(open);
    if (!open) setDrawerInitialData(undefined);
  };

  const handleTaskCreated = (newTaskId: number) => {
    setSelectedTaskId(newTaskId);
    setDrawerMode("view");
    refetch();
  };

  const handleQuickAdd = async (title: string, status: string) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          status,
          priority: "medium",
          ...(isEventScoped && eventId ? { eventId } : {}),
        }),
      });
      if (res.ok) refetch();
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleToggleComplete = async (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      refetch();
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = displayTasks.find((t) => t.id.toString() === active.id);
    if (task) setActiveTask(task as Task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const draggedTask = displayTasks.find((t) => t.id.toString() === activeId);
    if (!draggedTask) return;

    const isColumn = COLUMN_ORDER.includes(overId as keyof typeof COLUMN_META);
    const overTask = displayTasks.find((t) => t.id.toString() === overId);

    if (isColumn) {
      const newStatus = overId;
      if (draggedTask.status === newStatus) return;
      setLocalTasks((prev) =>
        prev.map((t) =>
          t.id.toString() === activeId ? { ...t, status: newStatus } : t,
        ),
      );
      try {
        const res = await fetch(`/api/tasks/${draggedTask.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error("Failed to update status");
      } catch (error) {
        console.error("Failed to update task status:", error);
        refetch();
      }
    } else if (overTask) {
      const sameColumn = draggedTask.status === overTask.status;
      if (sameColumn) {
        const columnTasks = displayTasks
          .filter((t) => t.status === draggedTask.status)
          .sort(
            (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.id - b.id,
          );
        const oldIndex = columnTasks.findIndex(
          (t) => t.id.toString() === activeId,
        );
        const newIndex = columnTasks.findIndex(
          (t) => t.id.toString() === overId,
        );
        if (oldIndex !== newIndex) {
          const reordered = arrayMove(columnTasks, oldIndex, newIndex);
          const items = reordered.map((t, index) => ({
            taskId: t.id,
            sortOrder: index,
          }));
          setLocalTasks((prev) => {
            const others = prev.filter((t) => t.status !== draggedTask.status);
            const updated = reordered.map((t, index) => ({
              ...t,
              sortOrder: index,
            }));
            return [...others, ...updated];
          });
          try {
            await fetch("/api/tasks/reorder", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                items,
                eventId: draggedTask.eventId ?? null,
              }),
            });
          } catch (error) {
            console.error("Failed to reorder tasks:", error);
            refetch();
          }
        }
      } else {
        const newStatus = overTask.status;
        const targetColumnTasks = displayTasks
          .filter((t) => t.status === newStatus)
          .sort(
            (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.id - b.id,
          );
        const targetIndex = targetColumnTasks.findIndex(
          (t) => t.id.toString() === overId,
        );
        setLocalTasks((prev) =>
          prev.map((t) =>
            t.id.toString() === activeId
              ? { ...t, status: newStatus, sortOrder: targetIndex }
              : t,
          ),
        );
        try {
          const moveRes = await fetch(`/api/tasks/${draggedTask.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: newStatus,
              sortOrder: targetIndex,
            }),
          });
          if (!moveRes.ok) throw new Error("Failed to move task");

          const items = [
            ...targetColumnTasks.slice(0, targetIndex).map((t, index) => ({
              taskId: t.id,
              sortOrder: index,
            })),
            { taskId: draggedTask.id, sortOrder: targetIndex },
            ...targetColumnTasks.slice(targetIndex).map((t, index) => ({
              taskId: t.id,
              sortOrder: targetIndex + 1 + index,
            })),
          ];
          await fetch("/api/tasks/reorder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items,
              eventId: draggedTask.eventId ?? null,
            }),
          });
        } catch (error) {
          console.error("Failed to move task:", error);
          refetch();
        }
      }
    }
  };

  const { can } = useUserSessionContext();
  const canCreateTask = can("tasks:create");
  const canUpdateTask = can("tasks:update");

  const PRIO_OPTIONS: Array<{ v: typeof prioFilter; l: string }> = [
    { v: "all", l: t("filter.prioAll") },
    { v: "high", l: t("prio.high") },
    { v: "medium", l: t("prio.medium") },
    { v: "low", l: t("prio.low") },
  ];

  const SORT_OPTIONS: Array<{ v: typeof sortBy; l: string }> = [
    { v: "default", l: t("sort.default") },
    { v: "name-az", l: t("sort.nameAz") },
    { v: "name-za", l: t("sort.nameZa") },
    { v: "prio", l: t("sort.prio") },
  ];

  return (
    <div className="space-y-4">
      {/* Card panel — wraps toolbar + kanban (no in-page header — title lives in global topbar, matching prototype) */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--line-1)",
          borderRadius: 12,
          padding: 18,
        }}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap" style={{ marginBottom: 14 }}>
          {/* Search */}
          <div
            className="inline-flex items-center"
            style={{
              width: 260,
              border: "1px solid var(--line-1)",
              borderRadius: 8,
              background: "#FFFFFF",
              padding: "6px 10px",
              gap: 8,
            }}
          >
            <RiSearchLine className="h-3.5 w-3.5 text-[var(--ink-3)]" />
            <input
              placeholder={t("toolbar.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none bg-transparent"
              style={{
                fontSize: 13,
                color: "var(--ink-1)",
              }}
              aria-label={t("toolbar.searchLabel")}
            />
          </div>

          {/* Scope tabs — hidden when the page is scoped to a single event */}
          {!isEventScoped && (
          <div
            className="inline-flex"
            style={{
              gap: 4,
              background: "var(--bg-subtle)",
              borderRadius: 10,
              padding: 4,
            }}
          >
            {SCOPE_TABS.map((tab) => {
              const active = scope === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setScope(tab.key);
                    setLocalTasks([]);
                  }}
                  className="inline-flex items-center cursor-pointer"
                  style={{
                    gap: 6,
                    background: active ? "#FFFFFF" : "transparent",
                    color: active ? "var(--ink-1)" : "var(--ink-3)",
                    border: "none",
                    padding: "6px 11px",
                    borderRadius: 7,
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : undefined,
                  }}
                  aria-current={active ? "page" : undefined}
                >
                  {tab.Icon && <tab.Icon className="h-3 w-3" />}
                  <span>{t(`scope.${tab.key}`)}</span>
                  <span
                    style={{
                      background: active ? "var(--bg-subtle)" : "rgba(0,0,0,0.05)",
                      color: "var(--ink-2)",
                      padding: "1px 7px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {tab.key === "all"
                      ? tabCounts.all
                      : tab.key === "event"
                        ? tabCounts.event
                        : tabCounts.standalone}
                  </span>
                </button>
              );
            })}
          </div>
          )}

          {/* Filter (priority) */}
          <div ref={filterRef} className="relative">
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 cursor-pointer"
              style={{
                padding: "7px 11px",
                border: "1px solid var(--line-strong)",
                borderRadius: 8,
                background: "#FFFFFF",
                fontSize: 13,
                color: "var(--ink-1)",
              }}
              aria-expanded={filterOpen}
              aria-label={t("toolbar.openFilters")}
            >
              <RiFilter3Line className="h-3.5 w-3.5" />
              {prioFilter === "all"
                ? t("toolbar.filter")
                : t("toolbar.filterPrio", { prio: t(`prio.${prioFilter}`) })}
            </button>
            {filterOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  minWidth: 180,
                  background: "#FFFFFF",
                  border: "1px solid var(--line-1)",
                  borderRadius: 10,
                  boxShadow: "0 8px 24px rgba(15,16,18,.08)",
                  padding: 6,
                  zIndex: 30,
                }}
              >
                <div
                  className="uppercase text-[var(--ink-3)]"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: ".06em",
                    padding: "6px 10px 4px",
                  }}
                >
                  {t("toolbar.priority")}
                </div>
                {PRIO_OPTIONS.map((o) => {
                  const active = prioFilter === o.v;
                  return (
                    <button
                      key={o.v}
                      onClick={() => {
                        setPrioFilter(o.v);
                        setFilterOpen(false);
                      }}
                      className="w-full text-left cursor-pointer flex items-center"
                      style={{
                        padding: "8px 10px",
                        border: "none",
                        background: active ? "var(--bg-subtle)" : "transparent",
                        borderRadius: 6,
                        fontSize: 13,
                        color: "var(--ink-1)",
                      }}
                    >
                      <span className="flex-1">{o.l}</span>
                      {active && <RiCheckLine className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sort */}
          <div ref={sortRef} className="relative">
            <button
              onClick={() => setSortOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 cursor-pointer"
              style={{
                padding: "7px 11px",
                border: "1px solid var(--line-strong)",
                borderRadius: 8,
                background: "#FFFFFF",
                fontSize: 13,
                color: "var(--ink-1)",
              }}
              aria-expanded={sortOpen}
              aria-label={t("toolbar.openSort")}
            >
              <RiSortDesc className="h-3.5 w-3.5" />
              {t("toolbar.sortBy")}
            </button>
            {sortOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  minWidth: 200,
                  background: "#FFFFFF",
                  border: "1px solid var(--line-1)",
                  borderRadius: 10,
                  boxShadow: "0 8px 24px rgba(15,16,18,.08)",
                  padding: 6,
                  zIndex: 30,
                }}
              >
                <div
                  className="uppercase text-[var(--ink-3)]"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: ".06em",
                    padding: "6px 10px 4px",
                  }}
                >
                  {t("toolbar.sortBy")}
                </div>
                {SORT_OPTIONS.map((o) => {
                  const active = sortBy === o.v;
                  return (
                    <button
                      key={o.v}
                      onClick={() => {
                        setSortBy(o.v);
                        setSortOpen(false);
                      }}
                      className="w-full text-left cursor-pointer flex items-center"
                      style={{
                        padding: "8px 10px",
                        border: "none",
                        background: active ? "var(--bg-subtle)" : "transparent",
                        borderRadius: 6,
                        fontSize: 13,
                        color: "var(--ink-1)",
                      }}
                    >
                      <span className="flex-1">{o.l}</span>
                      {active && <RiCheckLine className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {canCreateTask && (
            <button
              onClick={() => openCreateDrawer()}
              className="inline-flex items-center gap-1.5 cursor-pointer ml-auto border-none transition-colors"
              style={{
                background: "var(--color-primary)",
                color: "var(--color-primary-ink)",
                padding: "8px 13px",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--color-primary-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "var(--color-primary)")
              }
              aria-label={t("toolbar.newTask")}
            >
              <RiAddLine className="h-3.5 w-3.5" />
              {t("toolbar.newTask")}
            </button>
          )}
        </div>

        {/* Kanban */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        ) : sortedDisplay.length === 0 && displayTasks.length === 0 ? (
          <div className="text-center py-12">
            <RiCheckboxBlankCircleLine
              className="mx-auto mb-3"
              style={{ width: 36, height: 36, color: "var(--ink-3)" }}
            />
            <h3
              style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }}
              className="mb-2"
            >
              {t("empty.title")}
            </h3>
            <p
              style={{ fontSize: 13, color: "var(--ink-3)" }}
              className="mb-4"
            >
              {scope === "standalone"
                ? t("empty.standalone")
                : scope === "event"
                  ? t("empty.event")
                  : t("empty.all")}
            </p>
            {canCreateTask && scope !== "event" && (
              <button
                onClick={() => openCreateDrawer()}
                className="inline-flex items-center gap-1.5 cursor-pointer border-none"
                style={{
                  background: "var(--color-primary)",
                  color: "var(--color-primary-ink)",
                  padding: "8px 13px",
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 8,
                }}
              >
                <RiAddLine className="h-3.5 w-3.5" />
                {t("toolbar.newTask")}
              </button>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={kanbanCollisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 14 }}>
              {COLUMN_ORDER.map((id) => (
                <TaskColumn
                  key={id}
                  id={id}
                  tasks={
                    sortedDisplay.filter((t) => t.status === id) as Task[]
                  }
                  onTaskClick={handleTaskClick}
                  onQuickAdd={handleQuickAdd}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask ? (
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid var(--line-1)",
                    borderRadius: 10,
                    padding: "14px 14px 12px",
                    boxShadow: "0 12px 24px rgba(0,0,0,0.18)",
                    transform: "rotate(2deg)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "var(--ink-1)",
                    }}
                  >
                    {activeTask.title}
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <TaskDrawer
        taskId={selectedTaskId}
        open={isDrawerOpen}
        onOpenChange={handleDrawerClose}
        onTaskDeleted={refetch}
        onTaskUpdated={refetch}
        onTaskCreated={handleTaskCreated}
        mode={drawerMode}
        readOnly={!canUpdateTask}
        initialData={
          isEventScoped
            ? { ...(drawerInitialData ?? {}), eventId }
            : drawerInitialData
        }
      />
    </div>
  );
}
