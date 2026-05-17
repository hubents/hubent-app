"use client";

import React, { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  RiPhoneLine,
  RiMoneyDollarCircleLine,
  RiCheckboxCircleLine,
  RiCalendarLine,
  RiMapPinLine,
  RiCalendarEventLine,
  RiCheckLine,
} from "@remixicon/react";
import { toast } from "sonner";

// ── Type catalog (matches prototype's SCHEDULE_TYPES) ──
const SCHEDULE_TYPES: Array<{
  id: ScheduleType;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  desc: string;
}> = [
  { id: "meeting", label: "Reunión",     Icon: RiPhoneLine,            desc: "Videollamada o presencial" },
  { id: "payment", label: "Pago",        Icon: RiMoneyDollarCircleLine, desc: "Cobro, transferencia o pago a proveedor" },
  { id: "task",    label: "Tarea",       Icon: RiCheckboxCircleLine,   desc: "Tarea con fecha y dueño" },
  { id: "other",   label: "Otro bloque", Icon: RiCalendarLine,         desc: "Bloque genérico de calendario" },
];

type ScheduleType = "meeting" | "payment" | "task" | "other";

interface EventOpt {
  id: number;
  name: string;
}

interface ScheduleDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function ScheduleDrawer({ open, onOpenChange, onCreated }: ScheduleDrawerProps) {
  const [type, setType] = useState<ScheduleType>("meeting");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [place, setPlace] = useState("");
  const [notes, setNotes] = useState("");

  // Task-specific
  const [taskScope, setTaskScope] = useState<"standalone" | "event">("standalone");
  const [taskEventId, setTaskEventId] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");

