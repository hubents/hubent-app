"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { hgIcon } from "@/components/ui/hg-icon";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignIcon,
  Search01Icon,
  Notification01Icon,
  Calendar01Icon,
  Calendar03Icon,
  SmartPhone01Icon,
  Wallet01Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Tick01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";

const RiAddLine = hgIcon(PlusSignIcon);
const RiSearchLine = hgIcon(Search01Icon);
const RiCalendarLine = hgIcon(Calendar01Icon);
const RiCalendarEventLine = hgIcon(Calendar03Icon);
const RiPhoneLine = hgIcon(SmartPhone01Icon);
const RiMoneyDollarCircleLine = hgIcon(Wallet01Icon);
const RiArrowDownSLine = hgIcon(ArrowDown01Icon);
const RiArrowLeftSLine = hgIcon(ArrowLeft01Icon);
const RiArrowRightSLine = hgIcon(ArrowRight01Icon);
const RiCheckLine = hgIcon(Tick01Icon);
const RiSettings4Line = hgIcon(Settings01Icon);
import { EventScopedGuard } from "@/components/layout/event-scoped-guard";
import { BtnIcon, pillPrimaryStyle, pillGhostStyle, smallToolbarBtnStyle } from "@/components/ui/ds";
import { useCalendar } from "@/hooks/use-calendar";
import type { CalendarItem, CalendarItemType } from "@/lib/calendar";
import { CreateEventDrawer } from "@/components/events/create-event-drawer";
import { ScheduleDrawer } from "@/components/calendar/schedule-drawer";

// ─── Tab → underlying types mapping (matches prototype's 4 visible filters) ──
type FilterKey = "reuniones" | "eventos" | "pagos";
const TAB_TYPES: Record<"todos" | FilterKey, CalendarItemType[]> = {
  todos:     ["event", "task", "meeting", "payment", "task_payment", "document", "lead", "schedule"],
  reuniones: ["meeting", "schedule"],
  eventos:   ["event"],
  pagos:     ["payment", "task_payment"],
};

// ─── Visual style per tab — pastel block with colored left border ──
const TAB_BLOCK_STYLE: Record<string, { bg: string; border: string; accent: string }> = {
  reuniones: { bg: "#F2EEFC", border: "#C9BDEE", accent: "#7A5CAC" },
  eventos:   { bg: "#FBE9D5", border: "#F0C99A", accent: "#C77D2B" },
  pagos:     { bg: "#FCE8E4", border: "#F0BFB6", accent: "#B8412D" },
  default:   { bg: "#EEF2EE", border: "#D0D9CE", accent: "#4F7A5E" },
};

const tabFor = (type: CalendarItemType): keyof typeof TAB_BLOCK_STYLE => {
  if (TAB_TYPES.reuniones.includes(type)) return "reuniones";
  if (TAB_TYPES.eventos.includes(type)) return "eventos";
  if (TAB_TYPES.pagos.includes(type)) return "pagos";
  return "default";
};

// Mon=0 ... Sun=6 — JS Date.getDay() returns Sun=0 so we shift.
const dayIndex = (d: Date) => (d.getDay() + 6) % 7;

const startOfWeek = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - dayIndex(d));
  return d;
};

const fmtTime = (h: number) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  const period = hh >= 12 ? "PM" : "AM";
  const display = hh > 12 ? hh - 12 : hh === 0 ? 12 : hh;
  return `${display}:${String(mm).padStart(2, "0")} ${period}`;
};

const parseTime = (t?: string | null): number | null => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h)) return null;
  return h + (m || 0) / 60;
};

interface PositionedItem {
  item: CalendarItem;
  col: number; // 0..6 (Mon..Sun)
  startH: number;
  endH: number;
  hasTime: boolean;
}

// ─── Main page wrapper ──
export default function CalendarPage() {
  return (
    <EventScopedGuard>
      <CalendarPageContent />
    </EventScopedGuard>
  );
}

/**
 * Reusable calendar UI shared between the global view (no eventId) and the
 * in-event workspace (with eventId, scoped). The in-event call passes
 * `defaultRange="next30"` so the monthly grid is the entry view, since the
 * weekly grid is more useful as a "what's happening this week" filter on
 * the global page.
 */
