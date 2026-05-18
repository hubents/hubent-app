"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, use } from "react";
import { EventSectionGuard } from "@/components/events/event-section-guard";
import {
  MapPinIcon,
  Mail01Icon,
  SmartPhone01Icon,
  GlobalIcon,
  UserIcon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface VenueSpace {
  id: number;
  name: string;
  capacity: number | null;
  type: string | null;
  color: string | null;
}

interface VenueBooking {
  id: number;
  venueId: number;
  spaceId: number | null;
  date: string;
  eventName: string | null;
  eventId: number | null;
  status: "confirmado" | "opcion" | "bloqueado" | "libre";
}

interface VenueInfo {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  contact: string | null;
  email: string | null;
  phone: string | null;
  web: string | null;
  cover: string | null;
}

interface VenueData {
  venue: VenueInfo | null;
  spaces: VenueSpace[];
  bookings: VenueBooking[];
  eventBookings: VenueBooking[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAY_NAMES = ["L","M","X","J","V","S","D"];

const STATUS_STYLES = {
  current:    { bg: "#D4E7F0", fg: "#2F6A85", dot: "#3A8FC0", label: "Tu evento"    },
  confirmado: { bg: "#F8D4D4", fg: "#8B2A2A", dot: "#C0392B", label: "Reservado"    },
  opcion:     { bg: "#FEF3CD", fg: "#8A6D00", dot: "#C4A832", label: "Opción"        },
  libre:      { bg: "#D9ECD1", fg: "#1F6A3A", dot: "#2F7D4F", label: "Disponible"   },
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EventVenuePage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations("eventDetail");
  const { id } = use(params);
  const eventId = parseInt(id, 10);

  const [data, setData] = useState<VenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSpace, setSelectedSpace] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Calendar month — default to current month
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  useEffect(() => {
    fetch(`/api/events/${eventId}/venue`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
          // Set calendar month to first event booking date
          if (res.data.eventBookings?.length) {
            const firstDate = new Date(res.data.eventBookings[0].date);
            setCalYear(firstDate.getFullYear());
            setCalMonth(firstDate.getMonth());
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return (
      <EventSectionGuard eventId={eventId} section="venue">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[200, 120, 400].map((h, i) => (
            <div key={i} style={{ height: h, borderRadius: "var(--r-md)", background: "var(--bg-subtle)", animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      </EventSectionGuard>
    );
  }

  if (!data?.venue) {
    return (
      <EventSectionGuard eventId={eventId} section="venue">
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--ink-3)" }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>{t("noVenueAssigned")}</div>
          <div style={{ fontSize: 13 }}>{t("noVenueDesc")}</div>
        </div>
      </EventSectionGuard>
    );
  }

  const { venue, spaces, bookings, eventBookings } = data;
  const eventDateSet = new Set(eventBookings.map((b) => b.date));

  // Calendar helpers
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const offset = (firstDay + 6) % 7;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const toIso = (day: number) =>
    `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const visibleBookings = selectedSpace === "all"
    ? bookings
    : bookings.filter((b) => String(b.spaceId) === selectedSpace);

  const dayStatus = (day: number): keyof typeof STATUS_STYLES => {
    const iso = toIso(day);
    if (eventDateSet.has(iso)) return "current";
    const dayB = visibleBookings.filter((b) => b.date === iso);
    if (dayB.some((b) => b.status === "confirmado")) return "confirmado";
    if (dayB.some((b) => b.status === "opcion")) return "opcion";
    return "libre";
  };

  const dayDetail = (day: number | null) => {
    if (day == null) return { booked: [], free: [] };
    const iso = toIso(day);
    const booked = bookings.filter((b) => b.date === iso && b.status !== "libre");
    const bookedSpaceIds = new Set(booked.map((b) => b.spaceId));
    const free = spaces.filter((s) => !bookedSpaceIds.has(s.id));
    return { booked, free };
  };

  const spaceById = (id: number | null) => spaces.find((s) => s.id === id);

  // KPIs
  const bookedDays = new Set(
    bookings.filter((b) => !eventDateSet.has(b.date) && b.status === "confirmado").map((b) => b.date)
  ).size;
  const currentDayCount = eventBookings.length;
  const freeWeekendDays = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]
    .filter((d) => {
      const day = d + 1;
      if (day > daysInMonth) return false;
      const dow = new Date(calYear, calMonth, day).getDay();
      if (dow !== 0 && dow !== 6) return false;
      const iso = toIso(day);
      return !bookings.some((b) => b.date === iso && b.status !== "libre");
    }).length;

  const detail = dayDetail(selectedDay);
  const locationStr = [venue.address, venue.city].filter(Boolean).join(", ");

  return (
    <EventSectionGuard eventId={eventId} section="venue">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Header venue ── */}
        <div style={{ borderRadius: "var(--r-md)", border: "1px solid var(--line-1)", overflow: "hidden", background: "var(--bg-panel)" }}>
          {venue.cover ? (
            <div style={{
              height: 130,
              backgroundImage: `url(${venue.cover})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              position: "relative",
            }}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 100%)" }} />
              <div style={{ position: "absolute", bottom: 16, left: 20, color: "white" }}>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>{venue.name}</div>
                {locationStr && (
                  <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                    <HugeiconsIcon icon={MapPinIcon} size={12} color="currentColor" />
                    {locationStr}
                  </div>
                )}
              </div>
              <div style={{ position: "absolute", top: 14, right: 16 }}>
                <span style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.3)", color: "white", padding: "4px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 600 }}>
                  {t("venueConfirmed")}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line-1)" }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{venue.name}</div>
              {locationStr && (
                <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <HugeiconsIcon icon={MapPinIcon} size={12} color="currentColor" />
                  {locationStr}
                </div>
              )}
            </div>
          )}

          <div style={{ padding: "12px 20px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0 }}>
            {[
              { icon: UserIcon, val: venue.contact },
              { icon: Mail01Icon, val: venue.email },
              { icon: SmartPhone01Icon, val: venue.phone },
              { icon: GlobalIcon, val: venue.web },
            ].map((row, i) => (
              row.val ? (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-2)", borderLeft: i > 0 ? "1px solid var(--line-1)" : "none", paddingLeft: i > 0 ? 20 : 0 }}>
                  <HugeiconsIcon icon={row.icon} size={13} color="var(--ink-4)" />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.val}</span>
                </div>
              ) : <div key={i} />
            ))}
          </div>
        </div>

        {/* ── KPIs ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[
            { label: t("venueSpaces"), val: spaces.length, sub: t("available") },
            { label: t("otherEventsMonth"), val: bookedDays, sub: t("occupiedDays") },
            { label: t("freeWeekends"), val: freeWeekendDays, sub: `${t("in")} ${MONTH_NAMES[calMonth]}` },
            { label: t("spacesInYourEvent"), val: currentDayCount, sub: t("yourBookings") },
          ].map((k, i) => (
            <div key={i} style={{ padding: "14px 16px", borderRadius: "var(--r-md)", border: "1px solid var(--line-1)", background: "var(--bg-panel)" }}>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 6 }}>{k.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>{k.val}</span>
                <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{k.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Calendario + detalle ── */}
        <div style={{ display: "grid", gridTemplateColumns: selectedDay != null ? "1fr 300px" : "1fr", gap: 14 }}>

          {/* Calendario */}
          <div style={{ padding: 20, borderRadius: "var(--r-md)", border: "1px solid var(--line-1)", background: "var(--bg-panel)" }}>

            {/* Navegación mes */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>
                {MONTH_NAMES[calMonth]} {calYear}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); setSelectedDay(null); }}
                  style={{ width: 28, height: 28, borderRadius: "var(--r-sm)", border: "1px solid var(--line-1)", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--ink-2)" }}
                >‹</button>
                <button
                  onClick={() => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); setSelectedDay(null); }}
                  style={{ width: 28, height: 28, borderRadius: "var(--r-sm)", border: "1px solid var(--line-1)", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--ink-2)" }}
                >›</button>
              </div>
            </div>

            {/* Filtro por espacio */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 500 }}>{t("space")}:</span>
              {[{ id: "all", name: t("all"), color: "var(--ink-2)" }, ...spaces.map((s) => ({ id: String(s.id), name: s.name, color: s.color || "#888" }))].map((s) => (
                <button key={s.id} onClick={() => setSelectedSpace(s.id)} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "4px 11px", borderRadius: 999, border: "1.5px solid",
                  borderColor: selectedSpace === s.id ? s.color : "var(--line-1)",
                  background: selectedSpace === s.id ? s.color + "18" : "transparent",
                  color: selectedSpace === s.id ? s.color : "var(--ink-3)",
                  fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                }}>
                  {s.id !== "all" && <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, flexShrink: 0 }} />}
                  {s.name}
                </button>
              ))}

              {/* Leyenda */}
              <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                {(Object.entries(STATUS_STYLES) as [keyof typeof STATUS_STYLES, typeof STATUS_STYLES[keyof typeof STATUS_STYLES]][]).map(([k, v]) => (
                  <div key={k} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--ink-3)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: v.dot, flexShrink: 0 }} />
                    {v.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Días de la semana */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5, marginBottom: 5 }}>
              {DAY_NAMES.map((d) => (
                <div key={d} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: ".06em", padding: "3px 0" }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Grid días */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>
              {Array.from({ length: offset }).map((_, i) => <div key={"e" + i} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const status = dayStatus(day);
                const s = STATUS_STYLES[status];
                const isSelected = selectedDay === day;
                const iso = toIso(day);
                const dayBs = visibleBookings.filter((b) => b.date === iso);

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                    style={{
                      aspectRatio: "1/1", borderRadius: "var(--r-sm)",
                      background: isSelected ? s.dot : s.bg,
                      border: `1.5px solid ${isSelected ? s.dot : "transparent"}`,
                      cursor: "pointer", display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", gap: 2,
                      transition: "transform .1s",
                    }}
                  >
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: isSelected ? "white" : s.fg }}>
                      {day}
                    </span>
                    {dayBs.length > 0 && (
                      <div style={{ display: "flex", gap: 2 }}>
                        {dayBs.slice(0, 4).map((b) => {
                          const sp = spaceById(b.spaceId);
                          return (
                            <span key={b.id} style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? "rgba(255,255,255,0.7)" : (sp?.color || "#888"), flexShrink: 0 }} />
                          );
                        })}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Panel detalle día */}
          {selectedDay != null && (() => {
            const iso = toIso(selectedDay);
            const { booked, free } = detail;
            return (
              <div style={{ padding: 18, borderRadius: "var(--r-md)", border: "1px solid var(--line-1)", background: "var(--bg-panel)", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>
                      {selectedDay} {t("of")} {MONTH_NAMES[calMonth]}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                      {booked.length} {booked.length !== 1 ? t("bookings") : t("booking")} · {free.length} {free.length !== 1 ? t("freeSpaces") : t("freeSpace")}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDay(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-4)", padding: 4, borderRadius: "var(--r-sm)" }}
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={15} color="currentColor" />
                  </button>
                </div>

                {booked.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-4)", marginBottom: 8 }}>{t("booked")}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {booked.map((b) => {
                        const isCurrent = eventDateSet.has(iso) && b.eventId === eventId;
                        const sc = isCurrent ? STATUS_STYLES.current : STATUS_STYLES[b.status as keyof typeof STATUS_STYLES] || STATUS_STYLES.confirmado;
                        const sp = spaceById(b.spaceId);
                        return (
                          <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: "var(--r-sm)", background: sc.bg, border: `1px solid ${sc.dot}22` }}>
                            <span style={{ width: 9, height: 9, borderRadius: "50%", background: sp?.color || "#888", flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: sc.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.eventName || t("noName")}</div>
                              {sp && <div style={{ fontSize: 11, color: sc.fg, opacity: 0.75 }}>{sp.name}</div>}
                            </div>
                            <span style={{ fontSize: 10.5, fontWeight: 600, color: sc.fg, opacity: 0.85, whiteSpace: "nowrap" }}>{sc.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {free.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-4)", marginBottom: 8 }}>{t("availableSpaces")}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {free.map((s) => (
                        <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: "var(--r-sm)", background: "#D9ECD1", border: "1px solid #4F7A5E22" }}>
                          <span style={{ width: 9, height: 9, borderRadius: "50%", background: s.color || "#888", flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1F6A3A" }}>{s.name}</div>
                            {(s.capacity || s.type) && (
                              <div style={{ fontSize: 11, color: "#1F6A3A", opacity: 0.75 }}>
                                {[s.capacity ? `${s.capacity} ${t("persons")}` : null, s.type].filter(Boolean).join(" · ")}
                              </div>
                            )}
                          </div>
                          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} color="#1F6A3A" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {booked.length === 0 && free.length === 0 && (
                  <div style={{ textAlign: "center", color: "var(--ink-4)", fontSize: 12.5, padding: "20px 0" }}>{t("noDataForDay")}</div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </EventSectionGuard>
  );
}
