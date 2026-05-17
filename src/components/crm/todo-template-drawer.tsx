"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  Cancel01Icon,
  Delete01Icon,
  PlusSignIcon,
  Task01Icon,
  DragDropVerticalIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

const IcoX      = hgIcon(Cancel01Icon);
const IcoDelete = hgIcon(Delete01Icon);
const IcoPlus   = hgIcon(PlusSignIcon);
const IcoTask   = hgIcon(Task01Icon);
const IcoDrag   = hgIcon(DragDropVerticalIcon);

interface Template {
  id: number;
  text: string;
  sortOrder: number;
}

interface TodoTemplateDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function TodoTemplateDrawer({ open, onOpenChange }: TodoTemplateDrawerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading]     = useState(true);
  const [addText, setAddText]     = useState("");
  const [adding, setAdding]       = useState(false);
  const [editId, setEditId]       = useState<number | null>(null);
  const [editText, setEditText]   = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchTemplates = async () => {
    try {
      const res  = await fetch("/api/crm/leads/todo-templates");
      const data = await res.json();
      if (data.success) setTemplates(data.data ?? []);
    } catch {
      toast.error("Error al cargar plantilla");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open) { setLoading(true); fetchTemplates(); } }, [open]);

  const handleAdd = async () => {
    const text = addText.trim();
    if (!text) return;
    setAdding(true);
    try {
      const res  = await fetch("/api/crm/leads/todo-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sortOrder: templates.length }),
      });
      const data = await res.json();
      if (data.success) {
        setTemplates(prev => [...prev, data.data]);
        setAddText("");
        inputRef.current?.focus();
      }
    } catch {
      toast.error("Error al añadir");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    try {
      await fetch(`/api/crm/leads/todo-templates?id=${id}`, { method: "DELETE" });
    } catch {
      toast.error("Error al eliminar");
      fetchTemplates();
    }
  };

  const startEdit = (t: Template) => { setEditId(t.id); setEditText(t.text); };

  const saveEdit = async () => {
    if (!editId) return;
    const text = editText.trim();
    if (!text) { setEditId(null); return; }
    setTemplates(prev => prev.map(t => t.id === editId ? { ...t, text } : t));
    setEditId(null);
    try {
      await fetch("/api/crm/leads/todo-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, text }),
      });
    } catch {
      toast.error("Error al guardar");
      fetchTemplates();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAdd();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="overflow-hidden bg-white border-0 [&>button]:hidden flex flex-col"
        style={{ width: "min(480px, 100vw)", maxWidth: "100vw", padding: 0, gap: 0 }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--line-1)" }}
        >
          <div className="flex items-center gap-2.5">
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IcoTask className="h-4 w-4" style={{ color: "#3730A3" }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-1)", letterSpacing: "-0.01em" }}>
                Plantilla de checklist
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 1 }}>
                Se aplica automáticamente a cada nuevo lead
              </div>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center justify-center h-8 w-8 rounded-[7px] cursor-pointer border-none bg-transparent hover:bg-[var(--bg-hover)]"
          >
            <IcoX className="h-4 w-4 text-[var(--ink-3)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "20px 24px" }}>
          {/* Explanation */}
          <div style={{
            background: "#F0F7FF", border: "1px solid #C7DDF5", borderRadius: 10,
            padding: "12px 14px", fontSize: 12.5, color: "#1E40AF", lineHeight: 1.5,
            marginBottom: 20,
          }}>
            Define aquí los pasos estándar que debe seguir tu equipo con cada lead.
            Cuando se cree un nuevo lead, estas tareas se añadirán automáticamente.
          </div>

          {/* Template items */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 44, borderRadius: 8, background: "var(--bg-subtle)", animation: "pulse 1.5s infinite" }} />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--ink-3)", fontSize: 13 }}>
              No hay pasos en la plantilla aún
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {templates.map((t, i) => (
                <TemplateRow
                  key={t.id}
                  item={t}
                  index={i + 1}
                  isEditing={editId === t.id}
                  editText={editText}
                  onEditTextChange={setEditText}
                  onStartEdit={startEdit}
                  onSaveEdit={saveEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Add input */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={inputRef}
              value={addText}
              onChange={e => setAddText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Añadir paso… (Enter)"
              disabled={adding}
              style={{
                flex: 1, fontSize: 13, padding: "8px 12px", borderRadius: 8,
                border: "1px solid var(--line-strong)", outline: "none",
                background: "#FFFFFF", color: "var(--ink-1)",
              }}
            />
            <button
              onClick={handleAdd}
              disabled={adding || !addText.trim()}
              style={{
                background: "var(--color-primary)", color: "var(--color-primary-ink)",
                border: "none", borderRadius: 8, padding: "8px 14px",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 5,
                opacity: !addText.trim() ? 0.5 : 1,
              }}
            >
              <IcoPlus className="h-3.5 w-3.5" />
              Añadir
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TemplateRow({ item, index, isEditing, editText, onEditTextChange, onStartEdit, onSaveEdit, onDelete }: {
  item: Template;
  index: number;
  isEditing: boolean;
  editText: string;
  onEditTextChange: (v: string) => void;
  onStartEdit: (t: Template) => void;
  onSaveEdit: () => void;
  onDelete: (id: number) => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 12px", borderRadius: 8,
        background: hover ? "var(--bg-subtle)" : "#FAFAFA",
        border: "1px solid var(--line-1)",
        transition: "background .1s",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <IcoDrag className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--ink-3)", opacity: 0.4 }} />
      <span style={{
        width: 20, height: 20, borderRadius: "50%",
        background: "var(--bg-subtle)", fontSize: 10.5, fontWeight: 700,
        color: "var(--ink-3)", display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>{index}</span>

      {isEditing ? (
        <input
          autoFocus
          value={editText}
          onChange={e => onEditTextChange(e.target.value)}
          onBlur={onSaveEdit}
          onKeyDown={e => { if (e.key === "Enter") onSaveEdit(); if (e.key === "Escape") onSaveEdit(); }}
          style={{ flex: 1, fontSize: 13, border: "none", outline: "none", background: "transparent", color: "var(--ink-1)" }}
        />
      ) : (
        <span
          style={{ flex: 1, fontSize: 13, color: "var(--ink-1)", cursor: "text" }}
          onClick={() => onStartEdit(item)}
        >
          {item.text}
        </span>
      )}

      {hover && !isEditing && (
        <button
          onClick={() => onDelete(item.id)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "var(--ink-3)", opacity: 0.6 }}
        >
          <IcoDelete className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