  // Payment-specific
  const [amount, setAmount] = useState("");
  const [paymentDirection, setPaymentDirection] = useState<"incoming" | "outgoing">("incoming");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentEventId, setPaymentEventId] = useState("");

  // Meeting-specific
  const [meetingMode, setMeetingMode] = useState<"online" | "onsite">("online");
  const [meetingEventId, setMeetingEventId] = useState("");

  // Events list for the linked-event dropdowns
  const [events, setEvents] = useState<EventOpt[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Reset on open + load events
  useEffect(() => {
    if (!open) return;
    setType("meeting");
    setTitle("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setPlace("");
    setNotes("");
    setTaskScope("standalone");
    setTaskEventId("");
    setTaskPriority("medium");
    setAmount("");
    setPaymentDirection("incoming");
    setPaymentMethod("bank_transfer");
    setPaymentEventId("");
    setMeetingMode("online");
    setMeetingEventId("");

    let cancelled = false;
    fetch("/api/events?limit=200")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.success && Array.isArray(data.data)) {
          setEvents(data.data.map((e: { id: number; name: string }) => ({ id: e.id, name: e.name })));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  // ── Validation per type ──
  const valid = (() => {
    if (!title.trim() || !date) return false;
    if (type === "task") return true;
    if (type === "payment") return amount.trim().length > 0;
    return startTime.length > 0;
  })();

  const submitLabel = (() => {
    if (submitting) return "Guardando…";
    return {
      meeting: "Agendar reunión",
      payment: "Crear pago",
      task: "Crear tarea",
      other: "Agendar bloque",
    }[type];
  })();

  // ── Submit per type ──
  const handleSubmit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      if (type === "task") {
        const body: Record<string, unknown> = {
          title: title.trim(),
          dueDate: date,
          priority: taskPriority,
          status: "pending",
        };
        if (notes.trim()) body.description = notes.trim();
        if (taskScope === "event" && taskEventId) body.eventId = parseInt(taskEventId, 10);
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.error?.message || "Error creando tarea");
        toast.success(`Tarea «${title.trim()}» creada`);
      } else if (type === "payment") {
        const body: Record<string, unknown> = {
          amount: parseFloat(amount),
          currency: "EUR",
          direction: paymentDirection,
          paymentDate: new Date(date),
          paymentMethod,
          status: "pending",
        };
        if (notes.trim()) body.notes = notes.trim();
        if (paymentEventId) body.eventId = parseInt(paymentEventId, 10);
        const res = await fetch("/api/finance/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || (data && data.success === false)) {
          throw new Error(data?.error?.message || data?.error || "Error creando pago");
        }
        toast.success(`Pago «${title.trim()}» creado`);
      } else if (type === "meeting") {
        // Create a parent task + a taskMeetings row so the meeting shows under
        // the "Reuniones" tab in the calendar (type="meeting") instead of being
        // an opaque task. Standalone meetings aren't modelled, so the parent
        // task is the placeholder that anchors the meeting record.
        const taskBody: Record<string, unknown> = {
          title: title.trim(),
          dueDate: date,
          priority: "medium",
          status: "pending",
        };
        if (notes.trim()) taskBody.description = notes.trim();
        if (meetingEventId) taskBody.eventId = parseInt(meetingEventId, 10);
        const taskRes = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskBody),
        });
        const taskData = await taskRes.json();
        if (!taskRes.ok || !taskData?.success) {
          throw new Error(taskData?.error?.message || "Error creando reunión");
        }
        const taskId = taskData.data?.id;
        if (taskId) {
          const meetingBody: Record<string, unknown> = {
            title: title.trim(),
            date,
          };
          if (startTime) meetingBody.startTime = startTime;
          if (endTime) meetingBody.endTime = endTime;
          if (place) meetingBody.location = place;
          if (notes.trim()) meetingBody.notes = notes.trim();
          await fetch(`/api/tasks/${taskId}/meetings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(meetingBody),
          });
        }
        toast.success(`Reunión «${title.trim()}» agendada`);
      } else {
        // "other" — store as a generic task. No matching tab beyond "Todo
        // programado", which is fine for ad-hoc blocks.
        const composedNotes = [notes.trim(), place ? `Contexto: ${place}` : null]
          .filter(Boolean)
          .join("\n");
        const body: Record<string, unknown> = {
          title: title.trim(),
          dueDate: date,
          status: "pending",
          priority: "medium",
        };
        if (composedNotes) body.description = composedNotes;
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.error?.message || "Error agendando bloque");
        toast.success(`Bloque «${title.trim()}» agendado`);
      }
      onCreated?.();
      onOpenChange(false);
    } catch (e) {
      console.error("schedule submit failed", e);
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[440px] flex flex-col p-0 overflow-hidden">
        <SheetHeader
          className="flex-shrink-0 gap-0"
          style={{ padding: "20px 24px 14px", borderBottom: "1px solid var(--line-2)" }}
        >
          <SheetTitle style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>
            Agendar
          </SheetTitle>
          <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>
            Crea una reunión, pago, tarea u otro bloque
          </p>
        </SheetHeader>

        <div
          className="flex-1 overflow-y-auto"
          style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}
        >
          {/* ── Type picker (2x2 grid) ── */}
          <FormField label="¿Qué quieres agendar? *">
            <div className="grid grid-cols-2" style={{ gap: 8 }}>
              {SCHEDULE_TYPES.map((t) => {
                const active = type === t.id;
                const Icon = t.Icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: `1px solid ${active ? "var(--ink-1)" : "var(--line-1)"}`,
                      background: active ? "var(--bg-subtle)" : "white",
                      color: active ? "var(--ink-1)" : "var(--ink-2)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        className="truncate"
                        style={{ fontSize: 12.5, fontWeight: active ? 600 : 500, lineHeight: 1.2 }}
                      >
                        {t.label}
                      </div>
                      <div
                        className="truncate"
                        style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 1 }}
                      >
                        {t.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </FormField>

          {/* ── Title ── */}
          <FormField label="Título *">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === "meeting"
                  ? "Ej. Reunión con catering"
                  : type === "payment"
                    ? "Ej. Anticipo floristería"
                    : type === "task"
                      ? "Ej. Confirmar menú con La Mesa de Lola"
                      : "Título del bloque"
              }
              style={inputStyle}
            />
          </FormField>

          {/* ── Date + start + end ── */}
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <FormField label="Día *">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
            </FormField>
            <FormField label={type === "task" ? "Hora límite" : "Hora inicio *"}>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Hora fin">
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={type === "task" || type === "payment"}
                style={{
                  ...inputStyle,
                  opacity: type === "task" || type === "payment" ? 0.55 : 1,
                  cursor: type === "task" || type === "payment" ? "not-allowed" : "text",
                }}
              />
            </FormField>
          </div>

          {/* ── Type-specific fields ── */}
          {type === "meeting" && (
            <>
              <FormField label="Modalidad">
                <div className="flex" style={{ gap: 6 }}>
                  <ModePill active={meetingMode === "online"} onClick={() => setMeetingMode("online")}>
                    <RiPhoneLine className="h-3 w-3" /> Online
                  </ModePill>
                  <ModePill active={meetingMode === "onsite"} onClick={() => setMeetingMode("onsite")}>
                    <RiMapPinLine className="h-3 w-3" /> Presencial
                  </ModePill>
                </div>
              </FormField>
              <FormField label={meetingMode === "online" ? "Enlace / plataforma" : "Lugar"}>
                <input
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  placeholder={
                    meetingMode === "online"
                      ? "meet.google.com/abc-defg-hij"
                      : "Ej. Oficina, Casa de la Era"
                  }
                  style={inputStyle}
                />
              </FormField>
              <FormField label="Vincular a evento (opcional)">
                <select
                  value={meetingEventId}
                  onChange={(e) => setMeetingEventId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Sin vincular</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </>
          )}

          {type === "payment" && (
            <>
              <FormField label="Dirección">
                <div className="flex" style={{ gap: 6 }}>
                  <ModePill
                    active={paymentDirection === "incoming"}
                    onClick={() => setPaymentDirection("incoming")}
                  >
                    Cobrar
                  </ModePill>
                  <ModePill
                    active={paymentDirection === "outgoing"}
                    onClick={() => setPaymentDirection("outgoing")}
                  >
                    Pagar
                  </ModePill>
                </div>
              </FormField>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <FormField label="Importe *">
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="€0,00"
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="Método">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="bank_transfer">Transferencia</option>
                    <option value="stripe">Stripe</option>
                    <option value="cash">Efectivo</option>
                    <option value="card">Tarjeta</option>
                    <option value="other">Otro</option>
                  </select>
                </FormField>
              </div>
              <FormField label="Vincular a evento (opcional)">
                <select
                  value={paymentEventId}
                  onChange={(e) => setPaymentEventId(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Sin vincular</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </>
          )}

          {type === "task" && (
            <>
              <FormField label="¿Independiente o vinculada?">
                <div className="flex flex-wrap" style={{ gap: 6 }}>
                  <ModePill active={taskScope === "standalone"} onClick={() => setTaskScope("standalone")}>
                    <RiCheckLine className="h-3 w-3" /> Independiente
                  </ModePill>
                  <ModePill active={taskScope === "event"} onClick={() => setTaskScope("event")}>
                    <RiCalendarEventLine className="h-3 w-3" /> Vinculada a evento
                  </ModePill>
                </div>
                <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6, lineHeight: 1.45 }}>
                  {taskScope === "standalone"
                    ? "Tarea suelta, aparecerá solo en el módulo de Tareas."
                    : "La tarea se mostrará en el módulo de Tareas y dentro del workspace del evento elegido."}
                </p>
              </FormField>
              {taskScope === "event" && (
                <FormField label="Evento *">
                  <select
                    value={taskEventId}
                    onChange={(e) => setTaskEventId(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Elige un evento…</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}
              <FormField label="Prioridad">
                <div className="flex" style={{ gap: 6 }}>
                  {(["low", "medium", "high"] as const).map((p) => (
                    <ModePill
                      key={p}
                      active={taskPriority === p}
                      onClick={() => setTaskPriority(p)}
                    >
                      {p === "low" ? "Baja" : p === "medium" ? "Media" : "Alta"}
                    </ModePill>
                  ))}
                </div>
              </FormField>
            </>
          )}

          {type === "other" && (
            <FormField label="Lugar / contexto">
              <input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="Ej. Oficina, online…"
                style={inputStyle}
              />
            </FormField>
          )}

          <FormField label="Notas">
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles adicionales…"
              style={{ ...inputStyle, resize: "vertical", minHeight: 60, fontFamily: "inherit" }}
            />
          </FormField>
        </div>

        <div
          className="flex-shrink-0"
          style={{
            padding: "12px 24px",
            borderTop: "1px solid var(--line-2)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={handleSubmit}
            disabled={!valid || submitting}
            style={{
              background: valid && !submitting ? "var(--color-primary)" : "#BFDBFE",
              color: "white",
              border: "none",
              padding: "10px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: valid && !submitting ? "pointer" : "not-allowed",
              minWidth: 160,
            }}
          >
            {submitLabel}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Internal helpers ──
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--ink-2)",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ModePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center cursor-pointer"
      style={{
        gap: 5,
        padding: "7px 12px",
        borderRadius: 8,
        border: `1px solid ${active ? "var(--ink-1)" : "var(--line-1)"}`,
        background: active ? "var(--bg-subtle)" : "white",
        color: active ? "var(--ink-1)" : "var(--ink-2)",
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {children}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  border: "1px solid var(--line-1)",
  borderRadius: 8,
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  background: "white",
  color: "var(--ink-1)",
  boxSizing: "border-box",
};
