"use client";

import { useState, useEffect, use, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useEvent } from "@/contexts/event-context";
import { useUserSessionContext } from "@/contexts/user-session-context";
import { useEventPermissions } from "@/hooks/use-event-permissions";
import { EventSectionGuard } from "@/components/events/event-section-guard";
import { Skeleton } from "@/components/ui/skeleton";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  Cancel01Icon,
  PlusSignIcon,
  Search01Icon,
  FilterIcon,
  ArrowDown01Icon,
  Tick01Icon,
  Upload01Icon,
  Download01Icon,
  File02Icon,
  UserMultipleIcon,
  Menu01Icon,
  GridViewIcon,
  GridIcon,
  RestaurantIcon,
  InformationCircleIcon,
  Alert01Icon,
} from "@hugeicons/core-free-icons";

const IcoX = hgIcon(Cancel01Icon);
const IcoPlus = hgIcon(PlusSignIcon);
const IcoSearch = hgIcon(Search01Icon);
const IcoFilter = hgIcon(FilterIcon);
const IcoChevDown = hgIcon(ArrowDown01Icon);
const IcoCheck = hgIcon(Tick01Icon);
const IcoUpload = hgIcon(Upload01Icon);
const IcoDownload = hgIcon(Download01Icon);
const IcoFile = hgIcon(File02Icon);
const IcoTeam = hgIcon(UserMultipleIcon);
const IcoList = hgIcon(Menu01Icon);
const IcoGrid = hgIcon(GridViewIcon);
const IcoTables = hgIcon(GridIcon);
const IcoUtensils = hgIcon(RestaurantIcon);
const IcoInfo = hgIcon(InformationCircleIcon);
const IcoAlert = hgIcon(Alert01Icon);

// =============================================================================
// Types — match the existing API contract (no schema changes)
// =============================================================================
interface Companion {
  id: number;
  fullName: string;
  menuPreference: string | null;
  dietaryRestrictions: string | null;
}

interface EventTable {
  id: number;
  name: string;
  capacity: number | null;
  guestCount: number;
  shape?: string | null;
  positionX?: number | null;
  positionY?: number | null;
}

interface GuestGroup {
  id: number;
  name: string;
  tableNumber: number | null;
  notes: string | null;
  guestCount?: number;
}

interface Guest {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  rsvpStatus: string | null;
  menuPreference: string | null;
  ageGroup: string | null;
  groupId: number | null;
  groupName: string | null;
  tableId: number | null;
  tableName: string | null;
  notes: string | null;
  companions: Companion[];
  companionCount: number;
  transport: { transportName: string | null; seats: number | null } | null;
}

interface Stats {
  total: number;
  confirmed: number;
  pending: number;
  declined: number;
  adults: number;
  children: number;
  babies: number;
  seated: number;
  totalCompanions: number;
  totalAttending: number;
}

// =============================================================================
// Constants — mirror prototype's WS_MENU_TYPES, WS_GUEST_GROUPS, AGE_OPTIONS
// =============================================================================
const DEFAULT_MENU_TYPES = [
  "Regular",
  "Vegetariano",
  "Vegano",
  "Pescado",
  "Carne",
  "Celíaco",
  "Infantil",
];

const DEFAULT_GROUPS = [
  "Familia novia",
  "Familia novio",
  "Amigos novia",
  "Amigos novio",
  "Trabajo",
];

const AGE_OPTIONS: { id: string; label: string }[] = [
  { id: "adult", label: "Adulto" },
  { id: "child", label: "Niño" },
  { id: "baby", label: "Bebé" },
];
const ageLabel = (id: string | null | undefined) =>
  AGE_OPTIONS.find((a) => a.id === id)?.label || "Adulto";
const ageFromLabel = (label: string) =>
  AGE_OPTIONS.find((a) => a.label === label)?.id || "adult";

// Map API rsvp status → prototype label
const rsvpLabel = (s: string | null | undefined) =>
  s === "confirmed"
    ? "Confirmado"
    : s === "declined"
      ? "Rechazado"
      : "Pendiente";
const rsvpFromLabel = (l: string) =>
  l === "Confirmado" ? "confirmed" : l === "Rechazado" ? "declined" : "pending";

type RowTone = "neutral" | "ink" | "success" | "warn" | "danger";

