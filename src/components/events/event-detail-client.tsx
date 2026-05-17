"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  Calendar01Icon,
  Location01Icon,
  UserGroupIcon,
  Wallet01Icon,
  ListViewIcon,
  Store01Icon,
  PencilEdit01Icon,
  MoreHorizontalIcon,
  Copy01Icon,
} from "@hugeicons/core-free-icons";

const RiCalendarLine = hgIcon(Calendar01Icon);
const RiMapPinLine = hgIcon(Location01Icon);
const RiGroupLine = hgIcon(UserGroupIcon);
const RiMoneyDollarCircleLine = hgIcon(Wallet01Icon);
const RiFileListLine = hgIcon(ListViewIcon);
const RiStore2Line = hgIcon(Store01Icon);
const RiEditLine = hgIcon(PencilEdit01Icon);
const RiMoreLine = hgIcon(MoreHorizontalIcon);
const RiFileCopyLine = hgIcon(Copy01Icon);
const RiFileList3Line = hgIcon(ListViewIcon);
const RiTeamLine = hgIcon(UserGroupIcon);
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { CreateEventDrawer } from "@/components/events/create-event-drawer";
import { DuplicateEventDrawer } from "@/components/events/duplicate-event-drawer";
import { SaveAsTemplateDrawer } from "@/components/events/save-as-template-drawer";
import { CollaboratorDrawer } from "@/components/events/collaborator-drawer";
import { useEvent } from "@/contexts/event-context";
import { useUserSessionContext } from "@/contexts/user-session-context";
import { useEventPermissions } from "@/hooks/use-event-permissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Event {
  id: number;
  name: string;
  type: string;
  status: string;
  date: string | null;
  location: string | null;
  guestCount: number;
  budget: string | null;
  description: string | null;
  isCollaborator?: boolean;
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  eventId: number;
  assignedTo?: string | null;
  assignedUserName?: string | null;
}

interface Payment {
  id: number;
  name: string;
  amount: string;
  status: string;
  dueDate: string | null;
  paidDate: string | null;
}

