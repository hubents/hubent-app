"use client";

import React, { useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiUserLine,
  RiCalendarLine,
  RiFlag2Line,
  RiYoutubeLine,
  RiAddLine,
  RiDeleteBinLine,
  RiGroupLine,
  RiCheckboxCircleLine,
  RiCheckLine,
  RiArrowDownSLine,
  RiSignalWifi1Line,
  RiSignalWifi2Line,
  RiSignalWifiLine,
  RiBold,
  RiItalic,
  RiUnderline,
  RiStrikethrough,
  RiListUnordered,
  RiListOrdered,
  RiCheckboxLine,
  RiLink,
} from "@remixicon/react";
import { TaskYoutubeEmbed } from "./task-youtube-embed";
import { ParticipantSelector } from "./participant-selector";
import { Av } from "@/components/ui/ds";
import { hgIcon } from "@/components/ui/hg-icon";
import { UserCircleIcon } from "@hugeicons/core-free-icons";
const IcoUserCircle = hgIcon(UserCircleIcon);

// ─── Prototype style helpers (match TK_STYLES from tasks.jsx) ───
const labelStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12.5,
  fontWeight: 500,
  color: "var(--ink-2)",
  marginBottom: 7,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--line-1)",
  borderRadius: 10,
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  background: "white",
  color: "var(--ink-1)",
  boxSizing: "border-box",
};

const selectFieldStyle: React.CSSProperties = {
  ...inputStyle,
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
};

const headerBtnStyle = (bg: string, fg: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  background: bg,
  color: fg,
  border: "none",
  padding: "6px 11px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
});

interface TaskDetail {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string | null;
  dueDate: string | null;
  eventId: number | null;
  assignedTo: string | null;
  assignedUserName?: string | null;
}

interface TaskParticipant {
  id: number;
  userId: string | null;
  vendorId: number | null;
  contactId?: number | null;
  userName?: string | null;
  userEmail?: string | null;
  userImage?: string | null;
  vendorName?: string | null;
  contactName?: string | null;
  name?: string | null;
  isVendor?: boolean;
  isContact?: boolean;
  type: string;
  canEdit: boolean;
  canComment: boolean;
}

interface TaskVideo {
  id: number;
  youtubeUrl: string;
  title: string | null;
}

interface TaskHtmlContent {
  taskId: number;
  content: string;
}

interface ChecklistAssignee {
  id: number;
  participantId: number;
  type: string | null;
  name: string;
  isUser: boolean;
  isVendor: boolean;
  isContact: boolean;
  assignedAt: string | null;
}

