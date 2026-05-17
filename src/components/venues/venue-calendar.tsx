"use client";

import { useState, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  PlusSignIcon,
  Cancel01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { fmtEur } from "@/lib/format";

const IcoPrev  = ({ size = 14 }) => <HugeiconsIcon icon={ArrowLeft01Icon}  size={size} strokeWidth={1.5} />;
const IcoNext  = ({ size = 14 }) => <HugeiconsIcon icon={ArrowRight01Icon} size={size} strokeWidth={1.5} />;
const IcoPlus  = ({ size = 13 }) => <HugeiconsIcon icon={PlusSignIcon}     size={size} strokeWidth={1.5} />;
const IcoX     = ({ size = 15 }) => <HugeiconsIcon icon={Cancel01Icon}     size={size} strokeWidth={1.5} />;
const IcoCheck = ({ size = 11 }) => <HugeiconsIcon icon={Tick01Icon}       size={size} strokeWidth={1.5} />;

export type BookingStatus = "confirmado" | "opcion" | "bloqueado" | "libre";

export interface VenueRate {
  id: number;
  spaceId: number;
  label: string;
  months: number[] | null;
  days: number | null;
  zone: string | null;
  price: string | null;
  vatRate: number | null;
}

export interface VenueSpace {
  id: number;
  venueId: number;
  name: string;
  capacity: number | null;
  type: string | null;
  color: string | null;
  rates: VenueRate[];
}

export interface VenueBooking {
  id: number;
  venueId: number;
  spaceId: number | null;
  date: string;
  eventName: string | null;
  eventId: number | null;
  status: BookingStatus;
  rateId: number | null;
  rateLabel: string | null;
  price: string | null;
  notes: string | null;
}

interface Props {
  venueId: number;
  spaces: VenueSpace[];
  bookings: VenueBooking[];
  onAdd: (data: {
    spaceId: number | null;
    date: string;
    eventName: string;
    status: BookingStatus;
    rateId: number | null;
  }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onConfirm: (id: number) => Promise<void>;
}

const BOOK_STATUS: Record<BookingStatus, { bg: string; fg: string; dot: string; label: string }> = {
  confirmado: { bg: "#F8D4D4", fg: "#8B2A2A", dot: "#C0392B", label: "Confirmado" },
  opcion:     { bg: "#FEF3CD", fg: "#8A6D00", dot: "#C4A832", label: "En opción"  },
  bloqueado:  { bg: "#E8E4DB", fg: "#5A5345", dot: "#9B9080", label: "Bloqueado"  },
  libre:      { bg: "#D9ECD1", fg: "#1F6A3A", dot: "#2F7D4F", label: "Disponible" },
};

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAY_NAMES   = ["L","M","X","J","V","S","D"];


export function VenueCalendar({ venueId: _venueId, spaces, bookings, onAdd, onDelete, onConfirm }: Props) {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selSpace,   setSelSpace]   = useState<number | "all">("all");
  const [selDay,     setSelDay]     = useState<number | null>(null);
  const [addingForm, setAddingForm] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [newBk, setNewBk] = useState<{
    spaceId: string;
    eventName: string;
    status: BookingStatus;
    rateId: string;
  }>({ spaceId: "", eventName: "", status: "opcion", rateId: "" });

  const firstDay    = new Date(year, month, 1).getDay();
  const offset      = (firstDay + 6) % 7; // Mon-first offset
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dayIso = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const filtered = useMemo(
    () => selSpace === "all" ? bookings : bookings.filter(b => b.spaceId === selSpace),
    [bookings, selSpace]
  );

  const dayStatus = (day: number): BookingStatus => {
    const hits = filtered.filter(b => b.date === dayIso(day));
    if (!hits.length) return "libre";
    if (hits.some(b => b.status === "bloqueado")) return "bloqueado";
    if (hits.some(b => b.status === "confirmado")) return "confirmado";
    return "opcion";
  };

  const spaceById = (id: number | null) => spaces.find(s => s.id === id);

  const getApplicableRates = (spaceId: string, _day?: number): VenueRate[] => {
    const sp = spaces.find(s => s.id === Number(spaceId));
    if (!sp?.rates?.length) return [];
    const m = month + 1;
    return sp.rates.filter(r => !r.months || r.months.includes(m));
  };

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelDay(null); setAddingForm(false);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelDay(null); setAddingForm(false);
  };

  const handleAdd = async () => {
    if (!newBk.eventName.trim()) return;
    if (!selDay) return;
    setSaving(true);
    try {
      await onAdd({
        spaceId: newBk.spaceId ? Number(newBk.spaceId) : null,
        date: dayIso(selDay),
        eventName: newBk.eventName.trim(),
        status: newBk.status,
        rateId: newBk.rateId ? Number(newBk.rateId) : null,
      });
      setAddingForm(false);
      setNewBk({ spaceId: "", eventName: "", status: "opcion", rateId: "" });
    } finally {
      setSaving(false);
    }
  };

  const detailBookings = selDay ? bookings.filter(b => b.date === dayIso(selDay)) : [];
  const bookedSpaceIds = new Set(detailBookings.map(b => b.spaceId));
  const freeSpaces     = spaces.filter(s => !bookedSpaceIds.has(s.id));

  return (
    <div style={{ display: "grid", gridTemplateColumns: selDay ? "1fr 300px" : "1fr", gap: 14 }}>
      {/* Left: calendar */}
      <div>
        {/* Month navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button onClick={prevMonth} style={{ background: "none", border: "1px solid var(--line-1)", borderRadius: 8, width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)" }}>
            <IcoPrev size={14} />
          </button>
          <div style={{ fontSize: 15, fontWeight: 700, flex: 1, textAlign: "center" }}>
            {MONTH_NAMES[month]} {year}
          </div>
          <button onClick={nextMonth} style={{ background: "none", border: "1px solid var(--line-1)", borderRadius: 8, width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)" }}>
            <IcoNext size={14} />
          </button>
        </div>

        {/* Space filters + legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {[{ id: "all" as const, name: "Todos", color: "var(--ink-2)" }, ...spaces].map(s => (
            <button
              key={s.id}
              onClick={() => setSelSpace(s.id)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px",
                borderRadius: 999,
                border: `1.5px solid ${selSpace === s.id ? (s.id === "all" ? "var(--ink-2)" : (s as VenueSpace).color || "#aaa") : "var(--line-1)"}`,
                background: selSpace === s.id ? (s.id === "all" ? "rgba(0,0,0,0.06)" : `${(s as VenueSpace).color}18`) : "transparent",
                color: selSpace === s.id ? (s.id === "all" ? "var(--ink-1)" : (s as VenueSpace).color || "#aaa") : "var(--ink-3)",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              {s.id !== "all" && (
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: (s as VenueSpace).color || "#aaa" }} />
              )}
              {s.name}
              {s.id !== "all" && (s as VenueSpace).capacity && (
                <span style={{ fontSize: 10.5, opacity: 0.7 }}>· {(s as VenueSpace).capacity}p</span>
              )}
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
            {(["confirmado", "opcion", "bloqueado"] as BookingStatus[]).map(k => (
              <div key={k} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--ink-3)" }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: BOOK_STATUS[k].dot }} />
                {BOOK_STATUS[k].label}
              </div>
            ))}
          </div>
        </div>

        {/* Day names row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5, marginBottom: 5 }}>
          {DAY_NAMES.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: ".06em", padding: "3px 0" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>
          {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const status = dayStatus(day);
            const s = BOOK_STATUS[status];
            const isSel = selDay === day;
            const dayBks = bookings.filter(b => b.date === dayIso(day) && (selSpace === "all" || b.spaceId === selSpace));
            const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
            return (
              <button
                key={day}
                onClick={() => { setSelDay(selDay === day ? null : day); setAddingForm(false); }}
                style={{
                  aspectRatio: "1/1", borderRadius: "var(--r-sm, 8px)",
                  background: isSel ? s.dot : s.bg,
                  border: `1.5px solid ${isSel ? s.dot : isToday ? s.dot : "transparent"}`,
                  cursor: "pointer", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 3,
                  transition: "transform .1s",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: isSel ? "white" : s.fg }}>
                  {day}
                </span>
                {dayBks.length > 0 && (
                  <div style={{ display: "flex", gap: 2 }}>
                    {dayBks.slice(0, 3).map(b => (
                      <span
                        key={b.id}
                        style={{
                          width: 5, height: 5, borderRadius: "50%",
                          background: isSel ? "rgba(255,255,255,0.7)" : (spaceById(b.spaceId)?.color || "#aaa"),
                        }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: day detail panel */}
      {selDay && (
        <div style={{
          background: "var(--bg-subtle)", border: "1px solid var(--line-1)",
          borderRadius: "var(--r-md, 12px)", padding: 16,
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {selDay} de {MONTH_NAMES[month]}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>
                {detailBookings.length} reserva{detailBookings.length !== 1 ? "s" : ""} · {freeSpaces.length} libre{freeSpaces.length !== 1 ? "s" : ""}
              </div>
            </div>
            <button
              onClick={() => { setSelDay(null); setAddingForm(false); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-4)", padding: 4 }}
            >
              <IcoX size={15} />
            </button>
          </div>

          {/* Booked spaces */}
          {detailBookings.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-4)" }}>
                Reservado
              </div>
              {detailBookings.map(b => {
                const sc = BOOK_STATUS[b.status] || BOOK_STATUS.confirmado;
                const sp = spaceById(b.spaceId);
                return (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: "var(--r-sm, 8px)", background: sc.bg }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: sp?.color || "#aaa", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: sc.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {b.eventName || "Sin nombre"}
                      </div>
                      <div style={{ fontSize: 11, color: sc.fg, opacity: 0.75 }}>
                        {sp?.name || "Espacio"}{b.rateLabel ? ` · ${b.rateLabel}` : ""}
                      </div>
                      {b.price && (
                        <div style={{ fontSize: 12, fontWeight: 700, color: sc.fg, marginTop: 1 }}>
                          {fmtEur(b.price)}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      {b.status === "opcion" && (
                        <button
                          onClick={() => onConfirm(b.id)}
                          title="Confirmar reserva"
                          style={{ background: "#1F6A3A", color: "white", border: "none", borderRadius: 6, width: 22, height: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          <IcoCheck size={11} />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(b.id)}
                        title="Eliminar reserva"
                        style={{ background: "rgba(0,0,0,0.08)", color: sc.fg, border: "none", borderRadius: 6, width: 22, height: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <IcoX size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Free spaces */}
          {freeSpaces.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-4)" }}>
                Disponibles
              </div>
              {freeSpaces.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: "var(--r-sm, 8px)", background: "#D9ECD1" }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: s.color || "#aaa", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1F6A3A" }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "#1F6A3A", opacity: 0.75 }}>
                      {s.capacity ? `${s.capacity} personas` : ""}{s.type ? ` · ${s.type}` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add button */}
          {!addingForm && (
            <button
              onClick={() => setAddingForm(true)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "9px", borderRadius: "var(--r-sm, 8px)",
                border: "1.5px dashed var(--line-strong, #ccc)",
                background: "transparent", color: "var(--ink-3)", fontSize: 12.5, fontWeight: 500, cursor: "pointer",
              }}
            >
              <IcoPlus size={13} /> Nueva reserva
            </button>
          )}

          {/* Add form */}
          {addingForm && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: "var(--r-sm, 8px)", background: "white", border: "1px solid var(--line-1)" }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-2)" }}>
                Nueva reserva — {selDay} de {MONTH_NAMES[month]}
              </div>

              <select
                value={newBk.spaceId}
                onChange={e => setNewBk(v => ({ ...v, spaceId: e.target.value, rateId: "" }))}
                style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--line-1)", fontSize: 12.5, background: "white", color: newBk.spaceId ? "var(--ink-1)" : "var(--ink-4)" }}
              >
                <option value="">— Espacio —</option>
                {spaces.map(s => (
                  <option key={s.id} value={s.id}>{s.name}{s.capacity ? ` · ${s.capacity}p` : ""}</option>
                ))}
              </select>

              {newBk.spaceId && getApplicableRates(newBk.spaceId, selDay).length > 0 && (
                <select
                  value={newBk.rateId}
                  onChange={e => setNewBk(v => ({ ...v, rateId: e.target.value }))}
                  style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--line-1)", fontSize: 12.5, background: "white", color: newBk.rateId ? "var(--ink-1)" : "var(--ink-4)" }}
                >
                  <option value="">— Tarifa (opcional) —</option>
                  {getApplicableRates(newBk.spaceId, selDay).map(r => (
                    <option key={r.id} value={r.id}>{r.label} · {fmtEur(r.price)}</option>
                  ))}
                </select>
              )}

              <input
                value={newBk.eventName}
                onChange={e => setNewBk(v => ({ ...v, eventName: e.target.value }))}
                placeholder="Nombre del evento o cliente"
                style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--line-1)", fontSize: 12.5, outline: "none" }}
              />

              <select
                value={newBk.status}
                onChange={e => setNewBk(v => ({ ...v, status: e.target.value as BookingStatus }))}
                style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--line-1)", fontSize: 12.5, background: "white" }}
              >
                <option value="opcion">En opción</option>
                <option value="confirmado">Confirmado</option>
                <option value="bloqueado">Bloqueado</option>
              </select>

              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={handleAdd}
                  disabled={saving || !newBk.eventName.trim()}
                  style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: saving ? "#ccc" : "var(--ink-1)", color: "white", fontSize: 12.5, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
                <button
                  onClick={() => setAddingForm(false)}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line-1)", background: "white", fontSize: 12.5, cursor: "pointer", color: "var(--ink-2)" }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
