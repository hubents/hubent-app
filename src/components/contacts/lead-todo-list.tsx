"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  CheckmarkCircle02Icon,
  CircleIcon,
  Delete01Icon,
  PlusSignIcon,
  UserCircleIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { Av } from "@/components/ui/ds";

const IcoCheck   = hgIcon(CheckmarkCircle02Icon);
const IcoCircle  = hgIcon(CircleIcon);
const IcoDelete  = hgIcon(Delete01Icon);
const IcoPlus    = hgIcon(PlusSignIcon);
const IcoUser    = hgIcon(UserCircleIcon);
const IcoUnassign = hgIcon(Cancel01Icon);

interface Todo {
  id: number;
  text: string;
  done: boolean;
  sortOrder: number;
  assignedTo: string | null;
  assignedUserName: string | null;
  assignedUserImage: string | null;
}

interface Member {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface LeadTodoListProps {
  leadId: number;
}


export function LeadTodoList({ leadId }: LeadTodoListProps) {
  const [todos, setTodos]       = useState<Todo[]>([]);
  const [members, setMembers]   = useState<Member[]>([]);
  const [loading, setLoading]   = useState(true);
  const [addText, setAddText]   = useState("");
  const [adding, setAdding]     = useState(false);
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchTodos = async () => {
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/todos`);
      const data = await res.json();
      if (data.success) setTodos(data.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTodos(); }, [leadId]);

  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((d) => { if (d.success) setMembers(d.data?.members ?? []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (showInput) setTimeout(() => inputRef.current?.focus(), 50);
  }, [showInput]);

  const handleToggle = async (todo: Todo) => {
    const newDone = !todo.done;
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, done: newDone } : t));
    try {
      await fetch(`/api/crm/leads/${leadId}/todos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: todo.id, done: newDone }),
      });
    } catch {
      setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, done: todo.done } : t));
    }
  };

  const handleAssign = async (todo: Todo, userId: string | null) => {
    const member = userId ? members.find((m) => m.id === userId) ?? null : null;
    setTodos(prev => prev.map(t => t.id === todo.id
      ? { ...t, assignedTo: userId, assignedUserName: member?.name ?? null, assignedUserImage: member?.image ?? null }
      : t
    ));
    try {
      await fetch(`/api/crm/leads/${leadId}/todos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: todo.id, assignedTo: userId }),
      });
    } catch {
      fetchTodos();
    }
  };

  const handleAdd = async () => {
    const text = addText.trim();
    if (!text) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sortOrder: todos.length }),
      });
      const data = await res.json();
      if (data.success) {
        setTodos(prev => [...prev, data.data]);
        setAddText("");
        inputRef.current?.focus();
      }
    } catch {
      toast.error("Error al añadir");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (todo: Todo) => {
    setTodos(prev => prev.filter(t => t.id !== todo.id));
    try {
      await fetch(`/api/crm/leads/${leadId}/todos?todoId=${todo.id}`, { method: "DELETE" });
    } catch {
      setTodos(prev => [...prev, todo].sort((a, b) => a.sortOrder - b.sortOrder));
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") { setShowInput(false); setAddText(""); }
  };

  const done  = todos.filter(t => t.done).length;
  const total = todos.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--line-1)" }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-1)", letterSpacing: "-0.01em" }}>
            Checklist del lead
          </span>
          {total > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: pct === 100 ? "#065F46" : "var(--ink-3)",
              background: pct === 100 ? "#D1FAE5" : "var(--bg-subtle)",
              borderRadius: 999, padding: "1px 8px",
            }}>
              {done}/{total}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowInput(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "transparent", border: "none", cursor: "pointer",
            fontSize: 12, color: "var(--ink-3)", fontWeight: 500, padding: "3px 6px",
            borderRadius: 6,
          }}
        >
          <IcoPlus className="h-3.5 w-3.5" />
          Añadir
        </button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div style={{ height: 4, background: "var(--bg-subtle)", borderRadius: 999, overflow: "hidden", marginBottom: 10 }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: pct === 100 ? "#4DA363" : "var(--color-primary)",
            borderRadius: 999, transition: "width .3s ease",
          }} />
        </div>
      )}

      {/* Todo items */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[1, 2].map(i => (
            <div key={i} style={{ height: 30, borderRadius: 6, background: "var(--bg-subtle)", animation: "pulse 1.5s infinite" }} />
          ))}
        </div>
      ) : todos.length === 0 && !showInput ? (
        <div
          style={{ fontSize: 12, color: "var(--ink-3)", padding: "8px 0", textAlign: "center", cursor: "pointer" }}
          onClick={() => setShowInput(true)}
        >
          Sin tareas aún — <span style={{ color: "var(--color-primary)", fontWeight: 500 }}>añadir la primera</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {todos.map(todo => (
            <TodoRow
              key={todo.id}
              todo={todo}
              members={members}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onAssign={handleAssign}
            />
          ))}
        </div>
      )}

      {/* Add input */}
      {showInput && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
          <div style={{ width: 16, flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={addText}
            onChange={e => setAddText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nueva tarea… (Enter para añadir)"
            disabled={adding}
            style={{
              flex: 1, fontSize: 13, padding: "6px 10px", borderRadius: 7,
              border: "1px solid var(--color-primary)", outline: "none",
              background: "#FFFFFF", color: "var(--ink-1)",
            }}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !addText.trim()}
            style={{
              background: "var(--color-primary)", color: "#FFFFFF",
              border: "none", borderRadius: 7, padding: "6px 12px",
              fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              opacity: !addText.trim() ? 0.5 : 1,
            }}
          >
            Añadir
          </button>
        </div>
      )}
    </div>
  );
}

function TodoRow({ todo, members, onToggle, onDelete, onAssign }: {
  todo: Todo;
  members: Member[];
  onToggle: (t: Todo) => void;
  onDelete: (t: Todo) => void;
  onAssign: (t: Todo, userId: string | null) => void;
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
      setPickerPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setPickerOpen((v) => !v);
  };

  const assignedMember = todo.assignedTo ? members.find((m) => m.id === todo.assignedTo) : null;

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "5px 6px", borderRadius: 7,
        background: hover ? "var(--bg-subtle)" : "transparent",
        transition: "background .1s",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(todo)}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, display: "flex" }}
      >
        {todo.done
          ? <IcoCheck  className="h-4 w-4" style={{ color: "#4DA363" }} />
          : <IcoCircle className="h-4 w-4" style={{ color: "var(--ink-3)" }} />}
      </button>

      {/* Text */}
      <span style={{
        flex: 1, fontSize: 13,
        color: todo.done ? "var(--ink-3)" : "var(--ink-1)",
        textDecoration: todo.done ? "line-through" : "none",
        lineHeight: 1.4,
      }}>
        {todo.text}
      </span>

      {/* Assignee avatar / picker trigger */}
      <button
        ref={triggerRef}
        onClick={openPicker}
        title={assignedMember ? `Encargado: ${assignedMember.name || assignedMember.email}` : "Asignar encargado"}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0,
          display: "flex", alignItems: "center",
          opacity: (hover || !!assignedMember) ? 1 : 0,
          transition: "opacity .1s",
        }}
      >
        {assignedMember
          ? <MemberAvatar member={assignedMember} size={20} />
          : <IcoUser className="h-4 w-4" style={{ color: "var(--ink-3)" }} />
        }
      </button>

      {/* Picker dropdown — fixed so it escapes overflow:hidden parents */}
      {pickerOpen && (
        <div
          ref={pickerRef}
          style={{
            position: "fixed",
            top: pickerPos.top,
            right: pickerPos.right,
            zIndex: 9999,
            background: "#FFFFFF", border: "1px solid var(--line-1)",
            borderRadius: 10, padding: 6, minWidth: 190,
            boxShadow: "0 8px 24px rgba(0,0,0,.14)",
          }}
        >
          {/* Unassign option */}
          {todo.assignedTo && (
            <button
              onClick={() => { onAssign(todo, null); setPickerOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "6px 8px", borderRadius: 7, border: "none",
                background: "transparent", cursor: "pointer", fontSize: 12.5,
                color: "var(--ink-3)", fontFamily: "inherit",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <IcoUnassign className="h-3.5 w-3.5" style={{ flexShrink: 0 }} />
              Sin encargado
            </button>
          )}
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => { onAssign(todo, m.id); setPickerOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "6px 8px", borderRadius: 7, border: "none",
                background: todo.assignedTo === m.id ? "var(--bg-subtle)" : "transparent",
                cursor: "pointer", fontSize: 12.5,
                color: "var(--ink-1)", fontFamily: "inherit",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = todo.assignedTo === m.id ? "var(--bg-subtle)" : "transparent")}
            >
              <MemberAvatar member={m} size={22} />
              <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {m.name || m.email}
              </span>
              {todo.assignedTo === m.id && (
                <span style={{ fontSize: 10, color: "#17A95C", fontWeight: 700 }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Delete */}
      {hover && (
        <button
          onClick={() => onDelete(todo)}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: 0,
            display: "flex", color: "var(--ink-3)", opacity: 0.6, flexShrink: 0,
          }}
        >
          <IcoDelete className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function MemberAvatar({ member, size = 20 }: { member: Member; size?: number }) {
  return (
    <Av
      src={member.image}
      name={member.name ?? member.email}
      seed={member.id}
      size={size}
      style={{ flexShrink: 0 }}
    />
  );
}