interface TaskChecklistItem {
  id: number;
  taskId: number;
  title: string;
  isCompleted: boolean;
  dueDate: string | null;
  sortOrder: number;
  completedAt: string | null;
  completedBy: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  assignees: ChecklistAssignee[];
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface TaskGeneralTabProps {
  task: TaskDetail | null;
  participants: TaskParticipant[];
  videos: TaskVideo[];
  htmlContent: TaskHtmlContent | null;
  checklistItems: TaskChecklistItem[];
  loading: boolean;
  readOnly?: boolean;
  onUpdateTask: (updates: Record<string, unknown>) => Promise<unknown>;
  onAddVideo: (data: { youtubeUrl: string; title?: string }) => Promise<unknown>;
  onDeleteVideo: (videoId: number) => Promise<boolean>;
  onSaveHtmlContent: (content: string) => Promise<unknown>;
  onAddParticipant: (data: { userId?: string; vendorId?: number; contactId?: number; providerOrgId?: number; type: string }) => Promise<unknown>;
  onRemoveParticipant: (participantId: number) => Promise<boolean>;
  onAddChecklistItem: (data: { title: string; dueDate?: string; assigneeIds?: number[] }) => Promise<unknown>;
  onUpdateChecklistItem: (itemId: number, updates: { title?: string; isCompleted?: boolean; dueDate?: string | null }) => Promise<unknown>;
  onToggleChecklistItem: (itemId: number, isCompleted: boolean) => Promise<unknown>;
  onDeleteChecklistItem: (itemId: number) => Promise<boolean>;
  onAddChecklistAssignee: (itemId: number, participantId: number) => Promise<unknown>;
  onRemoveChecklistAssignee: (itemId: number, participantId: number) => Promise<boolean>;
}

// ─── Categories with prototype-style colored dot ───
const CATEGORIES = [
  { value: "general",   label: "General",   dot: "#6B7A85" },
  { value: "evento",    label: "Evento",    dot: "#E86A55" },
  { value: "proveedor", label: "Proveedor", dot: "#5B8FE8" },
  { value: "cliente",   label: "Cliente",   dot: "#4DA363" },
  { value: "pago",      label: "Pago",      dot: "#D9822B" },
];

// ─── Priorities with signal icon + colored text ───
const PRIORITIES = [
  { value: "low",    label: "Baja",  color: "#6E7781", Icon: RiSignalWifi1Line },
  { value: "medium", label: "Media", color: "#D9822B", Icon: RiSignalWifi2Line },
  { value: "high",   label: "Alta",  color: "#C0392B", Icon: RiSignalWifiLine },
];

// ─── Custom dropdown — looks like the prototype's static select ───
function PrototypeSelect<T extends string>({
  value,
  onChange,
  options,
  prefix,
  disabled,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; prefix?: React.ReactNode }>;
  prefix?: React.ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const id = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handler);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);
  const triggerPrefix = current?.prefix ?? prefix;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        style={{
          ...selectFieldStyle,
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {triggerPrefix}
        <span style={{ flex: 1, textAlign: "left", color: current ? "var(--ink-1)" : "var(--ink-3)" }}>
          {current?.label || "Seleccionar..."}
        </span>
        <RiArrowDownSLine className="h-3.5 w-3.5" style={{ color: "var(--ink-3)" }} />
      </button>
      {open && !disabled && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "white",
            border: "1px solid var(--line-1)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(15,16,18,.08)",
            padding: 6,
            zIndex: 50,
            maxHeight: 280,
            overflowY: "auto",
          }}
          role="listbox"
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  border: "none",
                  background: active ? "var(--bg-subtle)" : "transparent",
                  borderRadius: 6,
                  fontSize: 13,
                  color: "var(--ink-1)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
                role="option"
                aria-selected={active}
              >
                {o.prefix}
                <span style={{ flex: 1 }}>{o.label}</span>
                {active && <RiCheckLine className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TaskGeneralTab({
  task,
  participants,
  videos,
  htmlContent,
  checklistItems,
  loading,
  onUpdateTask,
  onAddVideo,
  onDeleteVideo,
  onSaveHtmlContent,
  onAddParticipant,
  onRemoveParticipant,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  onAddChecklistAssignee,
  onRemoveChecklistAssignee,
  readOnly = false,
}: TaskGeneralTabProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [addingVideo, setAddingVideo] = useState(false);
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // To-Do quick add
  const [todoInput, setTodoInput] = useState("");
  const [addingTodo, setAddingTodo] = useState(false);

  // Description local state (auto-saves on blur)
  const [descValue, setDescValue] = useState(htmlContent?.content || "");
  const [descSaving, setDescSaving] = useState(false);

  useEffect(() => {
    setDescValue(htmlContent?.content || "");
  }, [htmlContent?.content]);

  // Fetch team members for assignment
  useEffect(() => {
    async function fetchData() {
      setLoadingMembers(true);
      try {
        const teamRes = await fetch("/api/team");
        const teamData = await teamRes.json();
        if (teamData.success && teamData.data?.members) setTeamMembers(teamData.data.members);
        else if (teamData.success && Array.isArray(teamData.data)) setTeamMembers(teamData.data);
        else if (teamData.members) setTeamMembers(teamData.members);
        else setTeamMembers([]);
      } catch (e) {
        console.error("Failed to fetch team:", e);
        setTeamMembers([]);
      } finally {
        setLoadingMembers(false);
      }
    }
    fetchData();
  }, []);

  const handleAddVideo = async () => {
    if (!youtubeUrl.trim()) return;
    setAddingVideo(true);
    try {
      await onAddVideo({ youtubeUrl: youtubeUrl.trim() });
      setYoutubeUrl("");
    } finally {
      setAddingVideo(false);
    }
  };

  const handleAddParticipant = async (userId: string) => {
    if (!userId || userId.startsWith("__") || addingParticipant) return;
    setAddingParticipant(true);
    try {
      await onAddParticipant({ userId, type: "planner" });
    } finally {
      setAddingParticipant(false);
    }
  };

  const handleAddVendorParticipant = async (providerOrgIdStr: string) => {
    if (!providerOrgIdStr || providerOrgIdStr.startsWith("__") || addingParticipant) return;
    const id = parseInt(providerOrgIdStr, 10);
    if (isNaN(id)) return;
    setAddingParticipant(true);
    try {
      await onAddParticipant({ providerOrgId: id, type: "vendor" });
    } finally {
      setAddingParticipant(false);
    }
  };

  const handleAddContactParticipant = async (contactId: string) => {
    if (!contactId || contactId.startsWith("__") || addingParticipant) return;
    const id = parseInt(contactId, 10);
    if (isNaN(id)) return;
    setAddingParticipant(true);
    try {
      await onAddParticipant({ contactId: id, type: "contact" });
    } finally {
      setAddingParticipant(false);
    }
  };

  const handleAddTodo = async () => {
    const text = todoInput.trim();
    if (!text || addingTodo) return;
    setAddingTodo(true);
    try {
      await onAddChecklistItem({ title: text });
      setTodoInput("");
    } finally {
      setAddingTodo(false);
    }
  };

  const handleSaveDesc = async () => {
    if (descValue === (htmlContent?.content || "")) return;
    setDescSaving(true);
    try {
      await onSaveHtmlContent(descValue);
    } finally {
      setDescSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 22 }}>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-32 w-full mt-6" />
      </div>
    );
  }

  const sharedWithHost = !!(task && (task as unknown as Record<string, unknown>).sharedWithHost);
  const safeParticipants = participants || [];
  const completedCount = checklistItems.filter((c) => c.isCompleted).length;
  const assignedMember = teamMembers.find((m) => m.id === task?.assignedTo);

  // Category options with colored dot prefix
  const categoryOptions = CATEGORIES.map((c) => ({
    value: c.value,
    label: c.label,
    prefix: (
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: c.dot,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
    ),
  }));

  // Priority options with signal icon
  const priorityOptions = PRIORITIES.map((p) => ({
    value: p.value,
    label: p.label,
    prefix: <p.Icon className="h-3.5 w-3.5" style={{ color: p.color }} />,
  }));

  // Assignee options: "Sin asignar" + team members
  const assigneeOptions = [
    {
      value: "__unassigned__",
      label: "Sin asignar",
      prefix: (
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "var(--bg-subtle)",
            color: "var(--ink-3)",
            fontSize: 10,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          —
        </span>
      ),
    },
    ...teamMembers.map((m) => ({
      value: m.id,
      label: m.name || m.email,
      prefix: <Av src={m.image} name={m.name || m.email} seed={m.id} size={22} style={{ flexShrink: 0 }} />,
    })),
  ];

  return (
    <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 820 }}>
      {/* ── Visible para el organizador (solo cuando es una tarea con eventId) ── */}
      {task && task.eventId && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-1)" }}>
              Visible para el organizador
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>
              Permite al planner del evento ver esta tarea
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={sharedWithHost}
            disabled={readOnly}
            onClick={() => onUpdateTask({ sharedWithHost: !sharedWithHost })}
            style={{
              position: "relative",
              width: 40,
              height: 22,
              borderRadius: 999,
              border: "none",
              padding: 0,
              cursor: readOnly ? "not-allowed" : "pointer",
              background: sharedWithHost ? "var(--color-primary)" : "var(--line-strong)",
              transition: "background 120ms ease",
              opacity: readOnly ? 0.55 : 1,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 2,
                left: sharedWithHost ? 20 : 2,
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "white",
                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                transition: "left 120ms ease",
              }}
            />
          </button>
        </div>
      )}

      {/* ── 2x2 grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Asignado a */}
        <div>
          <label style={labelStyle}>
            <RiUserLine className="h-3 w-3" /> Asignado a
          </label>
          <PrototypeSelect
            value={task?.assignedTo || "__unassigned__"}
            onChange={(v) =>
              onUpdateTask({ assignedTo: v === "__unassigned__" ? null : v })
            }
            options={assigneeOptions}
            disabled={readOnly || loadingMembers}
            prefix={
              <Av
                src={assignedMember?.image}
                name={assignedMember?.name || task?.assignedUserName || ""}
                seed={assignedMember?.id || task?.assignedTo || undefined}
                size={22}
                style={{ flexShrink: 0 }}
              />
            }
          />
        </div>

        {/* Categoría */}
        <div>
          <label style={labelStyle}>Categoría</label>
          <PrototypeSelect
            value={task?.category || "general"}
            onChange={(v) => onUpdateTask({ category: v })}
            options={categoryOptions}
            disabled={readOnly}
          />
        </div>

        {/* Fecha */}
        <div>
          <label style={labelStyle}>
            <RiCalendarLine className="h-3 w-3" /> Fecha
          </label>
          <input
            type="date"
            value={(() => {
              if (!task?.dueDate) return "";
              const d = new Date(task.dueDate);
              return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
            })()}
            onChange={(e) =>
              onUpdateTask({ dueDate: e.target.value ? new Date(e.target.value) : null })
            }
            disabled={readOnly}
            style={inputStyle}
          />
        </div>

        {/* Prioridad */}
        <div>
          <label style={labelStyle}>
            <RiFlag2Line className="h-3 w-3" /> Prioridad
          </label>
          <PrototypeSelect
            value={task?.priority || "medium"}
            onChange={(v) => onUpdateTask({ priority: v })}
            options={priorityOptions}
            disabled={readOnly}
          />
        </div>
      </div>

      {/* ── Participantes ── */}
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>
            <RiGroupLine className="h-3 w-3" /> Participantes{" "}
            <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>
              ({safeParticipants.length})
            </span>
          </label>
          {!readOnly && (
            <div style={{ marginLeft: "auto" }}>
              <ParticipantSelector
                teamMembers={teamMembers}
                excludedMemberIds={safeParticipants
                  .filter((p) => p.userId)
                  .map((p) => p.userId!)}
                excludedVendorIds={[]}
                excludedContactIds={safeParticipants
                  .filter((p) => (p as unknown as Record<string, unknown>).contactId)
                  .map((p) => (p as unknown as Record<string, unknown>).contactId as number)}
                onAddMember={handleAddParticipant}
                onAddVendor={(id) => handleAddVendorParticipant(id.toString())}
                onAddContact={(id) => handleAddContactParticipant(id.toString())}
                disabled={addingParticipant || loadingMembers}
              />
            </div>
          )}
        </div>

        {safeParticipants.length === 0 ? (
          <div
            style={{
              border: "1px dashed var(--line-1)",
              borderRadius: 10,
              padding: 14,
              textAlign: "center",
              color: "var(--ink-3)",
              fontSize: 12.5,
            }}
          >
            Sin participantes — pulsa Agregar para invitar a un proveedor
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {safeParticipants.map((p) => {
              const isContact =
                p.isContact || p.type === "contact" || !!(p as unknown as Record<string, unknown>).contactId;
              const isVendor = p.isVendor || p.type === "vendor" || !!p.vendorId;
              const displayName =
                p.contactName || p.name || p.userName || p.userEmail || p.vendorName || "—";
              const role = isContact ? "Contacto" : isVendor ? "Proveedor" : "Miembro";

              return (
                <div
                  key={p.id}
                  style={{
                    background: "white",
                    border: "1px solid var(--line-1)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <Av
                    src={p.userImage}
                    name={displayName}
                    seed={p.userId || p.vendorId || p.id}
                    size={32}
                    style={{ borderRadius: 8, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--ink-1)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {displayName}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{role}</div>
                  </div>
                  <span
                    style={{
                      background: "#DCEEDD",
                      color: "#2C6B4A",
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 10.5,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    Invitado
                  </span>
                  {!readOnly && (
                    <button
                      onClick={() => onRemoveParticipant(p.id)}
                      className="icon-btn"
                      title="Quitar participante"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: "none",
                        background: "transparent",
                        color: "var(--ink-3)",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <RiDeleteBinLine className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Link de Youtube ── */}
      <div>
        <label style={labelStyle}>
          <RiYoutubeLine className="h-3 w-3" style={{ color: "#E03A3A" }} /> Link de Youtube
        </label>
        {!readOnly && (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              type="button"
              onClick={handleAddVideo}
              disabled={addingVideo || !youtubeUrl.trim()}
              className="btn btn--primary btn--sm"
              style={{
                opacity: addingVideo || !youtubeUrl.trim() ? 0.55 : 1,
                cursor: addingVideo || !youtubeUrl.trim() ? "not-allowed" : "pointer",
              }}
            >
              {addingVideo ? "..." : "Añadir"}
            </button>
          </div>
        )}
        {videos.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            {videos.map((video) => (
              <div key={video.id} style={{ position: "relative" }}>
                <TaskYoutubeEmbed url={video.youtubeUrl} />
                {!readOnly && (
                  <button
                    onClick={() => onDeleteVideo(video.id)}
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      border: "none",
                      background: "rgba(0,0,0,0.6)",
                      color: "white",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="Eliminar video"
                  >
                    <RiDeleteBinLine className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Descripción ── */}
      <div>
        <label style={labelStyle}>Descripción</label>
        <div
          style={{
            border: "1px solid var(--line-1)",
            borderRadius: 10,
            overflow: "hidden",
            background: "white",
          }}
        >
          {!readOnly && (
            <div
              style={{
                display: "flex",
                gap: 2,
                padding: "6px 8px",
                borderBottom: "1px solid var(--line-2)",
                background: "var(--bg-subtle)",
              }}
            >
              <RteBtn title="Negrita" onClick={() => insertAround(setDescValue, "**")}>
                <RiBold className="h-3.5 w-3.5" />
              </RteBtn>
              <RteBtn title="Cursiva" onClick={() => insertAround(setDescValue, "*")}>
                <RiItalic className="h-3.5 w-3.5" />
              </RteBtn>
              <RteBtn title="Subrayado" onClick={() => insertAround(setDescValue, "__")}>
                <RiUnderline className="h-3.5 w-3.5" />
              </RteBtn>
              <RteBtn title="Tachado" onClick={() => insertAround(setDescValue, "~~")}>
                <RiStrikethrough className="h-3.5 w-3.5" />
              </RteBtn>
              <span style={{ width: 1, background: "var(--line-1)", margin: "4px 4px" }} />
              <RteBtn title="Lista" onClick={() => insertLine(setDescValue, "• ")}>
                <RiListUnordered className="h-3.5 w-3.5" />
              </RteBtn>
              <RteBtn title="Lista numerada" onClick={() => insertLine(setDescValue, "1. ")}>
                <RiListOrdered className="h-3.5 w-3.5" />
              </RteBtn>
              <RteBtn title="Checkbox" onClick={() => insertLine(setDescValue, "☐ ")}>
                <RiCheckboxLine className="h-3.5 w-3.5" />
              </RteBtn>
              <span style={{ width: 1, background: "var(--line-1)", margin: "4px 4px" }} />
              <RteBtn title="Enlace" onClick={() => insertAround(setDescValue, "[", "](url)")}>
                <RiLink className="h-3.5 w-3.5" />
              </RteBtn>
            </div>
          )}
          <textarea
            value={descValue}
            onChange={(e) => setDescValue(e.target.value)}
            onBlur={handleSaveDesc}
            readOnly={readOnly}
            placeholder={
              readOnly ? "Sin descripción" : "Escribe la descripción de la tarea..."
            }
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              resize: readOnly ? "none" : "vertical",
              padding: "12px 14px",
              fontSize: 13,
              fontFamily: "inherit",
              minHeight: 140,
              background: "white",
              color: "var(--ink-1)",
              cursor: readOnly ? "default" : "text",
            }}
          />
        </div>
        {descSaving && (
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6 }}>Guardando…</div>
        )}
      </div>

      {/* ── To-Do List ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>
            <RiCheckboxCircleLine className="h-3 w-3" /> To-Do List
            {checklistItems.length > 0 && (
              <span style={{ marginLeft: 6, color: "var(--ink-3)", fontWeight: 400 }}>
                {completedCount}/{checklistItems.length}
              </span>
            )}
          </label>
        </div>

        {!readOnly && (
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              type="text"
              placeholder="Agregar nuevo ítem..."
              value={todoInput}
              onChange={(e) => setTodoInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTodo()}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              type="button"
              onClick={handleAddTodo}
              disabled={!todoInput.trim() || addingTodo}
              style={{
                ...headerBtnStyle("var(--ink-1)", "white"),
                opacity: !todoInput.trim() || addingTodo ? 0.55 : 1,
                cursor: !todoInput.trim() || addingTodo ? "not-allowed" : "pointer",
              }}
            >
              <RiAddLine className="h-3 w-3" /> Agregar
            </button>
          </div>
        )}

        {checklistItems.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "var(--ink-3)",
              padding: "12px 0",
            }}
          >
            No hay ítems en el checklist. Agrega el primero arriba.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {checklistItems.map((item) => (
              <ChecklistRow
                key={item.id}
                item={item}
                participants={participants}
                readOnly={readOnly}
                onToggle={() => onToggleChecklistItem(item.id, !item.isCompleted)}
                onDelete={() => onDeleteChecklistItem(item.id)}
                onAddAssignee={(participantId) => onAddChecklistAssignee(item.id, participantId)}
                onRemoveAssignee={(participantId) => onRemoveChecklistAssignee(item.id, participantId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RTE button (toolbar icon) ───
function RteBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        border: "none",
        background: "transparent",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        color: "var(--ink-2)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ─── Markdown insert helpers (operate on the live textarea) ───
function getDescTextarea(): HTMLTextAreaElement | null {
  // The description textarea is the only one inside the rounded RTE container in this tab.
  // Match by its placeholder is robust enough for this scoped tab.
  return document.querySelector<HTMLTextAreaElement>(
    'textarea[placeholder="Escribe la descripción de la tarea..."]',
  );
}

function insertAround(
  setValue: React.Dispatch<React.SetStateAction<string>>,
  prefix: string,
  suffix: string = prefix,
) {
  const ta = getDescTextarea();
  if (!ta) return;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  setValue((v) => {
    const sel = v.substring(start, end);
    const next = v.substring(0, start) + prefix + sel + suffix + v.substring(end);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
    return next;
  });
}

function insertLine(
  setValue: React.Dispatch<React.SetStateAction<string>>,
  prefix: string,
) {
  const ta = getDescTextarea();
  if (!ta) return;
  const start = ta.selectionStart;
  setValue((v) => {
    const lineStart = v.lastIndexOf("\n", start - 1) + 1;
    const next = v.substring(0, lineStart) + prefix + v.substring(lineStart);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
    return next;
  });
}

// ─── Checklist row with assignee picker ───────────────────────────────────────

function ParticipantAvatar({ name, image, id, size = 20 }: { name: string; image?: string | null; id: string | number; size?: number }) {
  return (
    <Av
      src={image}
      name={name}
      seed={id}
      size={size}
      style={{ flexShrink: 0 }}
    />
  );
}

function ChecklistRow({
  item, participants, readOnly,
  onToggle, onDelete, onAddAssignee, onRemoveAssignee,
}: {
  item: TaskChecklistItem;
  participants: TaskParticipant[];
  readOnly: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onAddAssignee: (participantId: number) => void;
  onRemoveAssignee: (participantId: number) => void;
}) {
  const [hover, setHover] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const h = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [pickerOpen]);

  const openPicker = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPickerPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setPickerOpen((v) => !v);
  };

  const assignedIds = new Set(item.assignees.map((a) => a.participantId));
  const available = participants.filter((p) => !assignedIds.has(p.id));

  const getParticipantName = (p: TaskParticipant) =>
    p.userName || p.vendorName || p.contactName || p.name || "Sin nombre";

  const getParticipantImage = (p: TaskParticipant) => p.userImage || null;

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 10px",
        background: item.isCompleted ? "var(--bg-subtle)" : "white",
        border: "1px solid var(--line-1)", borderRadius: 8,
        opacity: item.isCompleted ? 0.75 : 1,
        transition: "background .1s",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={onToggle}
        disabled={readOnly}
        style={{
          width: 18, height: 18, borderRadius: 4, flexShrink: 0, padding: 0,
          cursor: readOnly ? "not-allowed" : "pointer",
          border: `2px solid ${item.isCompleted ? "var(--color-primary)" : "var(--line-strong)"}`,
          background: item.isCompleted ? "var(--color-primary)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {item.isCompleted && <RiCheckLine className="h-3 w-3" style={{ color: "white" }} />}
      </button>

      {/* Title */}
      <span style={{
        flex: 1, fontSize: 13, lineHeight: 1.4,
        textDecoration: item.isCompleted ? "line-through" : "none",
        color: item.isCompleted ? "var(--ink-3)" : "var(--ink-1)",
      }}>
        {item.title}
      </span>

      {/* Current assignees */}
      {item.assignees.length > 0 && (
        <div style={{ display: "flex", gap: 2 }}>
          {item.assignees.slice(0, 3).map((a) => (
            <div
              key={a.id}
              title={a.name}
              onClick={readOnly ? undefined : () => onRemoveAssignee(a.participantId)}
              style={{ cursor: readOnly ? "default" : "pointer" }}
            >
              <ParticipantAvatar name={a.name} id={a.participantId} size={20} />
            </div>
          ))}
          {item.assignees.length > 3 && (
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--bg-subtle)", border: "1px solid var(--line-1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--ink-3)", fontWeight: 600 }}>
              +{item.assignees.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Assign button */}
      {!readOnly && (
        <button
          ref={triggerRef}
          onClick={openPicker}
          title="Asignar encargado"
          style={{
            background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0,
            display: "flex", alignItems: "center",
            opacity: (hover || item.assignees.length > 0) ? 1 : 0,
            transition: "opacity .1s",
          }}
        >
          <IcoUserCircle className="h-4 w-4" style={{ color: "var(--ink-3)" }} />
        </button>
      )}

      {/* Delete */}
      {!readOnly && hover && (
        <button
          onClick={onDelete}
          style={{
            width: 24, height: 24, borderRadius: 6, border: "none",
            background: "transparent", color: "var(--ink-3)",
            cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <RiDeleteBinLine className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Picker dropdown — fixed to escape overflow:hidden */}
      {pickerOpen && (
        <div
          ref={pickerRef}
          style={{
            position: "fixed", top: pickerPos.top, right: pickerPos.right, zIndex: 9999,
            background: "#FFFFFF", border: "1px solid var(--line-1)",
            borderRadius: 10, padding: 6, minWidth: 200,
            boxShadow: "0 8px 24px rgba(0,0,0,.14)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", padding: "4px 8px 6px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Asignar encargado
          </div>
          {/* Currently assigned — click to remove */}
          {item.assignees.map((a) => (
            <button
              key={a.id}
              onClick={() => { onRemoveAssignee(a.participantId); setPickerOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "6px 8px", borderRadius: 7, border: "none",
                background: "var(--bg-subtle)", cursor: "pointer", fontSize: 12.5,
                color: "var(--ink-1)", fontFamily: "inherit", marginBottom: 2,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#FEE2E2")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
              title="Clic para quitar"
            >
              <ParticipantAvatar name={a.name} id={a.participantId} size={22} />
              <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
              <span style={{ fontSize: 10, color: "#17A95C", fontWeight: 700 }}>✓</span>
            </button>
          ))}
          {/* Available participants */}
          {available.length === 0 && item.assignees.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--ink-3)", padding: "6px 8px" }}>
              No hay participantes en esta tarea
            </div>
          ) : available.map((p) => (
            <button
              key={p.id}
              onClick={() => { onAddAssignee(p.id); setPickerOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "6px 8px", borderRadius: 7, border: "none",
                background: "transparent", cursor: "pointer", fontSize: 12.5,
                color: "var(--ink-1)", fontFamily: "inherit",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <ParticipantAvatar
                name={getParticipantName(p)}
                image={getParticipantImage(p)}
                id={p.userId || p.vendorId || p.id}
                size={22}
              />
              <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {getParticipantName(p)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
