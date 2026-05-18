"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  Search01Icon,
  FilterIcon,
  ArrowDown01Icon,
  LayoutGridIcon,
  ListViewIcon,
  PlusSignIcon,
  Tick01Icon,
  Cancel01Icon,
  UserMultipleIcon,
  MoreHorizontalIcon,
  Copy01Icon,
  File02Icon,
  Edit02Icon,
  Delete02Icon,
  ArrowUpRight01Icon,
} from "@hugeicons/core-free-icons";
import { NumericPagination } from "@/components/ui/numeric-pagination";
import { CreateEventDrawer } from "@/components/events/create-event-drawer";
import { DuplicateEventDrawer } from "@/components/events/duplicate-event-drawer";
import { SaveAsTemplateDrawer } from "@/components/events/save-as-template-drawer";
import { useUserSessionContext } from "@/contexts/user-session-context";
import { appConfirm } from "@/lib/confirm";

const IcoSearch = hgIcon(Search01Icon);
const IcoFilter = hgIcon(FilterIcon);
const IcoChevDown = hgIcon(ArrowDown01Icon);
const IcoGrid = hgIcon(LayoutGridIcon);
const IcoList = hgIcon(ListViewIcon);
const IcoPlus = hgIcon(PlusSignIcon);
const IcoCheck = hgIcon(Tick01Icon);
const IcoX = hgIcon(Cancel01Icon);
const IcoTeam = hgIcon(UserMultipleIcon);
const IcoMore = hgIcon(MoreHorizontalIcon);
const IcoCopy = hgIcon(Copy01Icon);
const IcoTemplate = hgIcon(File02Icon);
const IcoEdit = hgIcon(Edit02Icon);
const IcoTrash = hgIcon(Delete02Icon);
const IcoOpen = hgIcon(ArrowUpRight01Icon);

interface Participant {
  userId: string;
  userName: string | null;
  userImage: string | null;
}

interface Event {
  id: number;
  name: string;
  type: string;
  customType?: string | null;
  date: string | null;
  endDate: string | null;
  location: string | null;
  guestCount: number | null;
  status: string;
  budget: string | null;
  description: string | null;
  createdAt: string | null;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  participantCount: number;
  participants: Participant[];
  _accessId?: number;
  _plannerOrgName?: string;
  _isCollaborated?: boolean;
  _collabStatus?: string;
}

interface CollaboratedEvent {
  accessId: number;
  status: string;
  eventId: number;
  eventName: string;
  eventType: string;
  eventDate: string | null;
  eventEndDate: string | null;
  eventStatus: string;
  eventLocation: string | null;
  eventGuestCount: number | null;
  hostOrgName: string;
  taskCount: number;
  pendingTaskCount: number;
}

// Pill colors per event type — bg/ink pairs anchored to the prototype palette.
const typePill: Record<string, { bg: string; ink: string }> = {
  wedding:      { bg: "#FCE6E2", ink: "#B03A2E" },
  pre_wedding:  { bg: "#E0F5EC", ink: "#007A49" },
  post_wedding: { bg: "#FCEBD9", ink: "#A24E0F" },
  birthday:     { bg: "#EFE5FA", ink: "#5C2EAA" },
  corporate:    { bg: "#E1ECFB", ink: "#1F4FA8" },
  social:       { bg: "#FBF1D7", ink: "#8A6300" },
  other:        { bg: "#ECEAE5", ink: "#5C5A55" },
};