export function CalendarPageContent({
  eventId,
  defaultRange = "week",
}: {
  eventId?: number;
  defaultRange?: "week" | "next7" | "next30";
} = {}) {
  const router = useRouter();

  const {
    items,
    loading,
    setMonth,
    setYear,
    refetch,
  } = useCalendar({
    eventId,
    visibleTypes: ["event", "task", "meeting", "payment", "task_payment", "document", "lead", "schedule"],
    filterKey: eventId
      ? `hubents-calendar-filters-event-${eventId}`
      : "hubents-calendar-filters-general",
  });

  // ── State (toolbar / filters) ──
  // Multi-select filter chips. Empty set = "Todo programado" (show all types);
  // any combination of the others narrows the view to the union of their types.
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());
  const toggleFilter = (k: FilterKey) =>
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  const clearFilters = () => setActiveFilters(new Set());
  const allowedFilterTypes = useMemo<CalendarItemType[]>(() => {
    if (activeFilters.size === 0) return TAB_TYPES.todos;
    const out = new Set<CalendarItemType>();
    for (const k of activeFilters) for (const t of TAB_TYPES[k]) out.add(t);
    return Array.from(out);
  }, [activeFilters]);
  const [searchQ, setSearchQ] = useState("");
  const [rangeMode, setRangeMode] = useState<"week" | "next7" | "next30">(defaultRange);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  // Month-step offset for the next30 view. weekOffset already drives the
  // weekly hour-grid; this one shifts the monthly grid by whole months so the
  // header arrows can flip page-by-page.
  const [monthOffset, setMonthOffset] = useState(0);
  const rangeRef = useRef<HTMLDivElement>(null);

  // ── Two parallel fetches that complement /api/calendar (which is week-bound):
  //   • /api/calendar with a ±2-year window for items that already have dates
  //   • /api/events as a direct fallback so events outside the calendar window
  //     (very old or scheduled far ahead) still show in highlights/counters.
  const [upcomingItems, setUpcomingItems] = useState<CalendarItem[]>([]);
  // Events with no `date` set — calendar excludes them but they still count
  // toward the "Eventos" total. We surface them in a separate pill row.
  const [undatedEvents, setUndatedEvents] = useState<
    Array<{ id: number; name: string; href: string; location?: string | null; status?: string | null }>
  >([]);

  const fetchUpcoming = useCallback(async () => {
    const start = new Date();
    start.setFullYear(start.getFullYear() - 2);
    const end = new Date();
    end.setFullYear(end.getFullYear() + 2);
    const fmt = (d: Date) => d.toISOString().split("T")[0];

    // When scoped to a specific event, only fetch that event's items.
    if (eventId) {
      const calRes = await fetch(`/api/calendar?from=${fmt(start)}&to=${fmt(end)}&eventId=${eventId}`)
        .then((r) => r.json()).catch(() => null);
      if (calRes?.success && Array.isArray(calRes.data)) {
        setUpcomingItems(calRes.data as CalendarItem[]);
      }
      setUndatedEvents([]);
      return;
    }

    const [calRes, evRes] = await Promise.all([
      fetch(`/api/calendar?from=${fmt(start)}&to=${fmt(end)}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/events?limit=500`).then((r) => r.json()).catch(() => null),
    ]);
    const map = new Map<string, CalendarItem>();
    const undated: typeof undatedEvents = [];
    if (calRes?.success && Array.isArray(calRes.data)) {
      for (const it of calRes.data as CalendarItem[]) map.set(it.id, it);
    }
    if (evRes?.success && Array.isArray(evRes.data)) {
      for (const ev of evRes.data as Array<{ id: number; name: string; date: string | null; location?: string | null; status?: string | null }>) {
        if (!ev.date) {
          undated.push({
            id: ev.id,
            name: ev.name,
            href: `/dashboard/events/${ev.id}`,
            location: ev.location ?? undefined,
            status: ev.status ?? undefined,
          });
          continue;
        }
        const key = `event-${ev.id}`;
        if (map.has(key)) continue;
        map.set(key, {
          id: key,
          type: "event",
          title: ev.name,
          date: ev.date.split("T")[0],
          color: "bg-blue-500",
          href: `/dashboard/events/${ev.id}`,
          meta: {
            status: ev.status ?? undefined,
            location: ev.location ?? undefined,
          },
        });
      }
    }
    setUpcomingItems(Array.from(map.values()));
    setUndatedEvents(undated);
  }, [eventId]);

  useEffect(() => {
    // Lint flags this as "setState in effect" because fetchUpcoming eventually
    // calls setUpcomingItems; that's the intended behavior here (initial load).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchUpcoming();
  }, [fetchUpcoming]);

  // Trigger both refetches (week-bound + wide window) after a create.
  const refreshAll = useCallback(() => {
    refetch();
    fetchUpcoming();
  }, [refetch, fetchUpcoming]);

  // Close range popover on outside click
  useEffect(() => {
    if (!rangeOpen) return;
    const handler = (e: MouseEvent) => {
      if (rangeRef.current && !rangeRef.current.contains(e.target as Node)) {
        setRangeOpen(false);
      }
    };
    const id = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handler);
    };
  }, [rangeOpen]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const weekStart = useMemo(() => {
    const d = startOfWeek(today);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [today, weekOffset]);

  // Month/year that the hook fetches — keep it tied to the current week
  useEffect(() => {
    setMonth(weekStart.getMonth() + 1);
    setYear(weekStart.getFullYear());
  }, [weekStart, setMonth, setYear]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  // ── Filter items by active chips + search.  Source = wide-window when ready,
  // week-bound `items` as fallback while the wide fetch is loading. ──
  const filteredItems = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    const source = upcomingItems.length > 0 ? upcomingItems : items;
    return source.filter((it) => {
      if (!allowedFilterTypes.includes(it.type)) return false;
      if (q && !it.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, upcomingItems, allowedFilterTypes, searchQ]);

  // ── Items grouped onto the week grid (only those with explicit time) ──
  const weekItems: PositionedItem[] = useMemo(() => {
    const out: PositionedItem[] = [];
    for (const it of filteredItems) {
      const d = new Date(it.date);
      d.setHours(0, 0, 0, 0);
      const startMs = weekStart.getTime();
      const endMs = startMs + 7 * 24 * 60 * 60 * 1000;
      if (d.getTime() < startMs || d.getTime() >= endMs) continue;
      const col = Math.floor((d.getTime() - startMs) / (24 * 60 * 60 * 1000));
      const startH = parseTime(it.time);
      if (startH === null) continue; // all-day items go to the top strip, not the grid
      const eh = Math.min(startH + 1, 23);
      out.push({ item: it, col, startH, endH: eh, hasTime: true });
    }
    return out;
  }, [filteredItems, weekStart]);

  // ── All-day items grouped by column (no explicit time → shown in top strip) ──
  const allDayByCol: Record<number, CalendarItem[]> = useMemo(() => {
    const map: Record<number, CalendarItem[]> = {};
    for (const it of filteredItems) {
      const d = new Date(it.date);
      d.setHours(0, 0, 0, 0);
      const startMs = weekStart.getTime();
      const endMs = startMs + 7 * 24 * 60 * 60 * 1000;
      if (d.getTime() < startMs || d.getTime() >= endMs) continue;
      if (parseTime(it.time) !== null) continue; // skip timed items
      const col = Math.floor((d.getTime() - startMs) / (24 * 60 * 60 * 1000));
      if (!map[col]) map[col] = [];
      map[col].push(it);
    }
    return map;
  }, [filteredItems, weekStart]);

  // ── Hour range — stretch to fit items, default 8-20 to cover most cases ──
  const { hourMin, hourMax } = useMemo(() => {
    let lo = 8;
    let hi = 20;
    for (const w of weekItems) {
      if (w.startH < lo) lo = Math.floor(w.startH);
      if (w.endH > hi) hi = Math.ceil(w.endH);
    }
    return { hourMin: lo, hourMax: hi };
  }, [weekItems]);
  const hours = useMemo(
    () => Array.from({ length: hourMax - hourMin }, (_, i) => hourMin + i),
    [hourMin, hourMax],
  );
  const HOUR_H = 82;

  // ── Counts per tab (for the underline tabs) — based on the wider window so
  // tenant-wide totals are accurate even when the visible week is empty.
  // Undated events still count toward "todos" and "eventos". ──
  const counts = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    const inSearch = (it: { title?: string; name?: string }) => {
      if (!q) return true;
      return (it.title || it.name || "").toLowerCase().includes(q);
    };
    const source = upcomingItems.length > 0 ? upcomingItems : items;
    const all = source.filter(inSearch);
    const undatedMatches = undatedEvents.filter(inSearch).length;
    return {
      todos:     all.length + undatedMatches,
      reuniones: all.filter((i) => TAB_TYPES.reuniones.includes(i.type)).length,
      eventos:   all.filter((i) => TAB_TYPES.eventos.includes(i.type)).length + undatedMatches,
      pagos:     all.filter((i) => TAB_TYPES.pagos.includes(i.type)).length,
    };
  }, [items, upcomingItems, searchQ, undatedEvents]);

  // ── Monthly grid (next30 view) — 5 rows × 7 cols starting on the Monday of
  //    the week that contains the anchor (today + monthOffset months), so the
  //    30-day window always fits inside. ──
  const monthAnchor = useMemo(() => {
    const d = new Date(today);
    d.setMonth(today.getMonth() + monthOffset);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [today, monthOffset]);
  const monthGridStart = useMemo(() => startOfWeek(monthAnchor), [monthAnchor]);
  const monthGridDays = useMemo(
    () =>
      Array.from({ length: 35 }, (_, i) => {
        const d = new Date(monthGridStart);
        d.setDate(monthGridStart.getDate() + i);
        return d;
      }),
    [monthGridStart],
  );
  const next30End = useMemo(() => {
    const d = new Date(monthAnchor);
    d.setDate(monthAnchor.getDate() + 29);
    return d;
  }, [monthAnchor]);
  const itemsByDateKey = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const it of filteredItems) {
      const arr = map.get(it.date);
      if (arr) arr.push(it);
      else map.set(it.date, [it]);
    }
    // Sort each day's items: timed first (chronological), then all-day
    for (const list of map.values()) {
      list.sort((a, b) => {
        const ta = parseTime(a.time) ?? 99;
        const tb = parseTime(b.time) ?? 99;
        return ta - tb;
      });
    }
    return map;
  }, [filteredItems]);
  const dateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const monthFmt = useMemo(() => {
    const ref = rangeMode === "next30" ? monthAnchor : weekStart;
    return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(ref);
  }, [rangeMode, monthAnchor, weekStart]);

  // Range label and dynamic date-range pill text
  const fmtShort = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" });
  const fmtYear = new Intl.DateTimeFormat("es-ES", { year: "numeric" });

  let rangeStart: Date;
  let rangeEnd: Date;
  if (rangeMode === "next7") {
    rangeStart = new Date(today);
    rangeEnd = new Date(today);
    rangeEnd.setDate(rangeStart.getDate() + 6);
  } else if (rangeMode === "next30") {
    rangeStart = new Date(monthAnchor);
    rangeEnd = new Date(next30End);
  } else {
    rangeStart = new Date(weekStart);
    rangeEnd = new Date(weekStart);
    rangeEnd.setDate(weekStart.getDate() + 4);
  }
  const rangeLabel =
    rangeMode === "next7" ? "Próximos 7 días" :
    rangeMode === "next30" ? "Próximos 30 días" :
    "Esta semana";
  const rangeFmt = rangeStart.getFullYear() === rangeEnd.getFullYear()
    ? `${fmtShort.format(rangeStart)} – ${fmtShort.format(rangeEnd)} ${fmtYear.format(rangeEnd)}`
    : `${fmtShort.format(rangeStart)} ${fmtYear.format(rangeStart)} – ${fmtShort.format(rangeEnd)} ${fmtYear.format(rangeEnd)}`;

  // ── 4 highlight cards: pick the 4 closest upcoming items from the wider
  // window so far-out items (3-6 months ahead) are surfaced. ──
  const highlights = useMemo(() => {
    const source = upcomingItems.length > 0 ? upcomingItems : items;
    return source
      .filter((it) => new Date(it.date).getTime() >= today.getTime())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 4);
  }, [items, upcomingItems, today]);

  const tabs: Array<{ id: "todos" | FilterKey; label: string; Icon: typeof RiCalendarLine; count: number }> = [
    { id: "todos",     label: "Todo programado", Icon: RiCalendarLine,      count: counts.todos },
    { id: "reuniones", label: "Videollamadas",   Icon: RiPhoneLine,         count: counts.reuniones },
    { id: "eventos",   label: "Eventos",         Icon: RiCalendarEventLine, count: counts.eventos },
    { id: "pagos",     label: "Pagos",           Icon: RiMoneyDollarCircleLine, count: counts.pagos },
  ];

  const dayNames = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

  return (
    <div className="space-y-4">
      {/* ── Toolbar (single row) ── */}
      <div className="flex items-center" style={{ gap: 8, flexWrap: "nowrap" }}>
        {/* Month nav */}
        <BtnIcon
          size="sm"
          type="button"
          onClick={() => {
            if (rangeMode === "next30") setMonthOffset((m) => m - 1);
            else setWeekOffset((w) => w - 4);
          }}
          aria-label="Mes anterior"
        >
          <RiArrowLeftSLine className="h-4 w-4" />
        </BtnIcon>
        <span
          className="capitalize"
          style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-1)", whiteSpace: "nowrap", minWidth: 130, textAlign: "center" }}
        >
          {monthFmt}
        </span>
        <BtnIcon
          size="sm"
          type="button"
          onClick={() => {
            if (rangeMode === "next30") setMonthOffset((m) => m + 1);
            else setWeekOffset((w) => w + 4);
          }}
          aria-label="Mes siguiente"
        >
          <RiArrowRightSLine className="h-4 w-4" />
        </BtnIcon>

        {/* Divider */}
        <span style={{ width: 1, height: 20, background: "var(--line-1)", flexShrink: 0 }} />

        {/* Hoy */}
        <button
          style={smallToolbarBtnStyle}
          onClick={() => { setWeekOffset(0); setMonthOffset(0); setRangeMode("week"); }}
        >
          Hoy
        </button>

        {/* Range selector */}
        <div ref={rangeRef} style={{ position: "relative" }}>
          <button style={smallToolbarBtnStyle} onClick={() => setRangeOpen((o) => !o)}>
            {rangeLabel}
            <RiArrowDownSLine className="h-3 w-3" />
          </button>
          {rangeOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                minWidth: 200,
                background: "white",
                border: "1px solid var(--line-1)",
                borderRadius: 10,
                boxShadow: "0 8px 24px rgba(15,16,18,.08)",
                padding: 6,
                zIndex: 30,
              }}
            >
              {([
                { v: "week", l: "Esta semana" },
                { v: "next7", l: "Próximos 7 días" },
                { v: "next30", l: "Próximos 30 días" },
              ] as const).map((o) => {
                const active = rangeMode === o.v;
                return (
                  <button
                    key={o.v}
                    onClick={() => { setRangeMode(o.v); setWeekOffset(0); setMonthOffset(0); setRangeOpen(false); }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 10px",
                      border: "none",
                      background: active ? "var(--bg-subtle)" : "transparent",
                      borderRadius: 6,
                      fontSize: 13,
                      color: "var(--ink-1)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ flex: 1 }}>{o.l}</span>
                    {active && <RiCheckLine className="h-3 w-3" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Date range pill */}
        <button style={{ ...smallToolbarBtnStyle, color: "var(--ink-2)" }}>
          <RiCalendarLine className="h-3 w-3" /> {rangeFmt}
        </button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ position: "relative" }}>
          <input
            placeholder="Buscar"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            style={{
              padding: "6px 10px 6px 30px",
              border: "1px solid var(--line-strong)",
              borderRadius: 8,
              fontSize: 12.5,
              width: 180,
              background: "white",
              fontFamily: "inherit",
              outline: "none",
              color: "var(--ink-1)",
            }}
          />
          <HugeiconsIcon
            icon={Search01Icon}
            size={12}
            strokeWidth={1.5}
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }}
          />
        </div>

        {/* Actions */}
        {!eventId && (
          <button style={pillGhostStyle} title="Agendar" onClick={() => setScheduleOpen(true)}>
            <RiCalendarLine className="h-3.5 w-3.5" /> Agendar
          </button>
        )}
        {!eventId && (
          <button style={pillPrimaryStyle} onClick={() => setCreateOpen(true)} title="Crear evento">
            <RiAddLine className="h-3.5 w-3.5" /> Crear evento
          </button>
        )}
        <BtnIcon title="Ajustes" aria-label="Ajustes">
          <RiSettings4Line className="h-4 w-4" />
        </BtnIcon>
      </div>

      <CreateEventDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        onEventCreated={refreshAll}
      />

      <ScheduleDrawer
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onCreated={refreshAll}
      />

      {/* ── Filter tabs (underline) ── */}
      <div
        className="flex"
        style={{
          gap: 20,
          borderBottom: "1px solid var(--line-1)",
          paddingBottom: 0,
        }}
      >
        {tabs.map((t) => {
          const isAll = t.id === "todos";
          const active = isAll
            ? activeFilters.size === 0
            : activeFilters.has(t.id as FilterKey);
          const Icon = t.Icon;
          // Same accent the chips use in the calendar — keeps the legend and the items color-matched.
          const tabAccent = isAll
            ? "var(--ink-1)"
            : TAB_BLOCK_STYLE[t.id as FilterKey].accent;
          return (
            <button
              key={t.id}
              onClick={() => (isAll ? clearFilters() : toggleFilter(t.id as FilterKey))}
              className="cursor-pointer inline-flex items-center"
              style={{
                background: "none",
                border: "none",
                padding: "10px 0",
                fontSize: 13,
                color: tabAccent,
                opacity: active ? 1 : 0.65,
                fontWeight: active ? 600 : 500,
                borderBottom: active ? `2px solid ${tabAccent}` : "2px solid transparent",
                marginBottom: -1,
                gap: 6,
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label} ({t.count})
            </button>
          );
        })}
      </div>

      {/* ── 4 highlight cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: 12 }}>
        {(loading ? Array.from({ length: 4 }) : highlights).map((it, i) => (
          <HighlightCard key={i} item={it as CalendarItem | undefined} loading={loading} />
        ))}
      </div>

      {/* ── Undated events — only when "Eventos" or "todos" filter is active ── */}
      {undatedEvents.length > 0 &&
        (activeFilters.size === 0 || activeFilters.has("eventos")) && (
          <div
            style={{
              background: "white",
              border: "1px dashed var(--line-1)",
              borderRadius: 12,
              padding: "10px 12px",
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--ink-2)",
                marginRight: 4,
              }}
            >
              Sin fecha asignada · {undatedEvents.length}
            </span>
            {undatedEvents.map((ev) => {
              const blockStyle = TAB_BLOCK_STYLE.eventos;
              return (
                <button
                  key={`undated-event-${ev.id}`}
                  type="button"
                  onClick={() => router.push(ev.href)}
                  title={ev.name}
                  className="cursor-pointer truncate"
                  style={{
                    background: blockStyle.bg,
                    border: `1px solid ${blockStyle.border}`,
                    borderLeft: `3px solid ${blockStyle.accent}`,
                    borderRadius: 6,
                    padding: "5px 10px",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--ink-1)",
                    maxWidth: 220,
                  }}
                >
                  {ev.name}
                </button>
              );
            })}
          </div>
        )}

      {/* ── Calendar body — monthly grid (next30) or weekly hour-grid ── */}
      {rangeMode === "next30" ? (
        <div
          style={{
            background: "white",
            border: "1px solid var(--line-1)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {/* Day-name header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              borderBottom: "1px solid var(--line-1)",
            }}
          >
            {dayNames.map((n, i) => (
              <div
                key={i}
                style={{
                  padding: "10px 12px",
                  borderLeft: i === 0 ? "none" : "1px solid var(--line-1)",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--ink-3)",
                  letterSpacing: ".06em",
                }}
              >
                {n}
              </div>
            ))}
          </div>
          {/* 5×7 day grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gridAutoRows: "minmax(118px, 1fr)",
            }}
          >
            {monthGridDays.map((d, i) => {
              const isToday = d.toDateString() === today.toDateString();
              const inRange =
                d.getTime() >= today.getTime() && d.getTime() <= next30End.getTime();
              const list = itemsByDateKey.get(dateKey(d)) || [];
              const visible = list.slice(0, 3);
              const overflow = list.length - visible.length;
              return (
                <div
                  key={i}
                  style={{
                    borderLeft: i % 7 === 0 ? "none" : "1px solid var(--line-1)",
                    borderTop: i >= 7 ? "1px solid var(--line-1)" : "none",
                    padding: 6,
                    background: isToday
                      ? "var(--bg-subtle)"
                      : inRange
                        ? "white"
                        : "#FAFAF8",
                    minHeight: 118,
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    minWidth: 0,
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="flex items-baseline"
                    style={{ marginBottom: 2, gap: 6 }}
                  >
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: isToday ? 700 : 600,
                        color: isToday
                          ? "var(--color-primary)"
                          : inRange
                            ? "var(--ink-1)"
                            : "var(--ink-3)",
                      }}
                    >
                      {String(d.getDate()).padStart(2, "0")}
                    </span>
                    {isToday && (
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 600,
                          color: "var(--color-primary)",
                          letterSpacing: ".06em",
                        }}
                      >
                        HOY
                      </span>
                    )}
                  </div>
                  {visible.map((item) => {
                    const blockStyle =
                      TAB_BLOCK_STYLE[tabFor(item.type)] || TAB_BLOCK_STYLE.default;
                    return (
                      <div
                        key={item.id}
                        onClick={() => router.push(item.href)}
                        title={item.title}
                        className="cursor-pointer"
                        style={{
                          background: blockStyle.bg,
                          border: `1px solid ${blockStyle.border}`,
                          borderLeft: `3px solid ${blockStyle.accent}`,
                          borderRadius: 6,
                          padding: "3px 6px",
                          fontSize: 10.5,
                          fontWeight: 500,
                          color: "var(--ink-1)",
                          lineHeight: 1.25,
                          minWidth: 0,
                          maxWidth: "100%",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          wordBreak: "break-word",
                        }}
                      >
                        {item.time ? `${item.time} · ` : ""}
                        {item.title}
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--ink-3)",
                        padding: "0 4px",
                        fontWeight: 500,
                      }}
                    >
                      +{overflow} más
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {!loading &&
            filteredItems.filter((it) => {
              const d = new Date(it.date);
              return (
                d.getTime() >= today.getTime() && d.getTime() <= next30End.getTime()
              );
            }).length === 0 && (
              <div
                className="text-center"
                style={{ padding: "24px 0", fontSize: 13, color: "var(--ink-3)" }}
              >
                No hay nada programado en los próximos 30 días
              </div>
            )}
        </div>
      ) : (
      <div
        style={{
          background: "white",
          border: "1px solid var(--line-1)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {/* Header — week navigation + day labels */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "60px repeat(7, minmax(0, 1fr))",
            borderBottom: "1px solid var(--line-1)",
            background: "white",
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              gap: 2,
              padding: 8,
              borderRight: "1px solid var(--line-1)",
            }}
          >
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              className="cursor-pointer inline-flex items-center justify-center"
              style={{
                width: 22,
                height: 22,
                background: "transparent",
                border: "none",
                borderRadius: 4,
                color: "var(--ink-3)",
              }}
              aria-label="Semana anterior"
            >
              <RiArrowLeftSLine className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              className="cursor-pointer inline-flex items-center justify-center"
              style={{
                width: 22,
                height: 22,
                background: "transparent",
                border: "none",
                borderRadius: 4,
                color: "var(--ink-3)",
              }}
              aria-label="Semana siguiente"
            >
              <RiArrowRightSLine className="h-3.5 w-3.5" />
            </button>
          </div>
          {days.map((d, i) => {
            const isToday = d.toDateString() === today.toDateString();
            return (
              <div
                key={i}
                className="flex items-baseline"
                style={{
                  padding: "10px 12px",
                  borderLeft: i === 0 ? "none" : "1px solid var(--line-1)",
                  gap: 8,
                  background: isToday ? "var(--bg-subtle)" : "transparent",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--ink-1)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {String(d.getDate()).padStart(2, "0")}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: isToday ? "var(--color-primary)" : "var(--ink-3)",
                    fontWeight: 600,
                    letterSpacing: ".06em",
                  }}
                >
                  {dayNames[i]}
                  {isToday ? " · HOY" : ""}
                </span>
              </div>
            );
          })}
        </div>

        {/* All-day strip — items without explicit time, one row per day column */}
        {Object.keys(allDayByCol).length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "60px repeat(7, minmax(0, 1fr))",
              borderBottom: "1px solid var(--line-1)",
              background: "white",
            }}
          >
            <div
              className="text-right"
              style={{
                padding: "6px 10px",
                fontSize: 10.5,
                color: "var(--ink-3)",
                fontWeight: 600,
                borderRight: "1px solid var(--line-1)",
                textTransform: "uppercase",
                letterSpacing: ".06em",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              Todo día
            </div>
            {[0, 1, 2, 3, 4, 5, 6].map((di) => {
              const list = allDayByCol[di] || [];
              return (
                <div
                  key={di}
                  style={{
                    borderLeft: di === 0 ? "none" : "1px solid var(--line-1)",
                    padding: 4,
                    minHeight: 32,
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    minWidth: 0,
                    overflow: "hidden",
                  }}
                >
                  {list.map((item) => {
                    const style = TAB_BLOCK_STYLE[tabFor(item.type)] || TAB_BLOCK_STYLE.default;
                    return (
                      <div
                        key={item.id}
                        onClick={() => router.push(item.href)}
                        title={item.title}
                        className="cursor-pointer"
                        style={{
                          background: style.bg,
                          border: `1px solid ${style.border}`,
                          borderLeft: `3px solid ${style.accent}`,
                          borderRadius: 6,
                          padding: "3px 6px",
                          fontSize: 11,
                          fontWeight: 500,
                          color: "var(--ink-1)",
                          lineHeight: 1.2,
                          minWidth: 0,
                          maxWidth: "100%",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          wordBreak: "break-word",
                        }}
                      >
                        {item.title}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Body — hours grid + absolute event blocks */}
        <div style={{ position: "relative" }}>
          {hours.map((h) => (
            <div
              key={h}
              style={{
                display: "grid",
                gridTemplateColumns: "60px repeat(7, minmax(0, 1fr))",
                borderBottom: "1px solid var(--line-1)",
                minHeight: HOUR_H,
              }}
            >
              <div
                className="text-right"
                style={{
                  padding: "8px 10px",
                  fontSize: 11,
                  color: "var(--ink-3)",
                  fontWeight: 600,
                  borderRight: "1px solid var(--line-1)",
                }}
              >
                {h > 12 ? h - 12 : h === 0 ? 12 : h} {h >= 12 ? "PM" : "AM"}
              </div>
              {[0, 1, 2, 3, 4, 5, 6].map((di) => (
                <div
                  key={di}
                  style={{
                    borderLeft: di === 0 ? "none" : "1px solid var(--line-1)",
                    position: "relative",
                  }}
                />
              ))}
            </div>
          ))}

          {/* Absolute event overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              gridTemplateColumns: "60px repeat(7, minmax(0, 1fr))",
              pointerEvents: "none",
            }}
          >
            <div />
            {[0, 1, 2, 3, 4, 5, 6].map((di) => {
              const dayItems = weekItems.filter((w) => w.col === di);
              return (
                <div
                  key={di}
                  style={{
                    position: "relative",
                    // Mirrors hour-grid cell's borderLeft so columns align under border-box; without it event boxes clip the day-divider line.
                    borderLeft: di === 0 ? "none" : "1px solid transparent",
                  }}
                >
                  {dayItems.map((w) => {
                    const top = (w.startH - hourMin) * HOUR_H + 2;
                    const height = Math.max(28, (w.endH - w.startH) * HOUR_H - 4);
                    const style = TAB_BLOCK_STYLE[tabFor(w.item.type)] || TAB_BLOCK_STYLE.default;
                    return (
                      <div
                        key={w.item.id}
                        onClick={() => router.push(w.item.href)}
                        title={w.item.title}
                        style={{
                          position: "absolute",
                          top,
                          left: 4,
                          right: 4,
                          height,
                          background: style.bg,
                          border: `1px solid ${style.border}`,
                          borderLeft: `3px solid ${style.accent}`,
                          borderRadius: 8,
                          padding: "6px 8px",
                          fontSize: 11.5,
                          pointerEvents: "auto",
                          overflow: "hidden",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 600,
                            color: "var(--ink-1)",
                            lineHeight: 1.2,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            wordBreak: "break-word",
                          }}
                        >
                          {w.item.title}
                        </div>
                        <div style={{ color: "var(--ink-3)", fontSize: 10.5, fontWeight: 500 }}>
                          {w.hasTime
                            ? `${fmtTime(w.startH)} - ${fmtTime(w.endH)}`
                            : "Sin hora"}
                        </div>
                        {height > 56 && w.item.meta?.location && (
                          <div
                            className="truncate"
                            style={{
                              marginTop: "auto",
                              fontSize: 10.5,
                              color: "var(--ink-3)",
                              fontStyle: "italic",
                            }}
                          >
                            {w.item.meta.location}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {!loading && weekItems.length === 0 && (
          <div
            className="text-center"
            style={{ padding: "24px 0", fontSize: 13, color: "var(--ink-3)" }}
          >
            No hay nada programado en esta semana
          </div>
        )}
      </div>
      )}
    </div>
  );
}

// ─── Highlight card (top row) ──
function HighlightCard({ item, loading }: { item?: CalendarItem; loading?: boolean }) {
  if (loading) {
    return (
      <div
        style={{
          background: "white",
          border: "1px solid var(--line-1)",
          borderRadius: 12,
          padding: 14,
          minHeight: 96,
        }}
      >
        <div
          style={{
            height: 12,
            width: "70%",
            background: "var(--bg-subtle)",
            borderRadius: 4,
            marginBottom: 10,
          }}
        />
        <div
          style={{
            height: 10,
            width: "50%",
            background: "var(--bg-subtle)",
            borderRadius: 4,
          }}
        />
      </div>
    );
  }
  if (!item) {
    return (
      <div
        style={{
          background: "white",
          border: "1px dashed var(--line-1)",
          borderRadius: 12,
          padding: 14,
          minHeight: 96,
          color: "var(--ink-3)",
          fontSize: 12.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Sin elementos
      </div>
    );
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const itemDate = new Date(item.date);
  itemDate.setHours(0, 0, 0, 0);
  const daysDiff = Math.round(
    (itemDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
  const status: "today" | "soon" | "later" =
    daysDiff <= 0 ? "today" : daysDiff <= 3 ? "soon" : "later";
  const colorMap = {
    today: { dot: "#4F7A5E", bg: "#E3EADE", text: "#4F7A5E" },
    soon: { dot: "#C89B3C", bg: "#FAF1DC", text: "#8A671F" },
    later: { dot: "#8A8F86", bg: "#F0EFEC", text: "#6B7066" },
  }[status];
  const badgeLabel =
    daysDiff === 0
      ? "Hoy"
      : daysDiff === 1
        ? "Mañana"
        : daysDiff > 1
          ? `En ${daysDiff} días`
          : `Hace ${Math.abs(daysDiff)} días`;
  const dateLabel = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(itemDate);
  return (
    <div
      style={{
        background: "white",
        border: "1px solid var(--line-1)",
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div className="flex items-start" style={{ marginBottom: 6 }}>
        <div
          className="flex-1"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--ink-1)",
            lineHeight: 1.3,
          }}
        >
          {item.title}
        </div>
        <RiArrowDownSLine className="h-3 w-3" style={{ color: "var(--ink-3)" }} />
      </div>
      <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 10 }}>
        {item.time ? `${item.time}` : dateLabel}
      </div>
      <div
        className="flex items-center"
        style={{
          gap: 6,
          padding: "5px 9px",
          background: colorMap.bg,
          borderRadius: 8,
          fontSize: 11.5,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: colorMap.dot,
            display: "inline-block",
          }}
        />
        <span style={{ color: colorMap.text, fontWeight: 500 }}>{badgeLabel}</span>
        <span
          style={{
            marginLeft: "auto",
            color: colorMap.text,
            fontWeight: 500,
            fontSize: 11,
          }}
        >
          {dateLabel}
        </span>
      </div>
    </div>
  );
}