// =============================================================================
// Page
// =============================================================================
export default function EventGuestsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);
  const { setActiveEvent } = useEvent();
  const { eventScoped } = useUserSessionContext();
  const { canEdit } = useEventPermissions(eventId, eventScoped);
  const ed = canEdit("guests");

  const [guests, setGuests] = useState<Guest[]>([]);
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [tables, setTables] = useState<EventTable[]>([]);
  // Menu options come from rsvp_settings.menu_options — set by the user in the
  // RSVP editor and shared with the public RSVP form. Falls back to defaults
  // when the event hasn't customised the list yet.
  const [eventMenuOptions, setEventMenuOptions] = useState<string[]>([]);
  // We compute KPIs locally from `guests` for instant updates after edits;
  // `stats` from the API is only used as a sanity-check on initial load.
  const [, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [ageFilter, setAgeFilter] = useState<"all" | "adult" | "child" | "baby">("all");
  const [ageFilterOpen, setAgeFilterOpen] = useState(false);
  const ageFilterRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<"list" | "plan">("list");

  // Sorting
  type SortCol = "name" | "group" | "age" | "menu" | "table" | "rsvp";
  const [sortCol, setSortCol] = useState<SortCol>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const [addOpen, setAddOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);

  // Close age filter on outside click
  useEffect(() => {
    if (!ageFilterOpen) return;
    const h = (e: MouseEvent) => {
      if (ageFilterRef.current && !ageFilterRef.current.contains(e.target as Node)) {
        setAgeFilterOpen(false);
      }
    };
    const id = setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", h);
    };
  }, [ageFilterOpen]);

  // Fetch event + initial data
  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      try {
        const [eventRes, guestsRes, groupsRes, tablesRes, rsvpRes] = await Promise.all([
          fetch(`/api/events/${eventId}`),
          fetch(`/api/events/${eventId}/guests?page=1&limit=500`),
          fetch(`/api/events/${eventId}/guests?type=groups`),
          fetch(`/api/events/${eventId}/tables`),
          fetch(`/api/events/${eventId}/rsvp`),
        ]);
        if (cancelled) return;
        const eventData = await eventRes.json();
        if (eventData.success) setActiveEvent(eventData.data);
        const guestsData = await guestsRes.json();
        if (guestsData.success) {
          setGuests(guestsData.data?.data || []);
          if (guestsData.data?.stats) setStats(guestsData.data.stats);
        }
        const groupsData = await groupsRes.json();
        if (groupsData.success) setGroups(groupsData.data || []);
        const tablesData = await tablesRes.json();
        if (tablesData.success) setTables(tablesData.data || []);
        const rsvpData = await rsvpRes.json();
        if (rsvpData.success) {
          const opts = rsvpData.data?.settings?.menuOptions;
          if (Array.isArray(opts)) setEventMenuOptions(opts);
        }
      } catch (error) {
        console.error("Failed to fetch guests data:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const refetchGuests = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/guests?page=1&limit=500`);
      const data = await res.json();
      if (data.success) {
        setGuests(data.data?.data || []);
        if (data.data?.stats) setStats(data.data.stats);
      }
    } catch {
      /* ignore */
    }
  };

  const refetchGroups = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/guests?type=groups`);
      const data = await res.json();
      if (data.success) setGroups(data.data || []);
    } catch {
      /* ignore */
    }
  };

  const refetchTables = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/tables`);
      const data = await res.json();
      if (data.success) setTables(data.data || []);
    } catch {
      /* ignore */
    }
  };

  // Update guest
  const updateGuest = async (guestId: number, patch: Record<string, unknown>) => {
    setGuests((prev) =>
      prev.map((g) => (g.id === guestId ? { ...g, ...patch } : g)),
    );
    try {
      await fetch(`/api/events/${eventId}/guests/${guestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      await refetchGuests();
    } catch (error) {
      console.error("Failed to update guest:", error);
      toast.error("Error al actualizar invitado");
      await refetchGuests();
    }
  };

  // Compute KPIs (live from local state — fast on every change)
  const total = guests.length;
  const confirmed = guests.filter((g) => g.rsvpStatus === "confirmed").length;
  const pending = guests.filter(
    (g) => !g.rsvpStatus || g.rsvpStatus === "pending",
  ).length;
  const declined = guests.filter((g) => g.rsvpStatus === "declined").length;
  const adults = guests.filter((g) => (g.ageGroup || "adult") === "adult").length;
  const children = guests.filter((g) => g.ageGroup === "child").length;
  const babies = guests.filter((g) => g.ageGroup === "baby").length;

  // Menu type options — strictly the list set by the host in the RSVP editor
  // (rsvp_settings.menu_options). The list of menus the couple defines for the
  // RSVP is the single source of truth: same options appear in the per-guest
  // dropdown here, in the "Add Guest" drawer, and in the public RSVP form.
  // If the host hasn't customised the list yet, fall back to defaults.
  const menuTypeOptions = useMemo(() => {
    return eventMenuOptions.length > 0 ? eventMenuOptions : DEFAULT_MENU_TYPES;
  }, [eventMenuOptions]);

  // Group options for the "Grupo" select on each row — use real groups + defaults as fallback
  const groupNameOptions = useMemo(() => {
    const fromGroups = groups.map((g) => g.name);
    return ["Sin grupo", ...new Set([...DEFAULT_GROUPS, ...fromGroups])];
  }, [groups]);

  // Table options for the "Mesa" select
  const tableNameOptions = useMemo(
    () => ["Sin mesa", ...tables.map((t) => t.name)],
    [tables],
  );

  // Filter + sort
  const filtered = useMemo(() => {
    const base = guests.filter((g) => {
      const fullName = `${g.firstName} ${g.lastName || ""}`.toLowerCase();
      if (q && !fullName.includes(q.toLowerCase())) return false;
      const age = g.ageGroup || "adult";
      if (ageFilter !== "all" && age !== ageFilter) return false;
      return true;
    });
    const compare = (a: Guest, b: Guest) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const va = (() => {
        switch (sortCol) {
          case "name":
            return `${a.firstName} ${a.lastName || ""}`.toLowerCase();
          case "group":
            return (a.groupName || "").toLowerCase();
          case "age":
            return ageLabel(a.ageGroup).toLowerCase();
          case "menu":
            return (a.menuPreference || "").toLowerCase();
          case "table":
            return (a.tableName || "").toLowerCase();
          case "rsvp":
            return rsvpLabel(a.rsvpStatus);
        }
      })();
      const vb = (() => {
        switch (sortCol) {
          case "name":
            return `${b.firstName} ${b.lastName || ""}`.toLowerCase();
          case "group":
            return (b.groupName || "").toLowerCase();
          case "age":
            return ageLabel(b.ageGroup).toLowerCase();
          case "menu":
            return (b.menuPreference || "").toLowerCase();
          case "table":
            return (b.tableName || "").toLowerCase();
          case "rsvp":
            return rsvpLabel(b.rsvpStatus);
        }
      })();
      if (sortCol === "rsvp") {
        const o: Record<string, number> = {
          Confirmado: 0,
          Pendiente: 1,
          Rechazado: 2,
        };
        return (o[va as string] ?? 99) - (o[vb as string] ?? 99) * 1 * dir;
      }
      return va.localeCompare(vb) * dir;
    };
    return [...base].sort(compare);
  }, [guests, q, ageFilter, sortCol, sortDir]);

  if (loading) {
    return (
      <EventSectionGuard eventId={eventId} section="guests">
        <div className="flex flex-col gap-3.5">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </EventSectionGuard>
    );
  }

  return (
    <EventSectionGuard eventId={eventId} section="guests">
      <div className="flex flex-col gap-3.5">
        {!ed && (
          <div
            className="text-[12px] text-[var(--ink-2)] rounded-[8px] inline-flex items-center"
            style={{
              padding: "8px 12px",
              background: "var(--bg-subtle)",
              border: "1px solid var(--line-1)",
              width: "fit-content",
            }}
          >
            Modo solo lectura — no puedes hacer cambios en este módulo
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-2 flex-wrap">
          <SmallBtn icon={<IcoUpload className="h-3 w-3" />}>Importar CSV</SmallBtn>
          <SmallBtn icon={<IcoDownload className="h-3 w-3" />}>Exportar CSV</SmallBtn>
          <SmallBtn icon={<IcoFile className="h-3 w-3" />}>Descargar PDF</SmallBtn>
          {ed && (
            <SmallBtn
              icon={<IcoTeam className="h-3 w-3" />}
              onClick={() => setGroupOpen(true)}
            >
              + Grupo
            </SmallBtn>
          )}
          {ed && (
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-[8px] cursor-pointer transition-colors border-none"
              style={{
                background: "var(--color-primary)",
                color: "#FFFFFF",
                padding: "7px 14px",
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              <IcoPlus className="h-3 w-3" />
              Añadir Invitado
            </button>
          )}
        </div>

        {/* KPI Cards (pastel tints) */}
        <div className="grid grid-cols-4 gap-3">
          <GuestKpi label="Total" value={total} tone="white" />
          <GuestKpi label="Confirmados" value={confirmed} tone="success" />
          <GuestKpi label="Pendientes" value={pending} tone="warn" />
          <GuestKpi label="Cancelados" value={declined} tone="danger" />
        </div>

        {/* Visual dashboard — Grupos / Mesas / Menús */}
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          }}
        >
          {/* Grupos */}
          <DashboardCard
            title="Distribución de Grupos"
            icon={<IcoTeam className="h-4 w-4" />}
          >
            <div className="flex flex-col gap-2">
              {groupNameOptions
                .filter((g) => g !== "Sin grupo")
                .map((groupName) => {
                  const count = guests.filter(
                    (g) => (g.groupName || "Sin grupo") === groupName,
                  ).length;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <DashboardBar
                      key={groupName}
                      label={groupName}
                      count={count}
                      pct={pct}
                      color="var(--color-primary)"
                    />
                  );
                })}
              {(() => {
                const noGroup = guests.filter((g) => !g.groupName).length;
                if (noGroup === 0) return null;
                const pct = total > 0 ? Math.round((noGroup / total) * 100) : 0;
                return (
                  <DashboardBar
                    label="Sin grupo"
                    count={noGroup}
                    pct={pct}
                    color="#9B9B9B"
                  />
                );
              })()}
            </div>
          </DashboardCard>

          {/* Mesas */}
          <DashboardCard title="Mesas" icon={<IcoTables className="h-4 w-4" />}>
            <div className="flex flex-col gap-2">
              {tables.length === 0 ? (
                <div className="text-[12px] text-[var(--ink-3)] py-2 text-center">
                  No hay mesas creadas
                </div>
              ) : (
                <>
                  {tables.map((table) => {
                    const count = guests.filter(
                      (g) => g.tableName === table.name,
                    ).length;
                    const cap = table.capacity || 0;
                    const pct = cap > 0 ? Math.round((count / cap) * 100) : 0;
                    const barColor =
                      pct >= 80 ? "#4F7A5E" : pct >= 50 ? "#C89B3C" : "#9B9B9B";
                    return (
                      <div key={table.id} className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="flex justify-between mb-0.5">
                            <span className="text-[12px] text-[var(--ink-2)]">
                              {table.name}
                            </span>
                            <span className="text-[11px] text-[var(--ink-3)]">
                              {count}/{cap || "—"}
                            </span>
                          </div>
                          <div
                            style={{
                              height: 6,
                              background: "var(--bg-subtle)",
                              borderRadius: 999,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${Math.min(100, pct)}%`,
                                background: barColor,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div
                    className="rounded-[8px] mt-2 text-[11px] text-[var(--ink-2)]"
                    style={{
                      background: "var(--bg-subtle)",
                      padding: "8px 10px",
                    }}
                  >
                    <strong className="text-[var(--ink-1)]">Sin mesa:</strong>{" "}
                    {guests.filter((g) => !g.tableName).length} disponibles
                  </div>
                </>
              )}
            </div>
          </DashboardCard>

          {/* Menús */}
          <DashboardCard
            title="Menús Asignados"
            icon={<IcoUtensils className="h-4 w-4" />}
          >
            <div className="flex flex-col gap-2">
              {menuTypeOptions.slice(0, 5).map((menu) => {
                const count = guests.filter((g) => g.menuPreference === menu).length;
                const pct = confirmed > 0 ? Math.round((count / confirmed) * 100) : 0;
                return (
                  <DashboardBar
                    key={menu}
                    label={menu}
                    count={count}
                    pct={pct}
                    color="var(--color-primary)"
                  />
                );
              })}
              {(() => {
                const pendingMenu = guests.filter(
                  (g) => !g.menuPreference || g.menuPreference === "—",
                ).length;
                if (pendingMenu === 0) return null;
                return (
                  <div
                    className="rounded-[8px] mt-2 inline-flex items-center gap-2"
                    style={{
                      background: "var(--danger-bg)",
                      padding: "8px 10px",
                      fontSize: 11,
                      color: "var(--danger-ink)",
                      fontWeight: 500,
                    }}
                  >
                    <IcoAlert className="h-3.5 w-3.5" />
                    <strong>{pendingMenu}</strong> invitados sin menú asignado
                  </div>
                );
              })()}
            </div>
          </DashboardCard>
        </div>

        {/* Search + age filter + view toggle */}
        <div
          className="rounded-[12px] flex items-center gap-2.5 flex-wrap"
          style={{
            background: "#FFFFFF",
            border: "1px solid var(--line-1)",
            padding: 10,
          }}
        >
          <div
            className="flex items-center gap-2 rounded-[8px] flex-1"
            style={{
              background: "#FFFFFF",
              border: "1px solid var(--line-1)",
              padding: "8px 12px",
              minWidth: 220,
              maxWidth: 320,
            }}
          >
            <IcoSearch className="h-3.5 w-3.5 text-[var(--ink-3)]" />
            <input
              type="text"
              placeholder="Buscar invitados..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="flex-1 bg-transparent outline-none text-[13px] text-[var(--ink-1)] placeholder:text-[var(--ink-3)]"
            />
          </div>

          {/* Age filter */}
          <div ref={ageFilterRef} className="relative">
            <button
              onClick={() => setAgeFilterOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-[8px] cursor-pointer transition-colors"
              style={{
                padding: "7px 12px",
                fontSize: 12.5,
                fontWeight: 500,
                background: ageFilter !== "all" ? "var(--ink-1)" : "#FFFFFF",
                color: ageFilter !== "all" ? "#FFFFFF" : "var(--ink-1)",
                border: `1px solid ${
                  ageFilter !== "all" ? "var(--ink-1)" : "var(--line-strong)"
                }`,
              }}
            >
              <IcoFilter className="h-3 w-3" />
              {ageFilter === "all" ? "Edad" : ageLabel(ageFilter)}
              <IcoChevDown className="h-3 w-3" />
            </button>
            {ageFilterOpen && (
              <div
                className="absolute left-0 top-[calc(100%+4px)] min-w-[200px] rounded-[8px] p-1 z-50"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--line-1)",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                }}
              >
                {[
                  { v: "all" as const, l: "Todas las edades", n: total },
                  { v: "adult" as const, l: "Adultos", n: adults },
                  { v: "child" as const, l: "Niños", n: children },
                  { v: "baby" as const, l: "Bebés", n: babies },
                ].map((o) => {
                  const active = ageFilter === o.v;
                  return (
                    <button
                      key={o.v}
                      onClick={() => {
                        setAgeFilter(o.v);
                        setAgeFilterOpen(false);
                      }}
                      className="flex items-center w-full text-left cursor-pointer transition-colors border-none"
                      style={{
                        padding: "8px 10px",
                        background: active ? "var(--bg-subtle)" : "transparent",
                        borderRadius: 6,
                        fontSize: 13,
                        color: "var(--ink-1)",
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      <span className="flex-1">{o.l}</span>
                      <span className="text-[11px] text-[var(--ink-3)] mr-1.5">
                        {o.n}
                      </span>
                      {active && <IcoCheck className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className="ml-auto inline-flex"
            style={{
              border: "1px solid var(--line-strong)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setView("list")}
              className="inline-flex items-center gap-1.5 cursor-pointer border-none transition-colors"
              style={{
                padding: "6px 12px",
                background: view === "list" ? "var(--ink-1)" : "transparent",
                color: view === "list" ? "#FFFFFF" : "var(--ink-2)",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              <IcoList className="h-3 w-3" />
              Lista
            </button>
            <button
              onClick={() => setView("plan")}
              className="inline-flex items-center gap-1.5 cursor-pointer border-none transition-colors"
              style={{
                padding: "6px 12px",
                background: view === "plan" ? "var(--ink-1)" : "transparent",
                color: view === "plan" ? "#FFFFFF" : "var(--ink-2)",
                fontSize: 12,
                fontWeight: 500,
                borderLeft: "1px solid var(--line-strong)",
              }}
            >
              <IcoGrid className="h-3 w-3" />
              Plano
            </button>
          </div>
        </div>

        {/* List or plan */}
        {view === "list" ? (
          <div
            className="rounded-[12px] overflow-hidden"
            style={{ background: "#FFFFFF", border: "1px solid var(--line-1)" }}
          >
            {filtered.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px 1fr 130px 100px 130px 110px 130px",
                  gap: 10,
                  alignItems: "center",
                  padding: "8px 16px",
                  borderBottom: "1px solid var(--line-1)",
                  background: "#FFFFFF",
                }}
              >
                <div />
                {(
                  [
                    { label: "Nombre", col: "name" as SortCol },
                    { label: "Grupo", col: "group" as SortCol },
                    { label: "Edad", col: "age" as SortCol },
                    { label: "Menú", col: "menu" as SortCol },
                    { label: "Mesa", col: "table" as SortCol },
                    { label: "Estado", col: "rsvp" as SortCol },
                  ]
                ).map(({ label, col }) => (
                  <div
                    key={col}
                    onClick={() => toggleSort(col)}
                    className="flex items-center gap-1 cursor-pointer select-none"
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color:
                        sortCol === col ? "var(--ink-1)" : "var(--ink-3)",
                    }}
                  >
                    {label}
                    <span
                      className="text-[10px]"
                      style={{ opacity: sortCol === col ? 1 : 0.4 }}
                    >
                      {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {filtered.length === 0 ? (
              <div className="text-center py-12 px-6">
                <div
                  className="h-12 w-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                  style={{ background: "var(--bg-subtle)" }}
                >
                  <IcoTeam className="h-5 w-5 text-[var(--ink-3)]" />
                </div>
                <div className="text-[14px] font-semibold text-[var(--ink-1)] mb-1">
                  Sin invitados
                </div>
                <div
                  className="text-[12.5px] text-[var(--ink-3)] mx-auto mb-3"
                  style={{ maxWidth: 360 }}
                >
                  Añade tu primer invitado manualmente o importa desde CSV.
                </div>
                {ed && (
                  <button
                    onClick={() => setAddOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-[8px] cursor-pointer transition-colors border-none mx-auto"
                    style={{
                      background: "var(--color-primary)",
                      color: "#FFFFFF",
                      padding: "7px 14px",
                      fontSize: 12.5,
                      fontWeight: 600,
                    }}
                  >
                    <IcoPlus className="h-3 w-3" />
                    Añadir invitado
                  </button>
                )}
              </div>
            ) : (
              filtered.map((g, i) => (
                <GuestRow
                  key={g.id}
                  guest={g}
                  ed={ed}
                  isFirst={i === 0}
                  groupOptions={groupNameOptions}
                  groups={groups}
                  menuOptions={menuTypeOptions}
                  tableOptions={tableNameOptions}
                  tables={tables}
                  onUpdate={updateGuest}
                />
              ))
            )}
          </div>
        ) : (
          <SeatingPlan
            eventId={eventId}
            ed={ed}
            guests={guests}
            tables={tables}
            menuOptions={menuTypeOptions}
            onTablesChanged={refetchTables}
            onGuestsChanged={refetchGuests}
          />
        )}
      </div>

      {/* Add Guest Drawer */}
      {addOpen && (
        <AddGuestDrawer
          eventId={eventId}
          groupOptions={groupNameOptions.filter((g) => g !== "Sin grupo")}
          groups={groups}
          menuOptions={menuTypeOptions}
          onClose={() => setAddOpen(false)}
          onAdded={async () => {
            setAddOpen(false);
            await refetchGuests();
          }}
        />
      )}

      {/* Add Group Drawer */}
      {groupOpen && (
        <AddGroupDrawer
          eventId={eventId}
          onClose={() => setGroupOpen(false)}
          onAdded={async () => {
            setGroupOpen(false);
            await refetchGroups();
          }}
        />
      )}
    </EventSectionGuard>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function SmallBtn({
  icon,
  children,
  onClick,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-[8px] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--line-strong)",
        padding: "6px 12px",
        fontSize: 12,
        fontWeight: 500,
        color: "var(--ink-1)",
      }}
    >
      {icon}
      {children}
    </button>
  );
}

function GuestKpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "white" | "success" | "warn" | "danger";
}) {
  const bg: Record<string, string> = {
    white: "#FFFFFF",
    success: "#EDF5EE",
    warn: "#FBF4E3",
    danger: "#FBEDEC",
  };
  const fg: Record<string, string> = {
    white: "var(--ink-1)",
    success: "#4F7A5E",
    warn: "#B88325",
    danger: "#B55450",
  };
  return (
    <div
      className="rounded-[12px] text-center"
      style={{
        background: bg[tone],
        border: "1px solid var(--line-1)",
        padding: "18px 16px",
      }}
    >
      <div
        className="font-semibold"
        style={{
          fontSize: 30,
          color: fg[tone],
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        className="mt-1.5 font-medium"
        style={{
          fontSize: 12.5,
          color: tone === "white" ? "var(--ink-3)" : fg[tone],
        }}
      >
        {label}
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[12px]"
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--line-1)",
        padding: 14,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: "var(--ink-3)" }}>{icon}</span>
        <div className="text-[13px] font-semibold text-[var(--ink-1)]">{title}</div>
      </div>
      {children}
    </div>
  );
}

function DashboardBar({
  label,
  count,
  pct,
  color,
}: {
  label: string;
  count: number;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div
          className="text-[12px] text-[var(--ink-2)] mb-0.5 truncate"
          title={label}
        >
          {label}
        </div>
        <div
          style={{
            height: 6,
            background: "var(--bg-subtle)",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(100, pct)}%`,
              background: color,
              transition: "width 0.3s",
            }}
          />
        </div>
      </div>
      <div
        className="text-[12px] font-semibold text-[var(--ink-1)]"
        style={{ minWidth: 36, textAlign: "right" }}
      >
        {count}
      </div>
    </div>
  );
}

// =============================================================================
// Guest row — inline editing via segmented selects (prototype's RowSelect)
// =============================================================================

function GuestRow({
  guest,
  ed,
  isFirst,
  groupOptions,
  groups,
  menuOptions,
  tableOptions,
  tables,
  onUpdate,
}: {
  guest: Guest;
  ed: boolean;
  isFirst: boolean;
  groupOptions: string[];
  groups: GuestGroup[];
  menuOptions: string[];
  tableOptions: string[];
  tables: EventTable[];
  onUpdate: (id: number, patch: Record<string, unknown>) => void;
}) {
  const fullName = `${guest.firstName}${guest.lastName ? " " + guest.lastName : ""}`;
  const initial = fullName.charAt(0).toUpperCase();
  const ageId = guest.ageGroup || "adult";
  const ageTone: RowTone =
    ageId === "baby" ? "warn" : ageId === "child" ? "ink" : "neutral";
  const rsvpStr = rsvpLabel(guest.rsvpStatus);
  const rsvpTone: RowTone =
    rsvpStr === "Confirmado"
      ? "success"
      : rsvpStr === "Pendiente"
        ? "warn"
        : "danger";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "36px 1fr 130px 100px 130px 110px 130px",
        gap: 10,
        alignItems: "center",
        padding: "12px 16px",
        borderTop: isFirst ? "none" : "1px solid var(--line-1)",
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: "#F3F1ED",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--ink-2)",
        }}
      >
        {initial}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-[var(--ink-1)] truncate">
          {fullName}
        </div>
        <div className="flex gap-2.5 mt-0.5">
          {guest.email && (
            <span className="text-[11px] text-[var(--ink-3)] truncate">
              {guest.email}
            </span>
          )}
        </div>
      </div>
      <RowSelect
        value={guest.groupName || "Sin grupo"}
        options={groupOptions}
        disabled={!ed}
        tone="neutral"
        onChange={(v) => {
          if (v === "Sin grupo") {
            onUpdate(guest.id, { groupId: null });
          } else {
            // Find existing group, or create
            const matched = groups.find((g) => g.name === v);
            if (matched) onUpdate(guest.id, { groupId: matched.id });
            else onUpdate(guest.id, { groupName: v });
          }
        }}
      />
      <RowSelect
        value={ageLabel(ageId)}
        options={AGE_OPTIONS.map((a) => a.label)}
        disabled={!ed}
        tone={ageTone}
        onChange={(v) => onUpdate(guest.id, { ageGroup: ageFromLabel(v) })}
      />
      <RowSelect
        value={guest.menuPreference || "Menú"}
        options={["Menú", ...menuOptions]}
        disabled={!ed}
        tone="neutral"
        onChange={(v) =>
          onUpdate(guest.id, { menuPreference: v === "Menú" ? null : v })
        }
      />
      <RowSelect
        value={guest.tableName || "Sin mesa"}
        options={tableOptions}
        disabled={!ed}
        tone="neutral"
        onChange={(v) => {
          if (v === "Sin mesa") {
            onUpdate(guest.id, { tableId: null });
          } else {
            const matched = tables.find((t) => t.name === v);
            if (matched) onUpdate(guest.id, { tableId: matched.id });
          }
        }}
      />
      <RowSelect
        value={rsvpStr}
        options={["Pendiente", "Confirmado", "Rechazado"]}
        disabled={!ed}
        tone={rsvpTone}
        onChange={(v) => onUpdate(guest.id, { rsvpStatus: rsvpFromLabel(v) })}
      />
    </div>
  );
}

function RowSelect({
  value,
  options,
  onChange,
  disabled,
  tone = "neutral",
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
  tone?: RowTone;
}) {
  const tones: Record<
    RowTone,
    { bg: string; fg: string; bd: string }
  > = {
    neutral: {
      bg: "#FFFFFF",
      fg: "var(--ink-2)",
      bd: "var(--line-strong)",
    },
    ink: {
      bg: "#F3F1ED",
      fg: "var(--ink-1)",
      bd: "var(--line-strong)",
    },
    success: {
      bg: "#EDF5EE",
      fg: "#4F7A5E",
      bd: "rgba(79,122,94,0.35)",
    },
    warn: {
      bg: "#FBF4E3",
      fg: "#B88325",
      bd: "rgba(200,155,60,0.35)",
    },
    danger: {
      bg: "#FBEDEC",
      fg: "#B55450",
      bd: "rgba(181,84,80,0.30)",
    },
  };
  const t = tones[tone];
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          appearance: "none",
          width: "100%",
          padding: "5px 24px 5px 10px",
          border: `1px solid ${t.bd}`,
          borderRadius: 8,
          background: t.bg,
          color: t.fg,
          fontSize: 11.5,
          fontWeight: 500,
          fontFamily: "inherit",
          cursor: disabled ? "default" : "pointer",
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none absolute"
        style={{
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          color: t.fg,
          opacity: 0.7,
        }}
      >
        <IcoChevDown className="h-3 w-3" />
      </span>
    </div>
  );
}

// =============================================================================
// Drawers — Add Guest / Add Group
// =============================================================================

function AddGuestDrawer({
  eventId,
  groupOptions,
  groups,
  menuOptions,
  onClose,
  onAdded,
}: {
  eventId: number;
  groupOptions: string[];
  groups: GuestGroup[];
  menuOptions: string[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [d, setD] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    menu: "",
    group: "Sin grupo",
    age: "Adulto",
  });
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) =>
    setD((s) => ({ ...s, [k]: v }));
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = d.firstName.trim().length > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: d.firstName,
        lastName: d.lastName || undefined,
        email: d.email || undefined,
        phone: d.phone || undefined,
        ageGroup: ageFromLabel(d.age),
        menuPreference: d.menu || undefined,
      };
      if (d.group && d.group !== "Sin grupo") {
        const matched = groups.find((g) => g.name === d.group);
        if (matched) {
          payload.groupId = matched.id;
        } else {
          payload.groupName = d.group;
        }
      }
      const res = await fetch(`/api/events/${eventId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${d.firstName} añadido a la lista`);
        onAdded();
      } else {
        toast.error(data.error?.message || "Error al añadir invitado");
      }
    } catch (error) {
      console.error("Failed to add guest:", error);
      toast.error("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DrawerShell
      onClose={onClose}
      title="Añadir Invitado"
      subtitle='Se añadirá a la lista en estado "Pendiente"'
      onSubmit={handleSubmit}
      submitLabel={submitting ? "Añadiendo..." : "Añadir"}
      submitDisabled={!canSubmit || submitting}
    >
      <div
        className="grid gap-x-[18px] gap-y-3.5"
        style={{ gridTemplateColumns: "1fr 1fr" }}
      >
        <DrawerField label="Nombre" required>
          <input
            placeholder="Nombre"
            value={d.firstName}
            onChange={(e) => set("firstName", e.target.value)}
          />
        </DrawerField>
        <DrawerField label="Apellido">
          <input
            placeholder="Apellido"
            value={d.lastName}
            onChange={(e) => set("lastName", e.target.value)}
          />
        </DrawerField>
        <DrawerField label="Email">
          <input
            type="email"
            placeholder="email@ejemplo.com"
            value={d.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </DrawerField>
        <DrawerField label="Teléfono">
          <input
            placeholder="+34 600 000 000"
            value={d.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </DrawerField>
        <DrawerField label="Menú">
          <select value={d.menu} onChange={(e) => set("menu", e.target.value)}>
            <option value="">Seleccionar...</option>
            {menuOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </DrawerField>
        <DrawerField label="Grupo">
          <select value={d.group} onChange={(e) => set("group", e.target.value)}>
            <option value="Sin grupo">Sin grupo</option>
            {groupOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </DrawerField>
        <DrawerField label="Edad">
          <select value={d.age} onChange={(e) => set("age", e.target.value)}>
            {AGE_OPTIONS.map((a) => (
              <option key={a.id} value={a.label}>
                {a.label}
              </option>
            ))}
          </select>
        </DrawerField>
      </div>

      <div
        className="mt-5 rounded-[8px] flex items-start gap-2.5"
        style={{
          background: "var(--bg-subtle)",
          padding: 14,
          border: "1px solid var(--line-1)",
        }}
      >
        <span style={{ marginTop: 2, color: "var(--ink-3)" }}>
          <IcoInfo className="h-3.5 w-3.5" />
        </span>
        <div className="text-[12px] text-[var(--ink-2)] leading-[1.5]">
          Puedes asignar mesa, alergias y acompañantes después desde la lista.
          El invitado recibirá email de RSVP solo cuando publiques la
          invitación.
        </div>
      </div>
    </DrawerShell>
  );
}

function AddGroupDrawer({
  eventId,
  onClose,
  onAdded,
}: {
  eventId: number;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "group", name: name.trim(), notes }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Grupo "${name}" creado`);
        onAdded();
      } else {
        toast.error(data.error?.message || "Error al crear grupo");
      }
    } catch (error) {
      console.error("Failed to add group:", error);
      toast.error("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DrawerShell
      onClose={onClose}
      title="Añadir Grupo"
      subtitle="Organiza invitados por grupos (familia, amigos, trabajo...)"
      onSubmit={handleSubmit}
      submitLabel={submitting ? "Creando..." : "Crear grupo"}
      submitDisabled={!name.trim() || submitting}
    >
      <div className="flex flex-col gap-3.5">
        <DrawerField label="Nombre del grupo" required>
          <input
            placeholder="Ej. Familia novia"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </DrawerField>
        <DrawerField label="Notas">
          <textarea
            rows={3}
            placeholder="Notas opcionales..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ resize: "vertical" }}
          />
        </DrawerField>
      </div>
    </DrawerShell>
  );
}

function DrawerShell({
  onClose,
  title,
  subtitle,
  children,
  onSubmit,
  submitLabel,
  submitDisabled,
}: {
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onSubmit: () => void;
  submitLabel: string;
  submitDisabled?: boolean;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(30,25,20,0.28)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 100,
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="drawer-form-field"
        style={{
          width: "min(720px, 96vw)",
          background: "#FFFFFF",
          boxShadow: "-20px 0 40px -10px rgba(0,0,0,.18)",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          borderLeft: "1px solid var(--line-1)",
        }}
      >
        <div
          className="flex items-center"
          style={{ padding: "16px 20px", borderBottom: "1px solid var(--line-1)" }}
        >
          <div>
            <div
              className="text-[16px] font-semibold text-[var(--ink-1)]"
              style={{ letterSpacing: "-0.01em" }}
            >
              {title}
            </div>
            {subtitle && (
              <div className="text-[12px] text-[var(--ink-3)] mt-0.5">
                {subtitle}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-auto bg-transparent border-none cursor-pointer p-1.5 text-[var(--ink-3)]"
          >
            <IcoX className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto" style={{ padding: "20px 22px" }}>
          {children}
        </div>
        <div
          className="flex gap-2 justify-end"
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--line-1)",
            background: "var(--bg-subtle)",
          }}
        >
          <button
            onClick={onClose}
            className="inline-flex items-center rounded-[8px] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
            style={{
              background: "#FFFFFF",
              border: "1px solid var(--line-strong)",
              padding: "8px 14px",
              fontSize: 12.5,
              fontWeight: 500,
              color: "var(--ink-1)",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={submitDisabled}
            aria-disabled={submitDisabled}
            className="inline-flex items-center gap-1.5 rounded-[8px] cursor-pointer transition-colors border-none"
            style={{
              background: "var(--color-primary)",
              color: "#FFFFFF",
              padding: "8px 14px",
              fontSize: 12.5,
              fontWeight: 600,
              opacity: submitDisabled ? 0.5 : 1,
            }}
          >
            <IcoPlus className="h-3 w-3" />
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function DrawerField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-medium text-[var(--ink-2)]">
        {label}
        {required && <span style={{ color: "var(--color-danger)" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

// =============================================================================
// SeatingPlan — drag-and-drop floor plan (mirrors prototype WsSeatingPlan)
// =============================================================================
const MENU_PALETTE = [
  "#2563EB", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#DC2626", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#0EA5E9", // sky
  "#14B8A6", // teal
  "#F97316", // orange
  "#6366F1", // indigo
];
function menuColor(menu: string | null | undefined): string {
  if (!menu || menu === "—") return "#6B7280";
  let h = 0;
  for (let i = 0; i < menu.length; i++) h = (h * 31 + menu.charCodeAt(i)) >>> 0;
  return MENU_PALETTE[h % MENU_PALETTE.length];
}

function SeatingPlan({
  eventId,
  ed,
  guests,
  tables,
  menuOptions,
  onTablesChanged,
  onGuestsChanged,
}: {
  eventId: number;
  ed: boolean;
  guests: Guest[];
  tables: EventTable[];
  menuOptions: string[];
  onTablesChanged: () => Promise<void>;
  onGuestsChanged: () => Promise<void>;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [shape, setShape] = useState<"rect" | "circle">("rect");
  const [capacity, setCapacity] = useState(6);
  const [tableName, setTableName] = useState("");

  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    guest: Guest | null;
    x: number;
    y: number;
  }>({ visible: false, guest: null, x: 0, y: 0 });

  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const isDraggingGuest = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Optimistic position overrides during a table drag (committed on mouseup).
  const [localPos, setLocalPos] = useState<Record<number, { x: number; y: number }>>({});

  const tablePos = (t: EventTable) => {
    const lp = localPos[t.id];
    if (lp) return lp;
    return {
      x: typeof t.positionX === "number" ? t.positionX : 60,
      y: typeof t.positionY === "number" ? t.positionY : 60,
    };
  };

  // A guest belongs to a single table via guest.tableId — derive both lists from `guests`.
  const tableGuests = (t: EventTable) => guests.filter((g) => g.tableId === t.id);
  const availableGuests = guests.filter((g) => g.tableId == null);

  // Menus actually present among assigned guests — used by the legend.
  const presentMenus = useMemo(() => {
    const seen = new Set<string>();
    for (const g of guests) {
      if (g.tableId != null && g.menuPreference) seen.add(g.menuPreference);
    }
    return Array.from(seen).sort();
  }, [guests]);

  const addTable = async () => {
    const name = tableName.trim() || `Mesa ${tables.length + 1}`;
    try {
      await fetch(`/api/events/${eventId}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          shape: shape === "circle" ? "round" : "rect",
          capacity,
          positionX: 60 + Math.floor(Math.random() * 280),
          positionY: 60 + Math.floor(Math.random() * 200),
        }),
      });
      await onTablesChanged();
      setModalOpen(false);
      setTableName("");
      setShape("rect");
      setCapacity(6);
    } catch {
      toast.error("No se pudo crear la mesa");
    }
  };

  const removeTable = async (id: number) => {
    if (typeof window !== "undefined" && !window.confirm("¿Eliminar mesa?")) return;
    try {
      await fetch(`/api/events/${eventId}/tables/${id}`, { method: "DELETE" });
      await onTablesChanged();
      await onGuestsChanged();
    } catch {
      toast.error("No se pudo eliminar la mesa");
    }
  };

  const removeGuestFromTable = async (gid: number, tid: number) => {
    try {
      await fetch(
        `/api/events/${eventId}/tables/${tid}/assign?guestId=${gid}`,
        { method: "DELETE" },
      );
      await onTablesChanged();
      await onGuestsChanged();
    } catch {
      toast.error("No se pudo desasignar el invitado");
    }
  };

  const onDrop = async (e: React.DragEvent, t: EventTable) => {
    e.preventDefault();
    isDraggingGuest.current = false;
    const raw = e.dataTransfer.getData("text/plain");
    const gid = parseInt(raw, 10);
    if (!gid) return;
    const cap = t.capacity || 0;
    if (tableGuests(t).length >= cap) {
      toast.error("¡Mesa llena!");
      return;
    }
    if (tableGuests(t).some((g) => g.id === gid)) return;
    try {
      await fetch(`/api/events/${eventId}/tables/${t.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: gid }),
      });
      await onTablesChanged();
      await onGuestsChanged();
    } catch {
      toast.error("No se pudo asignar el invitado");
    }
  };

  const startTableDrag = (e: React.MouseEvent, tid: number) => {
    if (!ed) return;
    if (isDraggingGuest.current) return;
    if ((e.target as HTMLElement).classList.contains("gdot")) return;
    if ((e.target as HTMLElement).closest("[data-table-action]")) return;
    if (!canvasRef.current) return;
    const canvas = canvasRef.current.getBoundingClientRect();
    const t = tables.find((x) => x.id === tid);
    if (!t) return;
    const start = tablePos(t);
    const ox = e.clientX - start.x - canvas.left;
    const oy = e.clientY - start.y - canvas.top;
    let lastX = start.x;
    let lastY = start.y;

    const onMove = (ev: MouseEvent) => {
      if (!canvasRef.current) return;
      const cr = canvasRef.current.getBoundingClientRect();
      const nx = Math.max(0, ev.clientX - cr.left - ox);
      const ny = Math.max(0, ev.clientY - cr.top - oy);
      lastX = nx;
      lastY = ny;
      setLocalPos((prev) => ({ ...prev, [tid]: { x: nx, y: ny } }));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      // Commit to API; refetch will reconcile localPos.
      fetch(`/api/events/${eventId}/tables/${tid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionX: Math.round(lastX),
          positionY: Math.round(lastY),
        }),
      })
        .then(() => onTablesChanged())
        .then(() =>
          setLocalPos((prev) => {
            const next = { ...prev };
            delete next[tid];
            return next;
          }),
        )
        .catch(() => {
          /* keep optimistic position on failure */
        });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const initialOf = (g: Guest) =>
    (g.firstName?.[0] || "?").toUpperCase();

  return (
    <div
      className="rounded-[12px] overflow-hidden"
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--line-1)",
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        height: 600,
      }}
    >
      {/* Left panel — invitados disponibles */}
      <div
        style={{
          borderRight: "1px solid var(--line-1)",
          display: "flex",
          flexDirection: "column",
          background: "#FFFFFF",
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid var(--line-1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div>
            <div className="text-[13px] font-semibold text-[var(--ink-1)]">
              Invitados
            </div>
            <div className="text-[11px] text-[var(--ink-3)] mt-[1px]">
              {availableGuests.length} disponibles
            </div>
          </div>
          {ed && (
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-[8px] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
              style={{
                padding: "5px 10px",
                background: "#FFFFFF",
                border: "1px solid var(--line-strong)",
                fontSize: 11,
                fontWeight: 500,
                color: "var(--ink-1)",
                whiteSpace: "nowrap",
              }}
            >
              <IcoPlus className="h-3 w-3" /> Mesa
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {guests.length === 0 ? (
            <div className="text-[12px] text-[var(--ink-3)] text-center py-6">
              Sin invitados aún
            </div>
          ) : (
            guests.map((g) => {
              const assigned = g.tableId != null;
              const tableName = assigned
                ? tables.find((t) => t.id === g.tableId)?.name || ""
                : g.groupName || "Sin grupo";
              return (
                <div
                  key={g.id}
                  draggable={ed && !assigned}
                  onDragStart={(e) => {
                    isDraggingGuest.current = true;
                    e.dataTransfer.setData("text/plain", String(g.id));
                  }}
                  onDragEnd={() => {
                    isDraggingGuest.current = false;
                  }}
                  className="flex items-center gap-2 mb-1 rounded-[6px]"
                  style={{
                    padding: "6px 8px",
                    border: "1px solid var(--line-1)",
                    background: "#FFFFFF",
                    cursor: ed && !assigned ? "grab" : "default",
                    opacity: assigned ? 0.4 : 1,
                    userSelect: "none",
                  }}
                >
                  <div
                    className="flex items-center justify-center text-[10px] font-semibold text-white"
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: menuColor(g.menuPreference),
                      flexShrink: 0,
                    }}
                  >
                    {initialOf(g)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] text-[var(--ink-1)] truncate">
                      {g.firstName} {g.lastName || ""}
                    </div>
                    <div className="text-[10px] text-[var(--ink-3)] truncate">
                      {assigned ? `→ ${tableName}` : tableName}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Menu legend */}
        {(presentMenus.length > 0 || menuOptions.length > 0) && (
          <div
            style={{
              borderTop: "1px solid var(--line-1)",
              padding: "10px 12px",
              background: "var(--bg-subtle)",
            }}
          >
            <div className="text-[10.5px] font-semibold text-[var(--ink-2)] mb-2 uppercase tracking-wide">
              Menús
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {(presentMenus.length > 0 ? presentMenus : menuOptions.slice(0, 6)).map(
                (m) => (
                  <div key={m} className="flex items-center gap-1.5">
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: menuColor(m),
                      }}
                    />
                    <span className="text-[11px] text-[var(--ink-2)]">{m}</span>
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        style={{
          position: "relative",
          overflow: "hidden",
          background: "#F7F6F2",
          backgroundImage:
            "radial-gradient(circle, #d4d4d4 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      >
        {tables.length === 0 && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            style={{ color: "var(--ink-3)" }}
          >
            <IcoTables className="h-6 w-6 mb-2" />
            <div className="text-[13px] font-semibold text-[var(--ink-2)]">
              Aún no hay mesas
            </div>
            <div className="text-[11.5px] mt-0.5">
              {ed
                ? 'Pulsa "+ Mesa" para añadir tu primera mesa'
                : "Las mesas aparecerán aquí cuando se creen"}
            </div>
          </div>
        )}

        {tables.map((t) => {
          const pos = tablePos(t);
          const isCircle = t.shape === "round" || t.shape === "circle";
          const isOver = dragOverId === t.id;
          const seated = tableGuests(t);
          const cap = t.capacity || 0;
          return (
            <div
              key={t.id}
              style={{
                position: "absolute",
                left: pos.x,
                top: pos.y,
                zIndex: 10,
              }}
              onMouseDown={(e) => startTableDrag(e, t.id)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverId(t.id);
              }}
              onDragLeave={(e) => {
                if (
                  !(e.currentTarget as HTMLElement).contains(
                    e.relatedTarget as Node,
                  )
                ) {
                  setDragOverId(null);
                }
              }}
              onDrop={(e) => {
                setDragOverId(null);
                onDrop(e, t);
              }}
            >
              {ed && (
                <button
                  data-table-action
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTable(t.id);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="flex items-center justify-center"
                  style={{
                    position: "absolute",
                    top: -7,
                    right: -7,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#B55450",
                    color: "#FFFFFF",
                    border: "none",
                    cursor: "pointer",
                    zIndex: 15,
                  }}
                  aria-label="Eliminar mesa"
                >
                  <IcoX className="h-2.5 w-2.5" />
                </button>
              )}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isOver ? "#EEF3F5" : "#FFFFFF",
                  border: `2px solid ${isOver ? "#5A7A8A" : "var(--ink-1)"}`,
                  cursor: ed ? "move" : "default",
                  padding: "10px 8px",
                  width: isCircle ? 110 : 130,
                  height: isCircle ? 110 : "auto",
                  minHeight: isCircle ? 110 : 80,
                  borderRadius: isCircle ? "50%" : 8,
                  transition: "background 0.15s, border-color 0.15s",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}
              >
                <div className="text-[12px] font-semibold text-[var(--ink-1)] leading-tight text-center px-1">
                  {t.name}
                </div>
                <div className="text-[10px] text-[var(--ink-3)] mt-0.5">
                  {seated.length}/{cap}
                </div>
                <div
                  className="flex flex-wrap justify-center"
                  style={{ gap: 3, marginTop: 6, maxWidth: 96 }}
                >
                  {seated.map((g) => (
                    <div
                      key={g.id}
                      className="gdot"
                      onMouseEnter={(e) =>
                        setTooltip({
                          visible: true,
                          guest: g,
                          x: e.clientX,
                          y: e.clientY,
                        })
                      }
                      onMouseMove={(e) =>
                        setTooltip((prev) => ({
                          ...prev,
                          x: e.clientX,
                          y: e.clientY,
                        }))
                      }
                      onMouseLeave={() =>
                        setTooltip({
                          visible: false,
                          guest: null,
                          x: 0,
                          y: 0,
                        })
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        if (ed) removeGuestFromTable(g.id, t.id);
                      }}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: menuColor(g.menuPreference),
                        color: "#FFFFFF",
                        fontSize: 9.5,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: ed ? "pointer" : "default",
                        border: "1.5px solid #FFFFFF",
                        boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
                      }}
                    >
                      {initialOf(g)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* Hover tooltip */}
        {tooltip.visible &&
          tooltip.guest &&
          createPortal(
            <div
              style={{
                position: "fixed",
                left: tooltip.x + 14,
                top: tooltip.y - 10,
                background: "#1A1A1A",
                color: "#FFFFFF",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 11.5,
                zIndex: 9999,
                pointerEvents: "none",
                minWidth: 180,
                maxWidth: 260,
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 6,
                  paddingBottom: 6,
                  borderBottom: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {tooltip.guest.firstName} {tooltip.guest.lastName || ""}
              </div>
              <TooltipRow
                label="Grupo"
                value={tooltip.guest.groupName || "—"}
              />
              <TooltipRow
                label="Edad"
                value={ageLabel(tooltip.guest.ageGroup)}
              />
              <TooltipRow
                label="Menú"
                value={tooltip.guest.menuPreference || "—"}
                dot={
                  tooltip.guest.menuPreference
                    ? menuColor(tooltip.guest.menuPreference)
                    : undefined
                }
              />
              <TooltipRow
                label="Estado"
                value={rsvpLabel(tooltip.guest.rsvpStatus)}
              />
              {tooltip.guest.notes && (
                <div
                  style={{
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: "1px solid rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.85)",
                    lineHeight: 1.4,
                  }}
                >
                  <div
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 10,
                      marginBottom: 2,
                    }}
                  >
                    Notas / alergias
                  </div>
                  {tooltip.guest.notes}
                </div>
              )}
            </div>,
            document.body,
          )}
      </div>

      {/* New table modal */}
      {modalOpen &&
        createPortal(
          <div
            onClick={() => setModalOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#FFFFFF",
                borderRadius: 12,
                border: "1px solid var(--line-1)",
                padding: 22,
                width: 340,
                boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
              }}
            >
              <div className="text-[15px] font-semibold text-[var(--ink-1)] mb-4">
                Nueva mesa
              </div>

              <DrawerField label="Nombre">
                <input
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder={`Mesa ${tables.length + 1}`}
                  className="drawer-form-field"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid var(--line-1)",
                    borderRadius: 8,
                    fontSize: 13,
                    background: "#FFFFFF",
                    color: "var(--ink-1)",
                    outline: "none",
                  }}
                />
              </DrawerField>

              <div className="mt-4">
                <label className="text-[12px] font-medium text-[var(--ink-2)] mb-1.5 block">
                  Forma
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {(["rect", "circle"] as const).map((s) => {
                    const selected = shape === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setShape(s)}
                        style={{
                          padding: 12,
                          border: `2px solid ${selected ? "var(--ink-1)" : "var(--line-1)"}`,
                          borderRadius: 8,
                          cursor: "pointer",
                          textAlign: "center",
                          background: selected ? "var(--bg-subtle)" : "#FFFFFF",
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            margin: "0 auto 6px",
                            border: `2px solid ${selected ? "var(--ink-1)" : "var(--ink-3)"}`,
                            borderRadius: s === "circle" ? "50%" : 4,
                            background: selected ? "rgba(37,99,235,0.08)" : "transparent",
                          }}
                        />
                        <div className="text-[12px] text-[var(--ink-1)]">
                          {s === "rect" ? "Rectangular" : "Circular"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4">
                <label className="text-[12px] font-medium text-[var(--ink-2)] mb-1.5 block">
                  Capacidad
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCapacity((c) => Math.max(1, c - 1))}
                    style={{
                      width: 32,
                      height: 32,
                      border: "1px solid var(--line-strong)",
                      borderRadius: 8,
                      background: "#FFFFFF",
                      cursor: "pointer",
                      fontSize: 16,
                      color: "var(--ink-1)",
                    }}
                  >
                    −
                  </button>
                  <span className="text-[18px] font-semibold text-[var(--ink-1)]" style={{ minWidth: 32, textAlign: "center" }}>
                    {capacity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCapacity((c) => Math.min(20, c + 1))}
                    style={{
                      width: 32,
                      height: 32,
                      border: "1px solid var(--line-strong)",
                      borderRadius: 8,
                      background: "#FFFFFF",
                      cursor: "pointer",
                      fontSize: 16,
                      color: "var(--ink-1)",
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    border: "1px solid var(--line-strong)",
                    borderRadius: 8,
                    background: "#FFFFFF",
                    color: "var(--ink-1)",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={addTable}
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    border: "1px solid var(--ink-1)",
                    borderRadius: 8,
                    background: "var(--ink-1)",
                    color: "#FFFFFF",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Añadir mesa
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function TooltipRow({
  label,
  value,
  dot,
}: {
  label: string;
  value: string;
  dot?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        marginTop: 4,
      }}
    >
      <span style={{ color: "rgba(255,255,255,0.5)" }}>{label}</span>
      <span
        style={{
          fontWeight: 500,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          textAlign: "right",
        }}
      >
        {dot && (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: dot,
              display: "inline-block",
            }}
          />
        )}
        {value}
      </span>
    </div>
  );
}
