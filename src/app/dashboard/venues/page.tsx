"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  PlusSignIcon,
  Location01Icon,
  House01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { VenueCalendar, type VenueSpace, type VenueBooking, type BookingStatus } from "@/components/venues/venue-calendar";
import { fmtEur } from "@/lib/format";

// ── Module-level constants ────────────────────────────────────────────────────
const VENUE_COLORS = ["#5B8FE8", "#4F7A5E", "#C49A3C", "#C4874A", "#9B7EDB", "#C97A7A", "#7FA890"];

// ── Types ─────────────────────────────────────────────────────────────────────
interface VenueWithSpaces {
  id: number;
  organizationId: number;
  name: string;
  city: string | null;
  address: string | null;
  contact: string | null;
  email: string | null;
  phone: string | null;
  web: string | null;
  color: string | null;
  initials: string | null;
  cover: string | null;
  isActive: boolean | null;
  spaces: VenueSpace[];
}

// ── Icon wrappers ─────────────────────────────────────────────────────────────
const IcoBack  = ({ size = 14 }) => <HugeiconsIcon icon={ArrowLeft01Icon} size={size} strokeWidth={1.5} />;
const IcoPlus  = ({ size = 15 }) => <HugeiconsIcon icon={PlusSignIcon}    size={size} strokeWidth={1.5} />;
const IcoCity  = ({ size = 12 }) => <HugeiconsIcon icon={Location01Icon}  size={size} strokeWidth={1.5} />;
const IcoVenue = ({ size = 28 }) => <HugeiconsIcon icon={House01Icon}     size={size} strokeWidth={1.5} />;
const IcoX     = ({ size = 16 }) => <HugeiconsIcon icon={Cancel01Icon}    size={size} strokeWidth={1.5} />;

// ── VenueCard ─────────────────────────────────────────────────────────────────
interface VenueCardProps {
  venue: VenueWithSpaces;
  onClick: () => void;
}

function VenueCard({ venue, onClick }: VenueCardProps) {
  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)";
    e.currentTarget.style.transform = "translateY(-2px)";
  };
  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
    e.currentTarget.style.transform = "translateY(0)";
  };

  return (
    <button
      onClick={onClick}
      style={{
        background: "white", border: "1px solid var(--line-1)", borderRadius: 14,
        overflow: "hidden", cursor: "pointer", textAlign: "left",
        transition: "box-shadow .15s, transform .15s",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Cover */}
      <div style={{ height: 120, background: venue.cover ? `url(${venue.cover}) center/cover` : venue.color || "#5B8FE8", position: "relative" }}>
        {!venue.cover && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: "rgba(255,255,255,0.85)" }}>
              {venue.initials || venue.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      {/* Info */}
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-1)", marginBottom: 4 }}>{venue.name}</div>
        {venue.city && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--ink-3)" }}>
            <IcoCity size={12} />
            {venue.city}
          </div>
        )}
        <div style={{ marginTop: 8, display: "flex", gap: 5, flexWrap: "wrap" }}>
          {venue.spaces.slice(0, 3).map(s => (
            <span key={s.id} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600,
              background: `${s.color || venue.color || "#5B8FE8"}18`,
              color: s.color || venue.color || "#5B8FE8",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color || venue.color || "#5B8FE8" }} />
              {s.name}
            </span>
          ))}
          {venue.spaces.length > 3 && (
            <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, color: "var(--ink-3)", background: "var(--bg-subtle)" }}>
              +{venue.spaces.length - 3}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── New venue form modal ──────────────────────────────────────────────────────
function NewVenueModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (data: { name: string; city: string; color: string }) => Promise<void>;
}) {
  const [name,   setName]   = useState("");
  const [city,   setCity]   = useState("");
  const [color,  setColor]  = useState("#5B8FE8");
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try { await onCreate({ name: name.trim(), city: city.trim(), color }); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={onClose} />
      <div style={{ position: "relative", background: "white", borderRadius: 16, padding: 28, width: 380, boxShadow: "0 24px 64px rgba(0,0,0,0.18)", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Nueva finca</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-4)", padding: 4 }}>
            <IcoX size={16} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", display: "block", marginBottom: 5 }}>Nombre *</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Casa de la Era"
              autoFocus
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--line-1)", fontSize: 13.5, boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", display: "block", marginBottom: 5 }}>Ciudad</label>
            <input
              value={city} onChange={e => setCity(e.target.value)}
              placeholder="Valencia"
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--line-1)", fontSize: 13.5, boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", display: "block", marginBottom: 5 }}>Color</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {VENUE_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: "50%", background: c, border: `3px solid ${color === c ? "var(--ink-1)" : "transparent"}`,
                    cursor: "pointer", outline: "none",
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              onClick={handle}
              disabled={saving || !name.trim()}
              style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: saving || !name.trim() ? "#ccc" : "var(--ink-1)", color: "white", fontSize: 13.5, fontWeight: 600, cursor: saving || !name.trim() ? "not-allowed" : "pointer" }}
            >
              {saving ? "Creando..." : "Crear finca"}
            </button>
            <button onClick={onClose} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid var(--line-1)", background: "white", fontSize: 13.5, cursor: "pointer", color: "var(--ink-2)" }}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Month abbreviations ───────────────────────────────────────────────────────