const statusMap: Record<string, { label: string; variant: "secondary" | "warning" | "success" | "destructive" }> = {
  draft: { label: "Borrador", variant: "secondary" },
  confirmed: { label: "Confirmado", variant: "success" },
  in_progress: { label: "En progreso", variant: "warning" },
  completed: { label: "Completado", variant: "success" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

interface EventDetailClientProps {
  eventId: number;
}

export function EventDetailClient({ eventId }: EventDetailClientProps) {
  const router = useRouter();
  const { setActiveEvent } = useEvent();
  const { eventScoped, can } = useUserSessionContext();
  const [event, setEvent] = useState<Event | null>(null);
  const { canView, canEdit } = useEventPermissions(eventId, eventScoped, event?.isCollaborator);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"view" | "create">("view");
  const [guests, setGuests] = useState<Array<{ id: number; firstName: string; lastName: string }>>([]);
  const [guestStats, setGuestStats] = useState({ total: 0, confirmed: 0, declined: 0, pending: 0 });
  const [payments, setPayments] = useState<Payment[]>([]);
  const [collaborators, setCollaborators] = useState<Array<{
    id: number;
    userId: string | null;
    contactId: number | null;
    vendorId: number | null;
    userName: string | null;
    userEmail: string | null;
    contactName: string | null;
    contactEmail: string | null;
    vendorName: string | null;
    vendorCategory: string | null;
    providerOrgId: number | null;
    type: string;
    role: string | null;
    permissions: Record<string, string> | null;
  }>>([]);
  const [partners, setPartners] = useState<Array<{
    id: number;
    guestOrgId: number | null;
    guestName: string | null;
    guestSlug: string | null;
    guestOrgType: string | null;
    guestCategory: string | null;
    status: string;
    invitedAt: string | null;
    acceptedAt: string | null;
  }>>([]);
  const [collabDrawerOpen, setCollabDrawerOpen] = useState(false);

  // Set active event when loaded
  useEffect(() => {
    if (event) {
      setActiveEvent(event);
    }
  }, [event, setActiveEvent]);


  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      const data = await res.json();
      if (data.success) {
        setEvent(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch event:", error);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/tasks?eventId=${eventId}`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  };

  const fetchPartners = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/partners`);
      const data = await res.json();
      if (data.success) {
        setPartners(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch partners:", error);
    }
  };


  const fetchGuests = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/guests`);
      const data = await res.json();
      if (data.success) {
        setGuests(data.data?.data || []);
        if (data.data?.stats) {
          setGuestStats({
            total: data.data.stats.total || 0,
            confirmed: data.data.stats.confirmed || 0,
            declined: data.data.stats.declined || 0,
            pending: data.data.stats.pending || 0,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch guests:", error);
    }
  };

  const fetchCollaborators = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/collaborators`);
      const data = await res.json();
      if (data.success) {
        setCollaborators(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch collaborators:", error);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await fetch(`/api/finance/payments?eventId=${eventId}`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    }
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await Promise.all([
        fetchEvent(),
        fetchTasks(),
        fetchPartners(),
        fetchGuests(),
        fetchCollaborators(),
        fetchPayments(),
      ]);
      setLoading(false);
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
    setDrawerMode("view");
    setIsDrawerOpen(true);
  };

  const handleTaskCreated = (newTaskId: number) => {
    setSelectedTaskId(newTaskId);
    setDrawerMode("view");
    fetchTasks();
  };

  if (loading) {
    return (
      <div className="space-y-[var(--gap-cards-lg)]">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-[var(--gap-cards)] md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Evento no encontrado</p>
        <Link href="/dashboard/events">
          <Button variant="outline" className="mt-4">
            Volver a eventos
          </Button>
        </Link>
      </div>
    );
  }

  const status = statusMap[event.status] || statusMap.draft;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const pendingTasks = tasks.filter((t) => t.status !== "completed");

  // Days-left to event (prototype's `event.daysLeft`).
  const daysLeft = (() => {
    if (!event.date) return null;
    const eventDate = new Date(event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ms = eventDate.getTime() - today.getTime();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  })();

  // Active partners (prototype maps this to `status === 'Confirmado'`).
  const activePartners = partners.filter((p) => p.status === "active").length;
  const totalPartners = partners.length;

  // RSVP counts come from guest list (donut chart input).
  const rsvpConfirmed = guestStats.confirmed;
  const rsvpPending = guestStats.pending;
  const rsvpDeclined = guestStats.declined;
  const rsvpTotal = guestStats.total || guests.length;

  // Payment KPIs — prototype's "Pagado" + budget% + next 2 scheduled payments.
  const budgetTotal = event.budget ? Number(event.budget) : 0;
  const budgetPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const budgetPct = budgetTotal > 0 ? Math.round((budgetPaid / budgetTotal) * 100) : 0;
  const upcomingPayments = payments
    .filter((p) => p.status === "scheduled" || p.status === "pending")
    .slice(0, 2);

  // Avatar palette for task assignees (small chip).
  const ASSIGNEE_COLORS = ["#6B8CE8", "#8CC8B0", "#4B7FB8", "#C4A08C", "#B89DC4", "#C49A3C"];
  const colorForAssignee = (name: string) => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return ASSIGNEE_COLORS[h % ASSIGNEE_COLORS.length];
  };
  const initialsForAssignee = (name: string) =>
    name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";

  // Format due date as "12 mar" (prototype's pill format).
  const formatDue = (d: string | null) => {
    if (!d) return null;
    const date = new Date(d);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  return (
    <div className="space-y-[var(--gap-cards-lg)]">
      {/* Collaboration banner */}
      {event.isCollaborator && (
        <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
          <RiTeamLine className="h-4 w-4 shrink-0" />
          <span>Estas colaborando en este evento</span>
        </div>
      )}
      {/* Top action row — edit + more menu */}
      <div className="flex items-center justify-end gap-2">
        {canEdit("general") && (
          <Button className="gap-2" onClick={() => setIsEditEventOpen(true)}>
            <RiEditLine className="h-4 w-4" />
            Editar Evento
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <RiMoreLine className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {can("events:create") && (
              <DropdownMenuItem onClick={() => setIsDuplicateOpen(true)}>
                <RiFileCopyLine className="h-4 w-4 mr-2" />
                Duplicar Evento
              </DropdownMenuItem>
            )}
            {can("events:create") && (
              <DropdownMenuItem onClick={() => setIsSaveTemplateOpen(true)}>
                <RiFileList3Line className="h-4 w-4 mr-2" />
                Guardar como Template
              </DropdownMenuItem>
            )}
            {canEdit("settings") && (
              <DropdownMenuItem onClick={() => setCollabDrawerOpen(true)}>
                <RiTeamLine className="h-4 w-4 mr-2" />
                Gestionar equipo
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/events/${eventId}/tasks`}>
                <RiFileListLine className="h-4 w-4 mr-2" />
                Ver todas las tareas
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Row 1 — Hero (2/3) + Resumen (1/3). Prototype: workspace_screens.jsx:40 */}
      <div className="grid gap-[14px] lg:grid-cols-[2fr_1fr]">
        {/* Hero card */}
        <div
          className="rounded-[12px]"
          style={{
            background:
              "linear-gradient(135deg, var(--bg-panel) 0%, var(--bg-subtle) 100%)",
            border: "1px solid var(--line-1)",
            padding: 18,
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="flex-shrink-0 flex items-center justify-center"
              style={{
                width: 58,
                height: 58,
                borderRadius: 12,
                background: "linear-gradient(135deg,#FCE0DA,#F9D4DC)",
              }}
            >
              <RiCalendarLine className="h-7 w-7" style={{ color: "var(--ink-2)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-[var(--ink-3)] mb-0.5">Evento</div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  className="text-[22px] font-semibold text-[var(--ink-1)]"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  {event.name}
                </h2>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <div
                className="flex gap-[18px] mt-2 text-[13px] flex-wrap"
                style={{ color: "var(--ink-2)" }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <RiCalendarLine className="h-3.5 w-3.5" />
                  {event.date
                    ? new Date(event.date).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Sin fecha"}
                </span>
                {event.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <RiMapPinLine className="h-3.5 w-3.5" />
                    {event.location}
                  </span>
                )}
                {canView("guests") && (
                  <span className="inline-flex items-center gap-1.5">
                    <RiGroupLine className="h-3.5 w-3.5" />
                    {event.guestCount} invitados
                  </span>
                )}
              </div>
              {event.description && (
                <p className="text-[12.5px] text-[var(--ink-3)] mt-2 leading-[1.5]">
                  {event.description}
                </p>
              )}
            </div>
            {daysLeft != null && (
              <div
                className="text-center flex-shrink-0"
                style={{
                  padding: "8px 16px",
                  background: "white",
                  borderRadius: 8,
                  border: "1px solid var(--line-1)",
                }}
              >
                <div
                  className="text-[11px] font-semibold uppercase text-[var(--ink-3)]"
                  style={{ letterSpacing: "0.06em" }}
                >
                  Faltan
                </div>
                <div
                  className="text-[26px] font-bold leading-[1] mt-0.5"
                  style={{ color: "var(--ink-1)" }}
                >
                  {daysLeft}
                </div>
                <div className="text-[11px] text-[var(--ink-3)]">días</div>
              </div>
            )}
          </div>
        </div>

        {/* Resumen card */}
        <div
          className="rounded-[12px]"
          style={{
            background: "#FFFFFF",
            border: "1px solid var(--line-1)",
            padding: 18,
          }}
        >
          <div className="flex items-center gap-2 mb-3.5">
            <RiFileListLine className="h-4 w-4 text-[var(--ink-2)]" />
            <span className="text-[14px] font-semibold text-[var(--ink-1)]">Resumen</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <div
                className="text-[10.5px] uppercase text-[var(--ink-3)]"
                style={{ letterSpacing: "0.06em" }}
              >
                Partners
              </div>
              <div className="text-[14px] font-semibold mt-0.5">
                {activePartners}/{totalPartners}
              </div>
            </div>
            <div>
              <div
                className="text-[10.5px] uppercase text-[var(--ink-3)]"
                style={{ letterSpacing: "0.06em" }}
              >
                Tareas
              </div>
              <div className="text-[14px] font-semibold mt-0.5">
                {completedTasks}/{tasks.length}
              </div>
            </div>
            <div>
              <div
                className="text-[10.5px] uppercase text-[var(--ink-3)]"
                style={{ letterSpacing: "0.06em" }}
              >
                RSVP
              </div>
              <div className="text-[14px] font-semibold mt-0.5">
                {rsvpConfirmed}/{rsvpTotal}
              </div>
            </div>
          </div>
          {tasks.length > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--line-1)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11.5px] text-[var(--ink-3)]">Progreso</span>
                <span className="text-[11.5px] font-semibold text-[var(--ink-1)]">
                  {completionRate}%
                </span>
              </div>
              <div
                className="h-1.5 rounded-[999px] overflow-hidden"
                style={{ background: "var(--bg-subtle)" }}
              >
                <div
                  className="h-full transition-all"
                  style={{ width: `${completionRate}%`, background: "var(--ink-1)" }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2 — Tareas pendientes + RSVP donut + Próximos pagos.
          Prototype: workspace_screens.jsx:85 */}
      <div className="grid gap-[14px] lg:grid-cols-[1.2fr_1fr_1fr]">
        {/* Tareas pendientes */}
        {canView("tasks") && (
          <div
            className="rounded-[12px]"
            style={{ background: "#FFFFFF", border: "1px solid var(--line-1)", padding: 18 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <RiFileListLine className="h-4 w-4 text-[var(--ink-2)]" />
                <span className="text-[14px] font-semibold text-[var(--ink-1)]">
                  Tareas pendientes
                </span>
              </div>
              <Link
                href={`/dashboard/tasks?eventId=${eventId}`}
                className="text-[13px] text-[var(--ink-2)] hover:text-[var(--ink-1)] transition-colors no-underline"
              >
                Ver todas
              </Link>
            </div>
            <div>
              {pendingTasks.length === 0 ? (
                <div className="py-4 text-[12.5px] text-[var(--ink-3)] text-center">
                  No hay tareas pendientes.
                </div>
              ) : (
                pendingTasks.slice(0, 4).map((t) => {
                  const dueLabel = formatDue(t.dueDate);
                  const assigneeName = t.assignedUserName || "Sin asignar";
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-2.5 py-2 cursor-pointer"
                      style={{ borderBottom: "1px solid var(--line-1)" }}
                      onClick={() => handleTaskClick(t)}
                    >
                      <div
                        className="h-4 w-4 rounded-full flex-shrink-0"
                        style={{ border: "1.5px solid var(--line-strong)" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[var(--ink-1)] truncate">
                          {t.title}
                        </div>
                        <div className="text-[11px] text-[var(--ink-3)] mt-0.5">
                          {t.priority === "high"
                            ? "Alta prioridad"
                            : t.priority === "medium"
                              ? "Media prioridad"
                              : "Baja prioridad"}
                        </div>
                      </div>
                      {dueLabel && (
                        <span
                          className="inline-flex items-center rounded-[999px] text-[11px] font-medium px-2 py-0.5 flex-shrink-0"
                          style={{ background: "var(--danger-bg)", color: "var(--danger-ink)" }}
                        >
                          {dueLabel}
                        </span>
                      )}
                      {t.assignedUserName && (
                        <div
                          className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0"
                          style={{ background: colorForAssignee(assigneeName) }}
                          title={assigneeName}
                        >
                          {initialsForAssignee(assigneeName)}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* RSVP donut */}
        {canView("guests") && (
          <div
            className="rounded-[12px]"
            style={{ background: "#FFFFFF", border: "1px solid var(--line-1)", padding: 18 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <RiGroupLine className="h-4 w-4 text-[var(--ink-2)]" />
                <span className="text-[14px] font-semibold text-[var(--ink-1)]">
                  Estado RSVP
                </span>
              </div>
              <Link
                href={`/dashboard/events/${eventId}/guests`}
                className="text-[13px] text-[var(--ink-2)] hover:text-[var(--ink-1)] transition-colors no-underline"
              >
                Ver invitados
              </Link>
            </div>
            <RsvpDonut
              total={rsvpTotal}
              confirmed={rsvpConfirmed}
              pending={rsvpPending}
              rejected={rsvpDeclined}
            />
            <div className="flex justify-around mt-2.5 text-[12px]">
              <RsvpDot color="#4F7A5E" label="Confirm." value={rsvpConfirmed} />
              <RsvpDot color="#C89B3C" label="Pend." value={rsvpPending} />
              <RsvpDot color="#B55450" label="Rechaz." value={rsvpDeclined} />
            </div>
          </div>
        )}

        {/* Próximos pagos — workspace_screens.jsx:118 */}
        {canView("finances") && (
          <div
            className="rounded-[12px]"
            style={{ background: "#FFFFFF", border: "1px solid var(--line-1)", padding: 18 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <RiMoneyDollarCircleLine className="h-4 w-4 text-[var(--ink-2)]" />
                <span className="text-[14px] font-semibold text-[var(--ink-1)]">
                  Próximos pagos
                </span>
              </div>
              <Link
                href={`/dashboard/events/${eventId}/finances`}
                className="text-[13px] text-[var(--ink-2)] hover:text-[var(--ink-1)] transition-colors no-underline"
              >
                Ver todo
              </Link>
            </div>
            <div>
              <div
                className="py-2"
                style={{ borderBottom: "1px solid var(--line-1)" }}
              >
                <div
                  className="text-[11px] uppercase text-[var(--ink-3)]"
                  style={{ letterSpacing: "0.06em" }}
                >
                  Pagado
                </div>
                <div
                  className="text-[18px] font-bold mt-0.5"
                  style={{ color: "var(--ink-1)" }}
                >
                  €{budgetPaid.toLocaleString("es-ES")}
                </div>
                {budgetTotal > 0 ? (
                  <div className="text-[11px] text-[var(--ink-3)]">
                    {budgetPct}% de €{budgetTotal.toLocaleString("es-ES")}
                  </div>
                ) : (
                  <div className="text-[11px] text-[var(--ink-3)]">
                    Sin presupuesto definido
                  </div>
                )}
              </div>
              {upcomingPayments.length === 0 ? (
                <div className="py-3 text-[12px] text-[var(--ink-3)] text-center">
                  Sin pagos programados
                </div>
              ) : (
                upcomingPayments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 py-2"
                    style={{ borderBottom: "1px solid var(--line-1)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[var(--ink-1)] truncate">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-[var(--ink-3)] mt-0.5">
                        {p.dueDate
                          ? new Date(p.dueDate).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "short",
                            })
                          : "Sin fecha"}
                      </div>
                    </div>
                    <div className="text-[14px] font-semibold text-[var(--ink-1)]">
                      €{Number(p.amount).toLocaleString("es-ES")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Row 3 — Reuniones + Partners. Prototype: workspace_screens.jsx:155 */}
      <div className="grid gap-[14px] lg:grid-cols-2">
        {/* Próximas videollamadas y reuniones */}
        <div
          className="rounded-[12px]"
          style={{ background: "#FFFFFF", border: "1px solid var(--line-1)", padding: 18 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <RiCalendarLine className="h-4 w-4 text-[var(--ink-2)]" />
              <span className="text-[14px] font-semibold text-[var(--ink-1)]">
                Próximas videollamadas y reuniones
              </span>
            </div>
          </div>
          <div className="text-[12.5px] text-[var(--ink-3)] py-6 text-center">
            Sin reuniones programadas
          </div>
        </div>

        {/* Partners del evento */}
        {canView("partners") && (
          <div
            className="rounded-[12px]"
            style={{ background: "#FFFFFF", border: "1px solid var(--line-1)", padding: 18 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <RiStore2Line className="h-4 w-4 text-[var(--ink-2)]" />
                <span className="text-[14px] font-semibold text-[var(--ink-1)]">
                  Partners del evento
                </span>
              </div>
              <Link
                href={`/dashboard/events/${eventId}/partners`}
                className="text-[13px] text-[var(--ink-2)] hover:text-[var(--ink-1)] transition-colors no-underline"
              >
                Ver todos
              </Link>
            </div>
            {partners.length === 0 ? (
              <div className="text-[12.5px] text-[var(--ink-3)] py-4 text-center">
                No hay partners asignados
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {partners.slice(0, 5).map((partner) => {
                  const partnerName = partner.guestName || partner.guestSlug || "Partner";
                  const initials = partnerName.charAt(0).toUpperCase();
                  return (
                    <div
                      key={partner.id}
                      className="flex items-center gap-2.5 py-1.5"
                      style={{ borderBottom: "1px solid var(--line-1)" }}
                    >
                      <div
                        className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 text-white"
                        style={{ background: "#9B7EB8" }}
                      >
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12.5px] font-medium text-[var(--ink-1)] truncate">
                          {partnerName}
                        </div>
                        {partner.guestCategory && (
                          <div className="text-[11px] text-[var(--ink-3)] truncate">
                            {partner.guestCategory}
                          </div>
                        )}
                      </div>
                      <span
                        className="inline-flex items-center rounded-[999px] text-[10.5px] px-2 py-0.5 flex-shrink-0"
                        style={{
                          background:
                            partner.status === "active"
                              ? "#D9ECD1"
                              : partner.status === "pending"
                                ? "#F6D9BE"
                                : "var(--bg-subtle)",
                          color:
                            partner.status === "active"
                              ? "#1F6A3A"
                              : partner.status === "pending"
                                ? "#A35A1F"
                                : "var(--ink-3)",
                        }}
                      >
                        {partner.status === "active"
                          ? "Confirmado"
                          : partner.status === "pending"
                            ? "Pendiente"
                            : partner.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task Drawer - for both view and create */}
      <TaskDrawer
        taskId={selectedTaskId}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onTaskDeleted={() => fetchTasks()}
        onTaskUpdated={() => fetchTasks()}
        onTaskCreated={handleTaskCreated}
        mode={drawerMode}
        readOnly={!canEdit("tasks")}
        initialData={{ eventId }}
      />

      {/* Edit Event Drawer — same drawer as the "create event" flow,
          hydrated with the existing event so the visual is consistent. */}
      <CreateEventDrawer
        open={isEditEventOpen}
        onOpenChange={setIsEditEventOpen}
        editEvent={event}
        onEventUpdated={fetchEvent}
      />

      {/* Duplicate Event Drawer */}
      <DuplicateEventDrawer
        open={isDuplicateOpen}
        onOpenChange={setIsDuplicateOpen}
        eventId={eventId}
        eventName={event.name}
        onDuplicated={(newEventId) => router.push(`/dashboard/events/${newEventId}`)}
      />

      {/* Save as Template Drawer */}
      <SaveAsTemplateDrawer
        open={isSaveTemplateOpen}
        onOpenChange={setIsSaveTemplateOpen}
        eventId={eventId}
        eventName={event.name}
      />

      {/* Collaborator Drawer */}
      <CollaboratorDrawer
        open={collabDrawerOpen}
        onOpenChange={setCollabDrawerOpen}
        eventId={eventId}
        onSuccess={fetchCollaborators}
        existingParticipants={collaborators}
      />
    </div>
  );
}

// RsvpDonut — copied from prototype workspace_screens.jsx:193 (3-segment ring).
function RsvpDonut({
  total,
  confirmed,
  pending,
  rejected,
}: {
  total: number;
  confirmed: number;
  pending: number;
  rejected: number;
}) {
  const r = 34;
  const C = 2 * Math.PI * r;
  const safeTotal = total > 0 ? total : 1;
  const segs = [
    { v: confirmed, c: "#4F7A5E" },
    { v: pending, c: "#C89B3C" },
    { v: rejected, c: "#B55450" },
  ];
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" width="100%" style={{ maxHeight: 120 }}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--line-1)" strokeWidth="10" />
      {segs.map((s, i) => {
        const len = (s.v / safeTotal) * C;
        const el = (
          <circle
            key={i}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={s.c}
            strokeWidth="10"
            strokeDasharray={`${len} ${C - len}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 50 50)"
            strokeLinecap="butt"
          />
        );
        offset += len;
        return el;
      })}
      <text
        x="50"
        y="48"
        textAnchor="middle"
        fontSize="16"
        fontWeight="700"
        fill="var(--ink-1)"
      >
        {confirmed}
      </text>
      <text x="50" y="62" textAnchor="middle" fontSize="9" fill="var(--ink-3)">
        de {total}
      </text>
    </svg>
  );
}

function RsvpDot({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="text-[var(--ink-3)]">{label}</span>
      <strong className="text-[var(--ink-1)]">{value}</strong>
    </div>
  );
}