const ES_MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const formatDateProto = (dateStr: string | null, undefinedLabel: string) => {
  if (!dateStr) return undefinedLabel;
  const d = new Date(dateStr);
  return `${d.getDate()} ${ES_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const formatBudget = (budget: string | null) => {
  if (!budget) return null;
  const num = parseFloat(budget);
  if (isNaN(num)) return null;
  return `€${num.toLocaleString("es-ES", { maximumFractionDigits: 0 })}`;
};

// Avatar pair derived from event name. Pattern: "X y Y" splits into two
// initials; otherwise we take first + last word's first letter (or fall back
// to a single initial).
const avatarPair = (name: string): { a: string; b: string } => {
  const norm = name.trim();
  const m = norm.match(/^(\S+)\s+y\s+(\S+)/i);
  if (m) return { a: m[1][0]!.toUpperCase(), b: m[2][0]!.toUpperCase() };
  const parts = norm.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return { a: parts[0][0]!.toUpperCase(), b: parts[parts.length - 1][0]!.toUpperCase() };
  }
  return { a: (parts[0]?.[0] || "?").toUpperCase(), b: "" };
};

type SortOption =
  | "date_asc"
  | "date_desc"
  | "name_asc"
  | "name_desc"
  | "budget_desc"
  | "budget_asc"
  | "guests"
  | "progress";

export default function EventsPage() {
  const t = useTranslations("events");
  const router = useRouter();
  const { can } = useUserSessionContext();
  const canCreate = can("events:create");
  const canUpdate = can("events:update");
  const canDelete = can("events:delete");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [duplicateEvent, setDuplicateEvent] = useState<Event | null>(null);
  const [saveAsTemplateEvent, setSaveAsTemplateEvent] = useState<Event | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("date_asc");
  const [sortOpen, setSortOpen] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });

  const sortRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // Type labels (inside component so t() hook is available)
  const typeLabels: Record<string, string> = {
    wedding:      t("types.wedding"),
    pre_wedding:  t("types.pre_wedding"),
    post_wedding: t("types.post_wedding"),
    birthday:     t("types.birthday"),
    corporate:    t("types.corporate"),
    social:       t("types.social"),
    other:        t("types.other"),
  };

  // When the user picked "other" and typed a custom label, show that label
  // instead of the generic one. Falls back to the standard label otherwise.
  const eventTypeLabel = (type: string, customType?: string | null) =>
    type === "other" && customType?.trim() ? customType.trim() : typeLabels[type] || type;

  // Filter options shown in the popover
  const FILTER_TYPES: Array<{ key: string | null; label: string }> = [
    { key: null, label: t("filter.all") },
    ...Object.entries(typeLabels).map(([key, label]) => ({ key, label })),
  ];

  // Sort groups
  const SORT_GROUPS: Array<{ group: string; items: Array<{ v: SortOption; l: string }> }> = [
    { group: t("sort.groupDate"),   items: [{ v: "date_asc", l: t("sort.dateAsc") }, { v: "date_desc", l: t("sort.dateDesc") }] },
    { group: t("sort.groupName"),   items: [{ v: "name_asc", l: t("sort.nameAsc") }, { v: "name_desc", l: t("sort.nameDesc") }] },
    { group: t("sort.groupBudget"), items: [{ v: "budget_desc", l: t("sort.budgetDesc") }, { v: "budget_asc", l: t("sort.budgetAsc") }] },
    { group: t("sort.groupOther"),  items: [{ v: "guests", l: t("sort.guests") }, { v: "progress", l: t("sort.progress") }] },
  ];

  // Status metadata with translated labels
  const STATUS_META: Record<string, { label: string; bg: string; ink: string }> = {
    draft:     { label: t("status.draft"),     bg: "#F3F4F6", ink: "#374151" },
    confirmed: { label: t("status.confirmed"), bg: "#DBEAFE", ink: "#1E40AF" },
    active:    { label: t("status.active"),    bg: "#D1FAE5", ink: "#065F46" },
    completed: { label: t("status.completed"), bg: "#EDE9FE", ink: "#5B21B6" },
    cancelled: { label: t("status.cancelled"), bg: "#FEE2E2", ink: "#991B1B" },
  };

  // Status tabs
  const STATUS_TABS = [
    { key: null,        label: t("tabs.all") },
    { key: "draft",     label: t("status.draft") },
    { key: "confirmed", label: t("status.confirmed") },
    { key: "active",    label: t("status.active") },
    { key: "completed", label: t("status.completed") },
    { key: "cancelled", label: t("status.cancelled") },
  ];

  // Close popovers on outside click (deferred so the trigger button click
  // doesn't immediately re-close them on the same event loop tick).
  useEffect(() => {
    if (!sortOpen && !filterOpen) return;
    const h = (e: MouseEvent) => {
      if (sortOpen && sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
      if (filterOpen && filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    const id = window.setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => { window.clearTimeout(id); document.removeEventListener("mousedown", h); };
  }, [sortOpen, filterOpen]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString() });
      const [ownedRes, collabRes] = await Promise.all([
        fetch(`/api/events?${params}`),
        fetch("/api/events?scope=collaborated"),
      ]);

      const ownedData = ownedRes.ok ? await ownedRes.json() : { data: [] };
      const collabData = collabRes.ok ? await collabRes.json() : { data: [] };

      const ownedEvents: Event[] = ownedData.data || [];
      const collabEvents: CollaboratedEvent[] = collabData.data || [];

      const mappedCollab: Event[] = collabEvents
        .filter((c) => c.status === "active" || c.status === "pending")
        .map((c) => ({
          id: c.eventId,
          name: c.eventName,
          type: c.eventType || "other",
          date: c.eventDate,
          endDate: c.eventEndDate,
          location: c.eventLocation,
          guestCount: c.eventGuestCount ?? 0,
          status: c.eventStatus || "draft",
          budget: null,
          description: null,
          createdAt: null,
          progress: 0,
          totalTasks: c.taskCount || 0,
          completedTasks: 0,
          participantCount: 0,
          participants: [],
          _accessId: c.accessId,
          _plannerOrgName: c.hostOrgName,
          _isCollaborated: true,
          _collabStatus: c.status,
        }));

      const eventMap = new Map<number, Event>();
      for (const e of ownedEvents) eventMap.set(e.id, e);
      for (const e of mappedCollab) {
        if (!eventMap.has(e.id)) eventMap.set(e.id, e);
      }
      const merged = Array.from(eventMap.values());

      setEvents(merged);
      if (ownedData.meta) setMeta(ownedData.meta);
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  const handleCollabAction = async (accessId: number, action: "accept" | "reject") => {
    try {
      const res = await fetch(`/api/events/collaborations/${accessId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) loadEvents();
    } catch (error) {
      console.error(`Failed to ${action} collaboration:`, error);
    }
  };

  const handleDelete = async (event: Event) => {
    const ok = await appConfirm({
      title: t("confirm.deleteTitle", { name: event.name }),
      description: t("confirm.deleteDescription"),
      variant: "destructive",
      confirmLabel: t("confirm.deleteConfirm"),
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(t("toast.deleted", { name: event.name }));
        loadEvents();
      } else {
        toast.error(t("toast.deleteError"));
      }
    } catch (error) {
      console.error("Failed to delete event:", error);
      toast.error(t("toast.deleteError"));
    }
  };

  const handleStatusChange = async (event: Event, newStatus: string) => {
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const label = STATUS_META[newStatus]?.label ?? newStatus;
        toast.success(`«${event.name}» → ${label}`);
        loadEvents();
      } else {
        toast.error(t("toast.statusError"));
      }
    } catch { toast.error(t("toast.connectionError")); }
  };

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const filteredAndSortedEvents = useMemo(() => {
    let result = events.filter((event) =>
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (typeLabels[event.type] || event.type).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.location || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filterType) result = result.filter((e) => e.type === filterType);
    if (filterStatus) result = result.filter((e) => e.status === filterStatus);

    const dateMs = (s: string | null) => (s ? new Date(s).getTime() : Number.MAX_SAFE_INTEGER);
    const budgetN = (s: string | null) => (s ? parseFloat(s) || 0 : 0);

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "date_asc":    return dateMs(a.date) - dateMs(b.date);
        case "date_desc":   return dateMs(b.date) - dateMs(a.date);
        case "name_asc":    return a.name.localeCompare(b.name);
        case "name_desc":   return b.name.localeCompare(a.name);
        case "budget_desc": return budgetN(b.budget) - budgetN(a.budget);
        case "budget_asc":  return budgetN(a.budget) - budgetN(b.budget);
        case "guests":      return (b.guestCount || 0) - (a.guestCount || 0);
        case "progress":    return b.progress - a.progress;
        default:            return 0;
      }
    });

    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, searchTerm, filterType, filterStatus, sortBy]);

  const filterButtonLabel = filterType
    ? t("filter.buttonLabelType", { type: typeLabels[filterType] || filterType })
    : t("filter.buttonLabel");

  return (
    <div className="space-y-4">
      {/* Card wrapper — single bordered panel containing toolbar + results */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--line-1)",
          borderRadius: 12,
          padding: 18,
        }}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search */}
          <div
            className="inline-flex items-center"
            style={{
              width: 280,
              border: "1px solid var(--line-1)",
              borderRadius: 8,
              background: "#FFFFFF",
              padding: "6px 10px",
              gap: 8,
            }}
          >
            <IcoSearch className="h-3.5 w-3.5 text-[var(--ink-3)]" />
            <input
              placeholder={t("toolbar.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none text-[13px] text-[var(--ink-1)] bg-transparent placeholder:text-[var(--ink-3)]"
            />
            <span
              className="inline-flex items-center text-[var(--ink-4)]"
              style={{
                fontSize: 11,
                border: "1px solid var(--line-1)",
                borderRadius: 4,
                padding: "1px 5px",
              }}
            >
              ⌘1
            </span>
          </div>

          {/* Filter (popover) */}
          <div ref={filterRef} className="relative">
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 cursor-pointer"
              style={{
                padding: "7px 11px",
                border: "1px solid var(--line-strong)",
                borderRadius: 8,
                background: "#FFFFFF",
                fontSize: 13,
                color: "var(--ink-1)",
              }}
            >
              <IcoFilter className="h-3.5 w-3.5" />
              {filterButtonLabel}
            </button>
            {filterOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  minWidth: 180,
                  background: "#FFFFFF",
                  border: "1px solid var(--line-1)",
                  borderRadius: 10,
                  boxShadow: "0 8px 24px rgba(15,16,18,.08)",
                  padding: 6,
                  zIndex: 30,
                }}
              >
                {FILTER_TYPES.map((o) => {
                  const active = filterType === o.key;
                  return (
                    <button
                      key={o.key ?? "all"}
                      onClick={() => { setFilterType(o.key); setFilterOpen(false); }}
                      className="w-full text-left cursor-pointer flex items-center"
                      style={{
                        padding: "8px 10px",
                        border: "none",
                        background: active ? "var(--bg-subtle)" : "transparent",
                        borderRadius: 6,
                        fontSize: 13,
                        color: "var(--ink-1)",
                      }}
                    >
                      <span className="flex-1">{o.label}</span>
                      {active && <IcoCheck className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sort (popover, grouped) */}
          <div ref={sortRef} className="relative">
            <button
              onClick={() => setSortOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 cursor-pointer"
              style={{
                padding: "7px 11px",
                border: "1px solid var(--line-strong)",
                borderRadius: 8,
                background: "#FFFFFF",
                fontSize: 13,
                color: "var(--ink-1)",
              }}
            >
              <IcoFilter className="h-3.5 w-3.5" />
              {t("filter.sortBy")}
              <IcoChevDown className="h-3 w-3" />
            </button>
            {sortOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  minWidth: 240,
                  background: "#FFFFFF",
                  border: "1px solid var(--line-1)",
                  borderRadius: 10,
                  boxShadow: "0 8px 24px rgba(15,16,18,.08)",
                  padding: 6,
                  zIndex: 30,
                }}
              >
                {SORT_GROUPS.map((g, gi) => (
                  <div key={g.group} style={{ paddingTop: gi === 0 ? 0 : 6 }}>
                    <div
                      className="uppercase text-[var(--ink-3)]"
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: ".06em",
                        padding: "6px 10px 4px",
                      }}
                    >
                      {g.group}
                    </div>
                    {g.items.map((o) => {
                      const active = sortBy === o.v;
                      return (
                        <button
                          key={o.v}
                          onClick={() => { setSortBy(o.v); setSortOpen(false); }}
                          className="w-full text-left cursor-pointer flex items-center"
                          style={{
                            padding: "8px 10px",
                            border: "none",
                            background: active ? "var(--bg-subtle)" : "transparent",
                            borderRadius: 6,
                            fontSize: 13,
                            color: "var(--ink-1)",
                          }}
                        >
                          <span className="flex-1">{o.l}</span>
                          {active && <IcoCheck className="h-3 w-3" />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* View toggle */}
            <div
              className="inline-flex"
              style={{
                border: "1px solid var(--line-strong)",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => setViewMode("grid")}
                aria-label={t("toolbar.viewGrid")}
                className="cursor-pointer border-none"
                style={{
                  padding: "7px 10px",
                  background: viewMode === "grid" ? "var(--bg-subtle)" : "#FFFFFF",
                  color: "var(--ink-1)",
                }}
              >
                <IcoGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                aria-label={t("toolbar.viewList")}
                className="cursor-pointer border-none"
                style={{
                  padding: "7px 10px",
                  background: viewMode === "list" ? "var(--bg-subtle)" : "#FFFFFF",
                  color: "var(--ink-2)",
                  borderLeft: "1px solid var(--line-1)",
                }}
              >
                <IcoList className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Primary CTA */}
            {canCreate && (
              <button
                onClick={() => setIsCreateDialogOpen(true)}
                className="inline-flex items-center gap-1.5 cursor-pointer border-none transition-colors"
                style={{
                  background: "var(--color-primary)",
                  color: "var(--color-primary-ink)",
                  padding: "8px 13px",
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 8,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-primary-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-primary)")}
              >
                <IcoPlus className="h-3.5 w-3.5" />
                {t("toolbar.newEvent")}
              </button>
            )}
          </div>
        </div>

        {/* Status tabs */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14, borderBottom: "1px solid var(--line-1)", paddingBottom: 12 }}>
          {STATUS_TABS.map(tab => {
            const active = filterStatus === tab.key;
            const count = tab.key === null ? events.length : events.filter(e => e.status === tab.key).length;
            if (tab.key !== null && count === 0) return null;
            return (
              <button
                key={String(tab.key)}
                type="button"
                onClick={() => setFilterStatus(tab.key)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 99,
                  border: active ? "1.5px solid var(--color-primary)" : "1px solid var(--line-strong)",
                  background: active ? "var(--color-primary)" : "white",
                  color: active ? "var(--color-primary-ink, white)" : "var(--ink-2)",
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {tab.label}
                <span style={{ fontSize: 11, opacity: 0.75 }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12 text-[13px] text-[var(--ink-3)]">
            {t("loading")}
          </div>
        ) : filteredAndSortedEvents.length === 0 ? (
          <div className="text-center py-10 text-[13px] text-[var(--ink-3)]">
            {searchTerm || filterType || filterStatus
              ? t("emptyFiltered")
              : t("emptyDefault")}
          </div>
        ) : viewMode === "grid" ? (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            style={{ gap: 14, marginTop: 16 }}
          >
            {filteredAndSortedEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                canCreate={canCreate}
                canUpdate={canUpdate}
                canDelete={canDelete}
                statusMeta={STATUS_META}
                eventTypeLabel={eventTypeLabel}
                onOpen={() => router.push(`/dashboard/events/${event.id}`)}
                onEdit={() => router.push(`/dashboard/events/${event.id}`)}
                onDuplicate={() => setDuplicateEvent(event)}
                onSaveAsTemplate={() => setSaveAsTemplateEvent(event)}
                onDelete={() => handleDelete(event)}
                onStatusChange={handleStatusChange}
                onCollabAction={handleCollabAction}
              />
            ))}
          </div>
        ) : (
          <EventsTable
            rows={filteredAndSortedEvents}
            canCreate={canCreate}
            canUpdate={canUpdate}
            canDelete={canDelete}
            statusMeta={STATUS_META}
            eventTypeLabel={eventTypeLabel}
            onOpen={(e) => router.push(`/dashboard/events/${e.id}`)}
            onEdit={(e) => router.push(`/dashboard/events/${e.id}`)}
            onDuplicate={(e) => setDuplicateEvent(e)}
            onSaveAsTemplate={(e) => setSaveAsTemplateEvent(e)}
            onDelete={(e) => handleDelete(e)}
            onStatusChange={handleStatusChange}
            onCollabAction={handleCollabAction}
          />
        )}
      </div>

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-[var(--ink-3)]">
            {t("pagination", {
              from: ((meta.page - 1) * meta.limit) + 1,
              to: Math.min(meta.page * meta.limit, meta.total),
              total: meta.total,
            })}
          </p>
          <NumericPagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      <CreateEventDrawer
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onEventCreated={loadEvents}
      />

      {duplicateEvent && (
        <DuplicateEventDrawer
          open={!!duplicateEvent}
          onOpenChange={(open) => !open && setDuplicateEvent(null)}
          eventId={duplicateEvent.id}
          eventName={duplicateEvent.name}
          onDuplicated={loadEvents}
        />
      )}

      {saveAsTemplateEvent && (
        <SaveAsTemplateDrawer
          open={!!saveAsTemplateEvent}
          onOpenChange={(open) => !open && setSaveAsTemplateEvent(null)}
          eventId={saveAsTemplateEvent.id}
          eventName={saveAsTemplateEvent.name}
        />
      )}
    </div>
  );
}

// ============================================================
// EventCard — prototype layout: avatar pair / eyebrow+title / pill /
// 3-dot menu / progress / 2-col Fecha+Lugar / 2-col Encargado+Invitados
// ============================================================
function EventCard({
  event,
  canCreate,
  canUpdate,
  canDelete,
  statusMeta,
  eventTypeLabel,
  onOpen,
  onEdit,
  onDuplicate,
  onSaveAsTemplate,
  onDelete,
  onStatusChange,
  onCollabAction,
}: {
  event: Event;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  statusMeta: Record<string, { label: string; bg: string; ink: string }>;
  eventTypeLabel: (type: string, customType?: string | null) => string;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onSaveAsTemplate: () => void;
  onDelete: () => void;
  onStatusChange: (event: Event, newStatus: string) => void;
  onCollabAction: (id: number, action: "accept" | "reject") => void;
}) {
  const t = useTranslations("events");
  const [menuOpen, setMenuOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const id = window.setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => { window.clearTimeout(id); document.removeEventListener("mousedown", h); };
  }, [menuOpen]);

  const pct = Math.round(event.progress || 0);
  const pair = avatarPair(event.name);
  const pill = typePill[event.type] || typePill.other;
  const typeLabel = eventTypeLabel(event.type, event.customType);
  const isPending = event._collabStatus === "pending";
  const isCollabActive = event._isCollaborated && event._collabStatus === "active";

  const lead = event.participants[0];
  const leadInitial = (lead?.userName?.[0] || pair.a || "?").toUpperCase();

  const Inner = (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: `1px solid ${hover ? "var(--line-strong)" : "var(--line-1)"}`,
        borderRadius: 12,
        padding: "16px 18px",
        background: "#FFFFFF",
        cursor: isPending ? "default" : "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        transition: "border-color .15s, box-shadow .15s",
        boxShadow: hover ? "0 2px 8px rgba(15,16,18,.06)" : "none",
      }}
    >
      {/* Collab status banner (pending shows accept/reject; active shows badge) */}
      {isPending && (
        <div className="flex items-center justify-between gap-2">
          <span
            className="inline-flex items-center gap-1.5"
            style={{
              fontSize: 11,
              color: "#A24E0F",
              background: "#FCEBD9",
              borderRadius: 6,
              padding: "3px 7px",
              fontWeight: 500,
            }}
          >
            <IcoTeam className="h-3 w-3" />
            {t("card.pendingInvitation")}
          </span>
          <div className="flex gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onCollabAction(event._accessId!, "accept"); }}
              className="inline-flex items-center gap-1 cursor-pointer border-none"
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: "#007A49",
                background: "#E0F5EC",
                borderRadius: 6,
                padding: "4px 8px",
              }}
            >
              <IcoCheck className="h-3 w-3" /> {t("card.accept")}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onCollabAction(event._accessId!, "reject"); }}
              className="inline-flex items-center cursor-pointer border-none"
              style={{
                color: "#B03A2E",
                background: "#FCE6E2",
                borderRadius: 6,
                padding: "4px 6px",
              }}
            >
              <IcoX className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {isCollabActive && !isPending && (
        <span
          className="inline-flex items-center gap-1.5 w-fit"
          style={{
            fontSize: 11,
            color: "#1F4FA8",
            background: "#E1ECFB",
            borderRadius: 6,
            padding: "3px 7px",
            fontWeight: 500,
          }}
        >
          <IcoTeam className="h-3 w-3" />
          {t("card.collaborator")}
        </span>
      )}

      {/* Header: avatar pair + title + type pill + 3-dot menu */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", flexShrink: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#E8D5C4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 600,
              color: "#7A5A3A",
              border: "2px solid #FFFFFF",
            }}
          >
            {pair.a}
          </div>
          {pair.b && (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#F0D4D0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 600,
                color: "#8A5555",
                border: "2px solid #FFFFFF",
                marginLeft: -8,
              }}
            >
              {pair.b}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="uppercase text-[var(--ink-3)]"
            style={{
              fontSize: 10.5,
              letterSpacing: ".04em",
              fontWeight: 500,
              marginBottom: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {t("card.eyebrow")}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--ink-1)",
              letterSpacing: "-0.01em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {event.name}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <span
            className="uppercase"
            style={{
              background: pill.bg,
              color: pill.ink,
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: ".04em",
              padding: "3px 9px",
              maxWidth: 140,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={typeLabel}
          >
            {typeLabel}
          </span>
          {event.status && statusMeta[event.status] && (
            <span
              style={{
                background: statusMeta[event.status].bg,
                color: statusMeta[event.status].ink,
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 8px",
                whiteSpace: "nowrap",
              }}
            >
              {statusMeta[event.status].label}
            </span>
          )}
        </div>

        {/* 3-dot menu */}
        <div ref={menuRef} className="relative" onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenuOpen((o) => !o); }}
            className="cursor-pointer border-none"
            style={{
              background: menuOpen ? "var(--bg-subtle)" : "transparent",
              color: "var(--ink-3)",
              padding: "4px 6px",
              borderRadius: 6,
              display: "flex",
            }}
          >
            <IcoMore className="h-[15px] w-[15px]" />
          </button>
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                zIndex: 60,
                background: "#FFFFFF",
                border: "1px solid var(--line-1)",
                borderRadius: 10,
                minWidth: 210,
                padding: 6,
                boxShadow: "0 12px 32px rgba(15,16,18,.12), 0 2px 6px rgba(15,16,18,.06)",
              }}
            >
              <MenuItem
                icon={<IcoOpen className="h-3.5 w-3.5" />}
                label={t("menu.openEvent")}
                onClick={() => { onOpen(); setMenuOpen(false); }}
              />
              {canUpdate && (
                <MenuItem
                  icon={<IcoEdit className="h-3.5 w-3.5" />}
                  label={t("menu.editEvent")}
                  onClick={() => { onEdit(); setMenuOpen(false); }}
                />
              )}
              {canCreate && (
                <MenuItem
                  icon={<IcoCopy className="h-3.5 w-3.5" />}
                  label={t("menu.duplicateEvent")}
                  onClick={() => { onDuplicate(); setMenuOpen(false); }}
                />
              )}
              {canCreate && (
                <MenuItem
                  icon={<IcoTemplate className="h-3.5 w-3.5" />}
                  label={t("menu.saveAsTemplate")}
                  onClick={() => { onSaveAsTemplate(); setMenuOpen(false); }}
                />
              )}
              {canUpdate && (
                <>
                  <div style={{ height: 1, background: "var(--line-1)", margin: "4px 0" }} />
                  <div style={{ padding: "4px 12px 2px", fontSize: 10.5, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                    {t("menu.changeStatus")}
                  </div>
                  {Object.entries(statusMeta)
                    .filter(([key]) => key !== event.status)
                    .map(([key, meta]) => (
                      <MenuItem
                        key={key}
                        icon={<span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.ink, flexShrink: 0, display: "inline-block" }} />}
                        label={meta.label}
                        onClick={() => { onStatusChange(event, key); setMenuOpen(false); }}
                      />
                    ))}
                </>
              )}
              {canDelete && (
                <>
                  <div style={{ height: 1, background: "var(--line-1)", margin: "4px 0" }} />
                  <MenuItem
                    icon={<IcoTrash className="h-3.5 w-3.5" />}
                    label={t("menu.deleteEvent")}
                    danger
                    onClick={() => { onDelete(); setMenuOpen(false); }}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between" style={{ marginBottom: 5 }}>
          <div
            className="uppercase text-[var(--ink-3)]"
            style={{ fontSize: 11, letterSpacing: ".04em", fontWeight: 500 }}
          >
            {t("card.progress")}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-1)" }}>{pct}%</div>
        </div>
        <div style={{ height: 6, background: "var(--bg-subtle)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "var(--ink-1)", borderRadius: 999 }} />
        </div>
      </div>

      {/* Grid: Date | Location */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px 14px",
          borderTop: "1px solid var(--line-1)",
          paddingTop: 12,
        }}
      >
        <CardField label={t("card.fieldDate")} value={formatDateProto(event.date, t("dateUndefined"))} />
        <CardField label={t("card.fieldLocation")} value={event.location || t("dateUndefined")} />
      </div>

      {/* Footer: Manager | Guests */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px" }}>
        <div>
          <div
            className="uppercase text-[var(--ink-3)]"
            style={{ fontSize: 10.5, letterSpacing: ".04em", fontWeight: 500, marginBottom: 4 }}
          >
            {t("card.fieldManager")}
          </div>
          <div className="flex items-center" style={{ gap: 7 }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#FBF1D7",
                color: "#8A6300",
                fontSize: 11,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {leadInitial}
            </span>
            <span style={{ fontSize: 12.5, color: "var(--ink-1)", fontWeight: 500 }}>
              {lead?.userName || t("card.unassigned")}
            </span>
          </div>
        </div>
        <div>
          <div
            className="uppercase text-[var(--ink-3)]"
            style={{ fontSize: 10.5, letterSpacing: ".04em", fontWeight: 500, marginBottom: 4 }}
          >
            {t("card.fieldGuests")}
          </div>
          <span style={{ fontSize: 13, color: "var(--ink-1)", fontWeight: 500 }}>
            {event.guestCount ?? 0}
          </span>
        </div>
      </div>
    </div>
  );

  return isPending ? Inner : (
    <Link href={`/dashboard/events/${event.id}`} className="block">
      {Inner}
    </Link>
  );
}

function CardField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        className="uppercase text-[var(--ink-3)]"
        style={{ fontSize: 10.5, letterSpacing: ".04em", fontWeight: 500, marginBottom: 4 }}
      >
        {label}
      </div>
      <span style={{ fontSize: 13, color: "var(--ink-1)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClick(); }}
      className="w-full text-left cursor-pointer border-none flex items-center"
      style={{
        gap: 10,
        padding: "9px 12px",
        borderRadius: 6,
        background: "transparent",
        fontSize: 13,
        fontWeight: 500,
        color: danger ? "#C33" : "var(--ink-1)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {icon} {label}
    </button>
  );
}

// ============================================================
// EventsTable — prototype columns: Name / Budget / Guests /
// Location / Progress / Participants / Type
// ============================================================
function EventsTable({
  rows,
  canCreate,
  canUpdate,
  canDelete,
  statusMeta,
  eventTypeLabel,
  onOpen,
  onEdit,
  onDuplicate,
  onSaveAsTemplate,
  onDelete,
  onStatusChange,
  onCollabAction,
}: {
  rows: Event[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  statusMeta: Record<string, { label: string; bg: string; ink: string }>;
  eventTypeLabel: (type: string, customType?: string | null) => string;
  onOpen: (e: Event) => void;
  onEdit: (e: Event) => void;
  onDuplicate: (e: Event) => void;
  onSaveAsTemplate: (e: Event) => void;
  onDelete: (e: Event) => void;
  onStatusChange: (e: Event, newStatus: string) => void;
  onCollabAction: (id: number, action: "accept" | "reject") => void;
}) {
  const t = useTranslations("events");
  const tableHeaders = [
    t("table.colName"),
    t("table.colBudget"),
    t("table.colGuests"),
    t("table.colLocation"),
    t("table.colProgress"),
    t("table.colParticipants"),
    t("table.colType"),
  ];

  return (
    <div className="overflow-x-auto" style={{ marginTop: 16 }}>
      <table className="w-full" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--line-1)" }}>
            {tableHeaders.map((h) => (
              <th
                key={h}
                className="text-left uppercase text-[var(--ink-3)]"
                style={{
                  padding: "10px 12px",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: ".04em",
                }}
              >
                {h}
              </th>
            ))}
            <th style={{ width: 36 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((event) => {
            const pill = typePill[event.type] || typePill.other;
            const typeLabel = eventTypeLabel(event.type, event.customType);
            const isPending = event._collabStatus === "pending";
            const pct = Math.round(event.progress || 0);
            return (
              <tr
                key={event.id}
                style={{ borderBottom: "1px solid var(--line-1)" }}
                className="hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <td style={{ padding: "12px" }}>
                  <div className="flex items-center gap-2">
                    {isPending ? (
                      <span style={{ fontWeight: 500, color: "var(--ink-3)" }}>{event.name}</span>
                    ) : (
                      <Link
                        href={`/dashboard/events/${event.id}`}
                        style={{ fontWeight: 500, color: "var(--ink-1)" }}
                        className="hover:underline"
                      >
                        {event.name}
                      </Link>
                    )}
                    {event._isCollaborated && event._collabStatus === "active" && (
                      <span
                        className="inline-flex items-center gap-1"
                        style={{ fontSize: 10, color: "#1F4FA8", background: "#E1ECFB", borderRadius: 4, padding: "1px 6px" }}
                      >
                        <IcoTeam className="h-3 w-3" />
                        {t("card.collaborator")}
                      </span>
                    )}
                    {isPending && (
                      <span
                        className="inline-flex items-center gap-1"
                        style={{ fontSize: 10, color: "#A24E0F", background: "#FCEBD9", borderRadius: 4, padding: "1px 6px" }}
                      >
                        <IcoTeam className="h-3 w-3" />
                        {t("card.pending")}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: "12px", fontSize: 13, color: "var(--ink-1)" }}>
                  {formatBudget(event.budget) || "—"}
                </td>
                <td style={{ padding: "12px", fontSize: 13, color: "var(--ink-1)" }}>
                  {event.guestCount ?? 0}
                </td>
                <td style={{ padding: "12px", fontSize: 13, color: "var(--ink-1)" }}>
                  {event.location || "—"}
                </td>
                <td style={{ padding: "12px" }}>
                  <div className="flex items-center gap-2">
                    <div style={{ width: 100, height: 6, background: "var(--bg-subtle)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "var(--ink-1)", borderRadius: 999 }} />
                    </div>
                    <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{pct}%</span>
                  </div>
                </td>
                <td style={{ padding: "12px" }}>
                  <div style={{ display: "flex" }}>
                    {event.participants.slice(0, 3).map((p, j) => (
                      <span
                        key={p.userId}
                        title={p.userName || ""}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: "#FBF1D7",
                          color: "#8A6300",
                          fontSize: 10,
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginLeft: j === 0 ? 0 : -6,
                          border: "2px solid #FFFFFF",
                        }}
                      >
                        {(p.userName?.[0] || "?").toUpperCase()}
                      </span>
                    ))}
                    {event.participantCount > 3 && (
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
                          marginLeft: -6,
                          border: "2px solid #FFFFFF",
                        }}
                      >
                        +{event.participantCount - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: "12px" }}>
                  <span
                    className="uppercase"
                    style={{
                      background: pill.bg,
                      color: pill.ink,
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: ".04em",
                      padding: "3px 9px",
                    }}
                  >
                    {typeLabel}
                  </span>
                </td>
                <td style={{ padding: "12px", textAlign: "right" }}>
                  {isPending && event._accessId ? (
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => onCollabAction(event._accessId!, "accept")}
                        className="inline-flex items-center gap-1 cursor-pointer border-none"
                        style={{ fontSize: 11.5, fontWeight: 600, color: "#007A49", background: "#E0F5EC", borderRadius: 6, padding: "4px 8px" }}
                      >
                        <IcoCheck className="h-3 w-3" /> {t("card.accept")}
                      </button>
                      <button
                        onClick={() => onCollabAction(event._accessId!, "reject")}
                        className="inline-flex items-center cursor-pointer border-none"
                        style={{ color: "#B03A2E", background: "#FCE6E2", borderRadius: 6, padding: "4px 6px" }}
                      >
                        <IcoX className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <RowMenu
                      canCreate={canCreate}
                      canUpdate={canUpdate}
                      canDelete={canDelete}
                      statusMeta={statusMeta}
                      onOpen={() => onOpen(event)}
                      onEdit={() => onEdit(event)}
                      onDuplicate={() => onDuplicate(event)}
                      onSaveAsTemplate={() => onSaveAsTemplate(event)}
                      onDelete={() => onDelete(event)}
                      onStatusChange={(newStatus) => onStatusChange(event, newStatus)}
                      currentStatus={event.status}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RowMenu({
  canCreate,
  canUpdate,
  canDelete,
  statusMeta,
  onOpen: onOpenAction,
  onEdit,
  onDuplicate,
  onSaveAsTemplate,
  onDelete,
  onStatusChange,
  currentStatus,
}: {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  statusMeta: Record<string, { label: string; bg: string; ink: string }>;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onSaveAsTemplate: () => void;
  onDelete: () => void;
  onStatusChange?: (newStatus: string) => void;
  currentStatus?: string | null;
}) {
  const t = useTranslations("events");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const id = window.setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => { window.clearTimeout(id); document.removeEventListener("mousedown", h); };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer border-none"
        style={{
          background: open ? "var(--bg-subtle)" : "transparent",
          color: "var(--ink-3)",
          padding: "4px 6px",
          borderRadius: 6,
          display: "inline-flex",
        }}
      >
        <IcoMore className="h-[15px] w-[15px]" />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            zIndex: 60,
            background: "#FFFFFF",
            border: "1px solid var(--line-1)",
            borderRadius: 10,
            minWidth: 210,
            padding: 6,
            boxShadow: "0 12px 32px rgba(15,16,18,.12), 0 2px 6px rgba(15,16,18,.06)",
          }}
        >
          <MenuItem
            icon={<IcoOpen className="h-3.5 w-3.5" />}
            label={t("menu.openEvent")}
            onClick={() => { onOpenAction(); setOpen(false); }}
          />
          {canUpdate && (
            <MenuItem
              icon={<IcoEdit className="h-3.5 w-3.5" />}
              label={t("menu.editEvent")}
              onClick={() => { onEdit(); setOpen(false); }}
            />
          )}
          {canCreate && (
            <MenuItem
              icon={<IcoCopy className="h-3.5 w-3.5" />}
              label={t("menu.duplicateEvent")}
              onClick={() => { onDuplicate(); setOpen(false); }}
            />
          )}
          {canCreate && (
            <MenuItem
              icon={<IcoTemplate className="h-3.5 w-3.5" />}
              label={t("menu.saveAsTemplate")}
              onClick={() => { onSaveAsTemplate(); setOpen(false); }}
            />
          )}
          {canUpdate && onStatusChange && (
            <>
              <div style={{ height: 1, background: "var(--line-1)", margin: "4px 0" }} />
              <div style={{ padding: "4px 12px 2px", fontSize: 10.5, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                {t("menu.changeStatus")}
              </div>
              {Object.entries(statusMeta)
                .filter(([key]) => key !== currentStatus)
                .map(([key, meta]) => (
                  <MenuItem
                    key={key}
                    icon={<span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.ink, flexShrink: 0, display: "inline-block" }} />}
                    label={meta.label}
                    onClick={() => { onStatusChange(key); setOpen(false); }}
                  />
                ))}
            </>
          )}
          {canDelete && (
            <>
              <div style={{ height: 1, background: "var(--line-1)", margin: "4px 0" }} />
              <MenuItem
                icon={<IcoTrash className="h-3.5 w-3.5" />}
                label={t("menu.deleteEvent")}
                danger
                onClick={() => { onDelete(); setOpen(false); }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