const MONTH_ABBR = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VenuesPage() {
  const [venues,      setVenues]      = useState<VenueWithSpaces[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selVenue,    setSelVenue]    = useState<VenueWithSpaces | null>(null);
  const [bookings,    setBookings]    = useState<VenueBooking[]>([]);
  const [bkLoading,   setBkLoading]   = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [activeTab,   setActiveTab]   = useState<"calendar" | "list" | "spaces" | "tarifas">("calendar");

  // Load venues
  useEffect(() => {
    fetch("/api/venues")
      .then(r => r.json())
      .then(res => { if (res.success) setVenues(res.data); })
      .catch(() => toast.error("Error al cargar fincas"))
      .finally(() => setLoading(false));
  }, []);

  // Load bookings when a venue is selected
  useEffect(() => {
    if (!selVenue) { setBookings([]); return; }
    setBkLoading(true);
    fetch(`/api/venues/${selVenue.id}/bookings`)
      .then(r => r.json())
      .then(res => { if (res.success) setBookings(res.data); })
      .catch(() => toast.error("Error al cargar reservas"))
      .finally(() => setBkLoading(false));
  }, [selVenue]);

  const handleCreateVenue = useCallback(async (data: { name: string; city: string; color: string }) => {
    const res = await fetch("/api/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json());
    if (!res.success) throw new Error(res.error?.message || "Error al crear finca");
    setVenues(v => [...v, res.data]);
    setShowNewForm(false);
    toast.success("Finca creada");
  }, []);

  const handleAddBooking = useCallback(async (data: {
    spaceId: number | null;
    date: string;
    eventName: string;
    status: BookingStatus;
    rateId: number | null;
  }) => {
    if (!selVenue) return;
    const res = await fetch(`/api/venues/${selVenue.id}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spaceId: data.spaceId,
        date: data.date,
        eventName: data.eventName,
        status: data.status,
        rateId: data.rateId,
      }),
    }).then(r => r.json());
    if (!res.success) { toast.error(res.error?.message || "Error al guardar reserva"); throw new Error(); }
    setBookings(b => [...b, res.data]);
    toast.success("Reserva creada");
  }, [selVenue]);

  const handleDeleteBooking = useCallback(async (id: number) => {
    if (!selVenue) return;
    const res = await fetch(`/api/venues/${selVenue.id}/bookings?bookingId=${id}`, { method: "DELETE" }).then(r => r.json());
    if (!res.success) { toast.error("Error al eliminar reserva"); return; }
    setBookings(b => b.filter(x => x.id !== id));
    toast.success("Reserva eliminada");
  }, [selVenue]);

  const handleConfirmBooking = useCallback(async (id: number) => {
    if (!selVenue) return;
    const res = await fetch(`/api/venues/${selVenue.id}/bookings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "confirmado" }),
    }).then(r => r.json());
    if (!res.success) { toast.error("Error al confirmar reserva"); return; }
    setBookings(b => b.map(x => x.id === id ? { ...x, status: "confirmado" } : x));
    toast.success("Reserva confirmada");
  }, [selVenue]);

  // ── Render ──
  if (loading) {
    return (
      <div style={{ padding: "32px 28px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 200, borderRadius: 14, background: "var(--bg-subtle)", animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Selected venue view ──
  if (selVenue) {
    const confirmed = bookings.filter(b => b.status === "confirmado").length;
    const pending   = bookings.filter(b => b.status === "opcion").length;
    const spaces    = selVenue.spaces as (VenueSpace & { rates?: { id: number; label: string; months: number[] | null; days: number | null; zone: string | null; price: string | null; vatRate: number | null }[] })[];
    const TABS = [
      { id: "calendar" as const, label: "Calendario" },
      { id: "list"     as const, label: "Reservas" },
      { id: "spaces"   as const, label: "Espacios" },
      { id: "tarifas"  as const, label: "Tarifas" },
    ];

    return (
      <div style={{ maxWidth: 1100 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button
            onClick={() => { setSelVenue(null); setActiveTab("calendar"); }}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0, background: "transparent", border: "1px solid var(--line-1)", borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 500, cursor: "pointer", color: "var(--ink-3)" }}
          >
            <IcoBack size={13} /> Mis Venues
          </button>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: selVenue.color || "#5B8FE8", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 17, flexShrink: 0 }}>
            {selVenue.initials || selVenue.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>{selVenue.name}</div>
            {(selVenue.city || selVenue.address) && (
              <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 1, display: "flex", alignItems: "center", gap: 5 }}>
                <IcoCity size={11} />
                {[selVenue.city, selVenue.address].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
          {[
            { label: "Reservas confirmadas", val: confirmed, sub: "este mes",             color: "#C0392B" },
            { label: "En opción",            val: pending,   sub: "pendientes confirmar", color: "#C4A832" },
            { label: "Espacios",             val: spaces.length, sub: "configurados",     color: "#5B8FE8" },
            { label: "Tarifas totales",      val: spaces.reduce((a, s) => a + (s.rates?.length || 0), 0), sub: "entre todos los espacios", color: "var(--ink-2)" },
          ].map((k, i) => (
            <div key={i} style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: "var(--r-md)", padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 3 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Alert: pending bookings */}
        {pending > 0 && (
          <div style={{ background: "#FEF3CD", border: "1px solid #C4A832", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#5A4800" }}>
                Tienes {pending} reserva{pending !== 1 ? "s" : ""} pendiente{pending !== 1 ? "s" : ""} de confirmar
              </div>
              <div style={{ fontSize: 12, color: "#8A6D00", marginTop: 2 }}>
                Confirma o cancela cada reserva en el calendario o en la lista de reservas.
              </div>
            </div>
            <button onClick={() => setActiveTab("list")} style={{ background: "#C4A832", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
              Ver reservas
            </button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--line-1)", marginBottom: 16 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: "9px 16px", borderRadius: "8px 8px 0 0",
              border: "1px solid var(--line-1)",
              borderBottom: activeTab === t.id ? "2px solid var(--ink-1)" : "1px solid transparent",
              background: activeTab === t.id ? "var(--bg-panel)" : "transparent",
              color: activeTab === t.id ? "var(--ink-1)" : "var(--ink-3)",
              fontSize: 13, fontWeight: activeTab === t.id ? 600 : 400,
              cursor: "pointer", marginBottom: activeTab === t.id ? -1 : 0,
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Calendario */}
        {activeTab === "calendar" && (
          bkLoading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--ink-3)", fontSize: 13 }}>
              Cargando calendario...
            </div>
          ) : (
            <VenueCalendar
              venueId={selVenue.id}
              spaces={selVenue.spaces}
              bookings={bookings}
              onAdd={handleAddBooking}
              onDelete={handleDeleteBooking}
              onConfirm={handleConfirmBooking}
            />
          )
        )}

        {/* Tab: Reservas */}
        {activeTab === "list" && (
          <div style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line-1)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Todas las reservas</span>
              <span style={{ fontSize: 12, color: "var(--ink-3)", marginLeft: "auto" }}>{bookings.length} total</span>
            </div>
            {bookings.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>Sin reservas registradas</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--bg-subtle)" }}>
                    {["Fecha", "Evento / Cliente", "Espacio", "Estado", "Acciones"].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...bookings].sort((a, b) => a.date.localeCompare(b.date)).map(bk => {
                    const sp = selVenue.spaces.find(s => s.id === bk.spaceId);
                    const statusStyle = bk.status === "confirmado" ? { bg: "#D9ECD1", fg: "#1F6A3A", label: "Confirmada" }
                                      : bk.status === "opcion"    ? { bg: "#FEF3CD", fg: "#8A6D00", label: "En opción" }
                                      : bk.status === "bloqueado" ? { bg: "#F0EBF8", fg: "#5C3D8F", label: "Bloqueado" }
                                      : { bg: "var(--bg-subtle)", fg: "var(--ink-3)", label: bk.status };
                    return (
                      <tr key={bk.id} style={{ borderTop: "1px solid var(--line-1)" }}>
                        <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 500 }}>{bk.date}</td>
                        <td style={{ padding: "11px 16px" }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{bk.eventName || "—"}</div>
                          {bk.rateLabel && <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{bk.rateLabel}</div>}
                        </td>
                        <td style={{ padding: "11px 16px" }}>
                          {sp ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: (sp.color || "#5B8FE8") + "18", color: sp.color || "#5B8FE8", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                              <span style={{ width: 7, height: 7, borderRadius: "50%", background: sp.color || "#5B8FE8" }} />{sp.name}
                            </span>
                          ) : <span style={{ color: "var(--ink-4)" }}>—</span>}
                        </td>
                        <td style={{ padding: "11px 16px" }}>
                          <span style={{ background: statusStyle.bg, color: statusStyle.fg, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{statusStyle.label}</span>
                        </td>
                        <td style={{ padding: "11px 16px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            {bk.status === "opcion" && (
                              <button onClick={() => handleConfirmBooking(bk.id)} style={{ background: "#1F6A3A", color: "white", border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                                Confirmar
                              </button>
                            )}
                            <button onClick={() => handleDeleteBooking(bk.id)} style={{ background: "var(--bg-subtle)", color: "var(--ink-3)", border: "1px solid var(--line-1)", borderRadius: 7, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab: Espacios */}
        {activeTab === "spaces" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 14 }}>
            {spaces.map(sp => {
              const spBks     = bookings.filter(b => b.spaceId === sp.id);
              const spConfirmed = spBks.filter(b => b.status === "confirmado").length;
              const spPending   = spBks.filter(b => b.status === "opcion").length;
              const spColor     = sp.color || selVenue.color || "#5B8FE8";
              return (
                <div key={sp.id} style={{ border: `2px solid ${spColor}30`, borderRadius: 16, padding: 20, background: "var(--bg-panel)", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, width: 4, bottom: 0, background: spColor, borderRadius: "16px 0 0 16px" }} />
                  <div style={{ paddingLeft: 8 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: spColor }}>{sp.name}</div>
                        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3, textTransform: "capitalize" }}>
                          {sp.type || "Espacio"}{sp.capacity ? ` · ${sp.capacity} personas` : ""}
                        </div>
                      </div>
                      {sp.capacity && (
                        <span style={{ background: spColor + "18", color: spColor, padding: "4px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, flexShrink: 0 }}>{sp.capacity}p</span>
                      )}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div style={{ background: "#F8D4D420", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "#8B2A2A" }}>{spConfirmed}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>Confirmadas</div>
                      </div>
                      <div style={{ background: "#FEF3CD30", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "#8A6D00" }}>{spPending}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>En opción</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {spaces.length === 0 && (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 16px", color: "var(--ink-3)", fontSize: 13 }}>
                Sin espacios configurados para este venue.
              </div>
            )}
          </div>
        )}

        {/* Tab: Tarifas */}
        {activeTab === "tarifas" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {spaces.filter(sp => (sp.rates?.length || 0) > 0).map(sp => {
              const spColor = sp.color || selVenue.color || "#5B8FE8";
              return (
                <div key={sp.id} style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line-1)", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: spColor }} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{sp.name}</span>
                    {sp.capacity && <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{sp.capacity} personas</span>}
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--bg-subtle)" }}>
                        {["Tarifa", "Meses", "Días", "Zona", "Precio base", "Total c/IVA"].map(h => (
                          <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(sp.rates || []).map(r => {
                        const price = r.price ? parseFloat(r.price) : null;
                        const vatRate = r.vatRate ?? 21;
                        const total = price ? price * (1 + vatRate / 100) : null;
                        const fmtMonths = !r.months?.length ? "Todo el año" : r.months.map(m => MONTH_ABBR[m - 1]).join(", ");
                        return (
                          <tr key={r.id} style={{ borderTop: "1px solid var(--line-1)" }}>
                            <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600 }}>{r.label}</td>
                            <td style={{ padding: "11px 16px", fontSize: 12.5, color: "var(--ink-2)" }}>{fmtMonths}</td>
                            <td style={{ padding: "11px 16px", fontSize: 12.5, color: "var(--ink-2)" }}>{r.days ? `${r.days} día${r.days > 1 ? "s" : ""}` : "—"}</td>
                            <td style={{ padding: "11px 16px", fontSize: 12.5, color: "var(--ink-2)" }}>{r.zone || "—"}</td>
                            <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600 }}>{fmtEur(price)}</td>
                            <td style={{ padding: "11px 16px", fontSize: 12.5, color: "var(--ink-3)" }}>
                              {fmtEur(total)}
                              <span style={{ fontSize: 11, color: "var(--ink-4)", marginLeft: 5 }}>(+{vatRate}%)</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
            {spaces.every(sp => (sp.rates?.length || 0) === 0) && (
              <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--ink-3)", fontSize: 13 }}>
                Sin tarifas configuradas. Añádelas desde el módulo de Espacios.
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Venue list view ──
  const allSpaces = venues.flatMap(v => v.spaces);
  const listKpis = [
    { label: "Venues activos",        val: venues.length,     sub: "localizaciones",      color: "var(--ink-1)" },
    { label: "Espacios configurados", val: allSpaces.length,  sub: "en todos los venues", color: "#5B8FE8"      },
  ];

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Mis Venues</h1>
          <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "3px 0 0" }}>
            Gestiona todos tus espacios y disponibilidad
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, border: "none", background: "var(--ink-1)", color: "white", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
        >
          <IcoPlus size={15} /> Nuevo venue
        </button>
      </div>

      {/* KPIs */}
      {venues.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 20 }}>
          {listKpis.map((k, i) => (
            <div key={i} style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: "var(--r-md)", padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 3 }}>{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {venues.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 320, gap: 14, color: "var(--ink-3)" }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: "var(--bg-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IcoVenue size={28} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-2)" }}>No tienes fincas aún</div>
          <div style={{ fontSize: 13, textAlign: "center", maxWidth: 280 }}>
            Crea tu primera finca para gestionar espacios, tarifas y disponibilidad.
          </div>
          <button
            onClick={() => setShowNewForm(true)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, border: "none", background: "var(--ink-1)", color: "white", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
          >
            <IcoPlus size={15} /> Nueva finca
          </button>
        </div>
      )}

      {/* Venue grid */}
      {venues.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {venues.map(v => <VenueCard key={v.id} venue={v} onClick={() => setSelVenue(v)} />)}
        </div>
      )}

      {/* New venue modal */}
      {showNewForm && (
        <NewVenueModal
          onClose={() => setShowNewForm(false)}
          onCreate={handleCreateVenue}
        />
      )}
    </div>
  );
}
