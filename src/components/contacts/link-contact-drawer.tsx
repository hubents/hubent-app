"use client";

import { useState, useEffect } from "react";
import { avColor } from "@/lib/ui-utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  Cancel01Icon,
  Calendar03Icon,
  Task01Icon,
  Tick01Icon,
  UserCircleIcon,
  Building01Icon,
} from "@hugeicons/core-free-icons";

const IcoX = hgIcon(Cancel01Icon);
const IcoCalendar = hgIcon(Calendar03Icon);
const IcoTask = hgIcon(Task01Icon);
const IcoCheck = hgIcon(Tick01Icon);
const IcoUser = hgIcon(UserCircleIcon);
const IcoBuilding = hgIcon(Building01Icon);


interface Contact {
  id: number;
  type: "person" | "company";
  name: string;
  email: string | null;
}

interface Event {
  id: number;
  name: string;
  date: string | null;
  status: string;
}

interface Task {
  id: number;
  title: string;
  status: string;
  eventId: number;
}

interface LinkContactDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  onLinkComplete?: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 drawer-form-field">
      <label className="text-[12px] font-medium text-[var(--ink-2)]">{label}</label>
      {children}
    </div>
  );
}

export function LinkContactDrawer({
  open,
  onOpenChange,
  contact,
  onLinkComplete,
}: LinkContactDrawerProps) {
  const [activeTab, setActiveTab] = useState<"event" | "task">("event");
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
      setSuccess(false);
      setSelectedEventId("");
      setSelectedTaskId("");
      setRole("");
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsRes, tasksRes] = await Promise.all([fetch("/api/events"), fetch("/api/tasks")]);
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.data || []);
      }
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.data || []);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkToEvent = async () => {
    if (!contact || !selectedEventId) return;
    setLinking(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: parseInt(selectedEventId),
          role: role || undefined,
        }),
      });
      if (res.ok) {
        setSuccess(true);
        onLinkComplete?.();
        setTimeout(() => onOpenChange(false), 1500);
      }
    } catch (error) {
      console.error("Failed to link contact to event:", error);
    } finally {
      setLinking(false);
    }
  };

  const handleLinkToTask = async () => {
    if (!contact || !selectedTaskId) return;
    setLinking(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: parseInt(selectedTaskId),
          role: role || undefined,
        }),
      });
      if (res.ok) {
        setSuccess(true);
        onLinkComplete?.();
        setTimeout(() => onOpenChange(false), 1500);
      }
    } catch (error) {
      console.error("Failed to link contact to task:", error);
    } finally {
      setLinking(false);
    }
  };

  if (!contact) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="overflow-hidden bg-white border-0 [&>button]:hidden flex flex-col"
        style={{ width: "min(480px, 100vw)", maxWidth: "100vw", padding: 0, gap: 0 }}
      >
        {/* Header */}
        <div
          className="flex items-start gap-3 px-6 pt-5 pb-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--line-1)" }}
        >
          <div className="flex-1 min-w-0">
            <div
              className="text-[18px] font-semibold text-[var(--ink-1)]"
              style={{ letterSpacing: "-0.01em" }}
            >
              Vincular contacto
            </div>
            <div className="text-[12.5px] text-[var(--ink-3)] mt-0.5">
              Vincula este contacto a un evento o tarea
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="bg-transparent border-none cursor-pointer text-[var(--ink-3)] hover:text-[var(--ink-1)] transition-colors"
            aria-label="Cerrar"
          >
            <IcoX className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {success ? (
            <div className="flex flex-col items-center text-center py-8 gap-3">
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center"
                style={{ background: "var(--success-bg)", color: "var(--success-ink)" }}
              >
                <IcoCheck className="h-5 w-5" />
              </div>
              <h3 className="text-[14px] font-semibold text-[var(--ink-1)]">¡Vinculación exitosa!</h3>
            </div>
          ) : (
            <>
              {/* Contact summary */}
              <div
                className="flex items-center gap-3 rounded-[8px] p-3"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--line-1)" }}
              >
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center text-white flex-shrink-0"
                  style={{ background: avColor(contact.name) }}
                >
                  {contact.type === "company" ? <IcoBuilding className="h-4 w-4" /> : <IcoUser className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--ink-1)] truncate">{contact.name}</p>
                  {contact.email && (
                    <p className="text-[11.5px] text-[var(--ink-3)] truncate">{contact.email}</p>
                  )}
                </div>
                <span
                  className="inline-flex items-center rounded-[999px] text-[11px] px-2 py-0.5"
                  style={{
                    background: "transparent",
                    color: "var(--ink-2)",
                    border: "1px solid var(--line-1)",
                  }}
                >
                  {contact.type === "company" ? "Empresa" : "Persona"}
                </span>
              </div>

              {/* Tab toggle */}
              <div
                className="grid grid-cols-2 rounded-[8px]"
                style={{ background: "var(--bg-subtle)", padding: 3 }}
              >
                <button
                  onClick={() => setActiveTab("event")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-[6px] cursor-pointer border-none transition-colors"
                  style={{
                    padding: "8px 10px",
                    background: activeTab === "event" ? "#FFFFFF" : "transparent",
                    color: activeTab === "event" ? "var(--ink-1)" : "var(--ink-3)",
                    fontWeight: activeTab === "event" ? 600 : 500,
                    fontSize: 12.5,
                    boxShadow: activeTab === "event" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  }}
                >
                  <IcoCalendar className="h-3.5 w-3.5" />
                  Evento
                </button>
                <button
                  onClick={() => setActiveTab("task")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-[6px] cursor-pointer border-none transition-colors"
                  style={{
                    padding: "8px 10px",
                    background: activeTab === "task" ? "#FFFFFF" : "transparent",
                    color: activeTab === "task" ? "var(--ink-1)" : "var(--ink-3)",
                    fontWeight: activeTab === "task" ? 600 : 500,
                    fontSize: 12.5,
                    boxShadow: activeTab === "task" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  }}
                >
                  <IcoTask className="h-3.5 w-3.5" />
                  Tarea
                </button>
              </div>

              {activeTab === "event" ? (
                <div className="flex flex-col gap-3">
                  <Field label="Seleccionar evento">
                    <select
                      value={selectedEventId}
                      onChange={(e) => setSelectedEventId(e.target.value)}
                    >
                      <option value="">{loading ? "Cargando..." : "Elegir evento"}</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id.toString()}>
                          {event.name}
                          {event.date ? ` (${new Date(event.date).toLocaleDateString("es-ES")})` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Rol (opcional)">
                    <input
                      placeholder="Ej: Cliente, Proveedor, Invitado..."
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    />
                  </Field>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Field label="Seleccionar tarea">
                    <select
                      value={selectedTaskId}
                      onChange={(e) => setSelectedTaskId(e.target.value)}
                    >
                      <option value="">{loading ? "Cargando..." : "Elegir tarea"}</option>
                      {tasks.map((task) => (
                        <option key={task.id} value={task.id.toString()}>
                          {task.title} ({task.status})
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Rol (opcional)">
                    <input
                      placeholder="Ej: Responsable, Colaborador..."
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    />
                  </Field>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div
            className="px-6 py-4 flex items-center justify-end gap-2 flex-shrink-0"
            style={{ borderTop: "1px solid var(--line-1)" }}
          >
            <button
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center rounded-[8px] px-3.5 py-2 text-[13px] font-medium text-[var(--ink-1)] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
              style={{ background: "#FFFFFF", border: "1px solid var(--line-strong)" }}
            >
              Cancelar
            </button>
            <button
              onClick={activeTab === "event" ? handleLinkToEvent : handleLinkToTask}
              disabled={linking || (activeTab === "event" ? !selectedEventId : !selectedTaskId)}
              aria-disabled={linking || (activeTab === "event" ? !selectedEventId : !selectedTaskId)}
              className="inline-flex items-center rounded-[8px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer transition-colors border-none"
              style={{
                background: "var(--ink-1)",
                color: "#FFFFFF",
                opacity:
                  linking || (activeTab === "event" ? !selectedEventId : !selectedTaskId) ? 0.5 : 1,
              }}
            >
              {linking ? "Vinculando..." : "Vincular"}
            </button>
          </div>
        )}

      </SheetContent>
    </Sheet>
  );
}
