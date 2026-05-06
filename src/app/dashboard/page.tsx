"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, addDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useUserSession } from "@/hooks/use-user-session";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  Calendar03Icon,
  CheckmarkSquare02Icon,
  Wallet01Icon,
  UserCircleIcon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  ArrowDown01Icon,
  Search01Icon,
  PlusSignIcon,
  Money01Icon,
  Calendar01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

const IcoEvents = hgIcon(Calendar03Icon);
const IcoTasks = hgIcon(CheckmarkSquare02Icon);
const IcoWallet = hgIcon(Wallet01Icon);
const IcoUser = hgIcon(UserCircleIcon);
const IcoChevR = hgIcon(ArrowRight01Icon);
const IcoChevL = hgIcon(ArrowLeft01Icon);
const IcoChevDown = hgIcon(ArrowDown01Icon);
const IcoSearch = hgIcon(Search01Icon);
const IcoPlus = hgIcon(PlusSignIcon);
const IcoMoney = hgIcon(Money01Icon);
const IcoCalendar = hgIcon(Calendar01Icon);
const IcoGuests = hgIcon(UserGroupIcon);

interface PlannerStats {
  type: "planner";
  totalEvents: number;
  pendingTasks: number;
  pendingPayments: number;
  activeLeads: number;
  recentEvents: Array<{
    id: number;
    name: string;
    date: string | null;
    status: string;
    guestCount: number | null;
    location: string | null;
    budget: number | null;
    type: string | null;
  }>;
  pendingTasksList: Array<{
    id: number;
    title: string;
    priority: string;
    dueDate: string | null;
  }>;
}

interface ProviderStats {
  type: "provider";
  organization: {
    name: string;
    verificationStatus: string | null;
    instagramHandle: string | null;
    providerCategory: string | null;
  };
  stats: {
    activeEvents: number;
    pendingTasks: number;
    totalRevenue: number;
    pendingInvoices: number;
    currency: string;
  };
}

const fmtEur = (n: number, cur = "EUR") =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);

const fmtEurDecimals = (n: number, cur = "EUR") =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: cur, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

// Avatar palette indexed by initial char (matches prototype --av-* tokens)
const AV_BG: Record<string, string> = {
  L: "#F4B942", F: "#00B66D", C: "#E85D4E", A: "#E85D4E",
  M: "#9B7EDB", S: "#5B8FE8", J: "#3DB6A8", D: "#5B8FE8",
};
const avBg = (s: string) => AV_BG[s.charAt(0).toUpperCase()] || "#8B7355";

// Map event_type DB enum → human label + pill color (matches prototype tag-* tokens)
function eventTypeMeta(type: string | null | undefined): {
  label: string;
  color: "wedding" | "birthday" | "corporate" | "stage";
} {
  switch (type) {
    case "wedding": return { label: "Boda", color: "wedding" };
    case "pre_wedding": return { label: "Pre-boda", color: "wedding" };
    case "post_wedding": return { label: "Post-boda", color: "wedding" };
    case "birthday": return { label: "Cumpleaños", color: "birthday" };
    case "corporate": return { label: "Corporativo", color: "corporate" };
    case "social": return { label: "Social", color: "stage" };
    case "other": return { label: "Otro", color: "stage" };
    default: return { label: "Evento", color: "stage" };
  }
}

// ============================================================
// useCountUp — animated number from 0 → target (cubic ease-out)
// ============================================================
function useCountUp(target: number, durationMs = 900): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    let raf: number | null = null;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [target, durationMs]);
  return val;
}

const AnimNum = ({ value, decimals = 0, prefix = "", suffix = "" }: {
  value: number; decimals?: number; prefix?: string; suffix?: string;
}) => {
  const v = useCountUp(value);
  const display = decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString("es-ES");
  return <>{prefix}{display}{suffix}</>;
};

// ============================================================
// KPI cell
// ============================================================
function Kpi({ label, value, sub, delta, deltaTone = "zero", animateValue }: {
  label: string;
  value: string | number;
  sub?: string;
  delta?: string;
  deltaTone?: "pos" | "neg" | "zero";
  animateValue?: number;
}) {
  const deltaColor = deltaTone === "pos" ? "var(--success-ink)" : deltaTone === "neg" ? "var(--danger-ink)" : "var(--ink-3)";
  return (
    <div className="px-5 py-4 first:pl-5 not-first:border-l border-[var(--line-1)]">
      <div className="text-[12.5px] text-[var(--ink-3)] font-medium mb-1.5">{label}</div>
      <div className="flex items-baseline gap-2.5">
        <span
          className="text-[26px] font-semibold text-[var(--ink-1)]"
          style={{ letterSpacing: "-0.02em" }}
        >
          {animateValue !== undefined ? <AnimNum value={animateValue} /> : value}
        </span>
        {delta && <span style={{ color: deltaColor }} className="text-[12px] font-medium">{delta}</span>}
      </div>
      {sub && <div className="text-[12px] text-[var(--ink-3)]">{sub}</div>}
    </div>
  );
}

// ============================================================
// DashCard — equivalent to prototype's .card
// ============================================================
function DashCard({ title, icon: Icon, action, onAction, children, className = "" }: {
  title?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  onAction?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[12px] p-[18px] ${className}`}
      style={{ background: "#FFFFFF", border: "1px solid var(--line-1)" }}
    >
      {title && (
        <div className="flex items-center gap-2 mb-3.5">
          {Icon && <Icon className="h-4 w-4 text-[var(--ink-2)]" />}
          <span
            className="text-[14px] font-semibold text-[var(--ink-1)]"
            style={{ letterSpacing: "-0.005em" }}
          >
            {title}
          </span>
          {action && (
            <button
              onClick={onAction}
              className="ml-auto text-[13px] text-[var(--ink-2)] hover:text-[var(--ink-1)] cursor-pointer bg-transparent border-none"
            >
              {action}
            </button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// ============================================================
// ActionRow
// ============================================================
function ActionRow({ icon: Icon, title, sub, onClick }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; sub: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{ background: "#FFFFFF", border: "1px solid var(--line-1)" }}
      className="flex items-center gap-3 px-4 py-3.5 rounded-[12px] cursor-pointer text-left w-full transition-colors hover:border-[var(--line-strong)]"
    >
      <div className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-[8px] bg-[var(--bg-subtle)] text-[var(--ink-1)]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-[var(--ink-1)]">{title}</div>
        <div className="text-[12.5px] text-[var(--ink-3)] mt-0.5">{sub}</div>
      </div>
      <IcoChevR className="h-4 w-4 text-[var(--ink-3)] flex-shrink-0" />
    </button>
  );
}

// ============================================================
// Sparkline — smoothed area chart with coral gradient + animation
// ============================================================
const SPARK_DATA = [
  { x: 0, v: 1500 }, { x: 1, v: 2800 }, { x: 2, v: 3200 },
  { x: 3, v: 4400 }, { x: 4, v: 5100 }, { x: 5, v: 6800 },
  { x: 6, v: 7900 }, { x: 7, v: 9200 }, { x: 8, v: 10500 },
  { x: 9, v: 11800 }, { x: 10, v: 13200 }, { x: 11, v: 14480 },
];

function Sparkline() {
  return (
    <div className="mt-2 h-[80px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={SPARK_DATA} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E85D4E" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#E85D4E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke="#E85D4E"
            strokeWidth={2}
            strokeLinecap="round"
            fill="url(#sparkFill)"
            isAnimationActive={true}
            animationDuration={900}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================
// CalendarStrip — 5-day strip with month header navigation
// ============================================================
function CalendarStrip() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [centerOffset, setCenterOffset] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(2); // middle day default

  const days = useMemo(() => {
    const center = addDays(today, centerOffset);
    return [-2, -1, 0, 1, 2].map((i) => addDays(center, i));
  }, [today, centerOffset]);

  const monthLabel = format(days[selectedIdx], "MMMM yyyy", { locale: es });
  const monthLabelCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <div className="rounded-[8px] p-2.5 mb-3" style={{ background: "var(--bg-subtle)" }}>
      <div className="flex items-center justify-between px-1 pb-1.5">
        <button
          onClick={() => setCenterOffset((o) => o - 30)}
          aria-label="Mes anterior"
          className="h-[26px] w-[26px] rounded-full flex items-center justify-center bg-transparent border-none cursor-pointer text-[var(--ink-2)] hover:bg-[var(--bg-hover)]"
        >
          <IcoChevL className="h-3 w-3" />
        </button>
        <span className="text-[13px] font-semibold text-[var(--ink-1)]">{monthLabelCap}</span>
        <button
          onClick={() => setCenterOffset((o) => o + 30)}
          aria-label="Mes siguiente"
          className="h-[26px] w-[26px] rounded-full flex items-center justify-center bg-transparent border-none cursor-pointer text-[var(--ink-2)] hover:bg-[var(--bg-hover)]"
        >
          <IcoChevR className="h-3 w-3" />
        </button>
      </div>
      <div className="flex items-center gap-0.5 py-1.5">
        <button
          onClick={() => setSelectedIdx((i) => Math.max(0, i - 1))}
          aria-label="Día anterior"
          className="h-[26px] w-[26px] rounded-full flex items-center justify-center bg-transparent border-none cursor-pointer text-[var(--ink-2)] hover:bg-[var(--bg-hover)] flex-shrink-0"
        >
          <IcoChevL className="h-3 w-3" />
        </button>
        {days.map((d, i) => {
          const selected = i === selectedIdx;
          const dayName = format(d, "EEE", { locale: es });
          const dayNum = format(d, "dd");
          return (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              className="flex-1 flex flex-col items-center py-1.5 px-1 rounded-[8px] cursor-pointer border-none transition-colors"
              style={{
                background: selected ? "var(--ink-1)" : "transparent",
                color: selected ? "rgba(255,255,255,0.6)" : "var(--ink-3)",
                fontSize: "11.5px",
                fontWeight: 500,
              }}
            >
              <span className="capitalize">{dayName}</span>
              <strong
                className="text-[15px] font-semibold mt-0.5"
                style={{ color: selected ? "#FFFFFF" : "var(--ink-1)" }}
              >
                {dayNum}
              </strong>
            </button>
          );
        })}
        <button
          onClick={() => setSelectedIdx((i) => Math.min(days.length - 1, i + 1))}
          aria-label="Día siguiente"
          className="h-[26px] w-[26px] rounded-full flex items-center justify-center bg-transparent border-none cursor-pointer text-[var(--ink-2)] hover:bg-[var(--bg-hover)] flex-shrink-0"
        >
          <IcoChevR className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Mini cards used inside the Cronograma list
// (event-mini structure ported from prototype styles.css)
// ============================================================
const TYPE_PILL: Record<string, { bg: string; ink: string }> = {
  wedding: { bg: "var(--tag-wedding-bg)", ink: "var(--tag-wedding-ink)" },
  birthday: { bg: "var(--tag-birthday-bg)", ink: "var(--tag-birthday-ink)" },
  corporate: { bg: "var(--tag-corporate-bg)", ink: "var(--tag-corporate-ink)" },
  stage: { bg: "var(--tag-stage-bg)", ink: "var(--tag-stage-ink)" },
};

const STATUS_PILL: Record<string, { bg: string; ink: string }> = {
  Pagada: { bg: "var(--success-bg)", ink: "var(--success-ink)" },
  Pendiente: { bg: "var(--danger-bg)", ink: "var(--danger-ink)" },
  Vencida: { bg: "var(--danger-bg)", ink: "var(--danger-ink)" },
  Parcial: { bg: "var(--warn-bg)", ink: "var(--warn-ink)" },
  Borrador: { bg: "var(--bg-subtle)", ink: "var(--ink-2)" },
  Completada: { bg: "var(--success-bg)", ink: "var(--success-ink)" },
};

function EventMini({
  name, type, typeColor, date, location, budget, guests, onClick,
}: {
  name: string;
  type: string;
  typeColor: keyof typeof TYPE_PILL;
  date: string | null;
  location?: string | null;
  budget?: number | null;
  guests?: number | null;
  onClick: () => void;
}) {
  const pill = TYPE_PILL[typeColor];
  const hasLocation = location && location.trim() !== "";
  const hasBudget = budget !== undefined && budget !== null;
  const hasGuests = guests !== undefined && guests !== null;
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3.5 border-t border-[var(--line-2)] first:border-t-0 hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer bg-transparent border-x-0 border-b-0"
    >
      <div className="flex items-center gap-2">
        <span className="text-[14px] font-semibold text-[var(--ink-1)] flex-1 truncate">{name}</span>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: pill.bg, color: pill.ink }}
        >
          {type}
        </span>
      </div>
      {date && (
        <div
          className="text-[11.5px] text-[var(--ink-3)] uppercase mt-1"
          style={{ letterSpacing: "0.06em" }}
        >
          {format(new Date(date), "d 'DE' MMMM, yyyy", { locale: es }).toUpperCase()}
        </div>
      )}
      {hasLocation && (
        <div className="flex items-center gap-1.5 text-[13px] text-[var(--ink-2)] mt-2.5">
          <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: "var(--danger)" }} />
          <span className="truncate">{location}</span>
        </div>
      )}
      {(hasBudget || hasGuests) && (
        <div className="flex items-center mt-2.5">
          {hasBudget && (
            <span className="text-[13px] font-semibold text-[var(--ink-1)]">
              {fmtEur(budget!, "EUR")}
            </span>
          )}
          {hasGuests && (
            <span className="ml-auto text-[12.5px] text-[var(--ink-3)] inline-flex items-center gap-1.5">
              <IcoGuests className="h-3 w-3" />
              {guests}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

function TaskMini({
  title, dueDate, stage, done, assigneeInitial,
}: {
  title: string;
  dueDate: string | null;
  stage?: string;
  done: boolean;
  assigneeInitial: string;
}) {
  const status = done ? "Completada" : "Pendiente";
  const pill = STATUS_PILL[status];
  return (
    <div className="px-4 py-3.5 border-t border-[var(--line-2)] first:border-t-0">
      <div className="text-[14px] font-semibold text-[var(--ink-1)]">{title}</div>
      <div
        className="text-[11.5px] text-[var(--ink-3)] uppercase mt-1"
        style={{ letterSpacing: "0.06em" }}
      >
        {dueDate ? format(new Date(dueDate), "d MMM yyyy", { locale: es }).toUpperCase() : "SIN FECHA"}
        {stage && ` · ${stage}`}
      </div>
      <div className="flex items-center mt-2.5">
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: pill.bg, color: pill.ink }}
        >
          {status}
        </span>
        <span className="ml-auto">
          <Avatar initials={assigneeInitial} size={22} />
        </span>
      </div>
    </div>
  );
}

function PaymentMini({
  concept, date, client, amount, status,
}: {
  concept: string;
  date: string;
  client: string;
  amount: number;
  status: keyof typeof STATUS_PILL;
}) {
  const pill = STATUS_PILL[status] || STATUS_PILL.Borrador;
  return (
    <div className="px-4 py-3.5 border-t border-[var(--line-2)] first:border-t-0">
      <div className="text-[14px] font-semibold text-[var(--ink-1)]">{concept}</div>
      <div
        className="text-[11.5px] text-[var(--ink-3)] uppercase mt-1"
        style={{ letterSpacing: "0.06em" }}
      >
        {date.toUpperCase()} · {client}
      </div>
      <div className="flex items-center mt-2.5">
        <span className="text-[13px] font-semibold text-[var(--ink-1)]">
          {fmtEur(amount, "EUR")}
        </span>
        <span
          className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: pill.bg, color: pill.ink }}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

// Mock invoices used for the Pagos tab — until /api/dashboard/stats
// is extended to return invoice details.
const MOCK_PAYMENTS = [
  { id: 1, concept: "Coordinación boda — saldo 40%", date: "15 abr 2026", client: "Cami R.", amount: 48000, status: "Pendiente" as const },
  { id: 2, concept: "Coordinación boda — anticipo 30%", date: "20 ene 2026", client: "Cami R.", amount: 36000, status: "Pagada" as const },
  { id: 3, concept: "Coordinación evento — anticipo 40%", date: "5 mar 2026", client: "Laura B.", amount: 14250, status: "Parcial" as const },
  { id: 4, concept: "Coordinación boda — final 30%", date: "1 may 2026", client: "Cami R.", amount: 12000, status: "Vencida" as const },
];

// ============================================================
// Avatar (lightweight, just for dashboard use)
// ============================================================
const Avatar = ({ initials, color, size = 24 }: { initials: string; color?: string; size?: number }) => (
  <div
    className="inline-flex items-center justify-center rounded-full text-white font-semibold flex-shrink-0"
    style={{
      width: size,
      height: size,
      background: color || avBg(initials),
      fontSize: Math.round(size * 0.45),
    }}
  >
    {initials}
  </div>
);

// ============================================================
// Main Dashboard
// ============================================================
export default function DashboardPage() {
  const router = useRouter();
  const { eventScoped, loading: sessionLoading, orgType } = useUserSession();
  const [data, setData] = useState<PlannerStats | ProviderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"Eventos" | "Pagos" | "Tareas">("Eventos");
  const [search, setSearch] = useState("");

  const isProvider = orgType === "provider";
  const [expanded, setExpanded] = useState(false);

  // Reset expanded state when switching tabs so each tab starts collapsed.
  const handleTabChange = (t: typeof tab) => {
    setTab(t);
    setExpanded(false);
  };

  useEffect(() => {
    if (!sessionLoading && eventScoped) router.replace("/dashboard/events");
  }, [eventScoped, sessionLoading, router]);

  useEffect(() => {
    if (eventScoped || sessionLoading) return;
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch((e) => console.error("dashboard stats:", e))
      .finally(() => setLoading(false));
  }, [eventScoped, sessionLoading]);

  const dash = !isProvider && data?.type === "planner" ? data : null;
  const prov = isProvider && data?.type === "provider" ? data : null;
  const cur = prov?.stats.currency || "EUR";

  // ── KPIs ─────────────────────────────────────────────────────
  const kpiEvents = isProvider ? prov?.stats.activeEvents ?? 0 : dash?.totalEvents ?? 0;
  const kpiTasks = isProvider ? prov?.stats.pendingTasks ?? 0 : dash?.pendingTasks ?? 0;
  const kpiPaymentsAmt = isProvider ? prov?.stats.pendingInvoices ?? 0 : dash?.pendingPayments ?? 0;
  const kpiLeadsOrRev = isProvider ? prov?.stats.totalRevenue ?? 0 : dash?.activeLeads ?? 0;
  const balanceTotal = isProvider ? prov?.stats.totalRevenue ?? 0 : 14480.24;

  const nextEvent = dash?.recentEvents?.[0];
  const eventProgress = 0.5; // TODO: derive from event data when available

  return (
    <div className="flex flex-col gap-4">
      {/* KPI row */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 rounded-[12px] overflow-hidden"
        style={{ background: "#FFFFFF", border: "1px solid var(--line-1)" }}
      >
        <Kpi
          label="Eventos activos"
          value={kpiEvents}
          animateValue={loading ? undefined : kpiEvents}
          delta={kpiEvents > 0 ? `+${kpiEvents}` : "0"}
          deltaTone={kpiEvents > 0 ? "pos" : "zero"}
          sub={isProvider ? "con participación" : "en gestión ahora"}
        />
        <Kpi
          label="Tareas pendientes"
          value={kpiTasks}
          animateValue={loading ? undefined : kpiTasks}
          delta={kpiTasks > 0 ? `${kpiTasks} pendiente${kpiTasks > 1 ? "s" : ""}` : "al día"}
          deltaTone={kpiTasks > 0 ? "neg" : "zero"}
          sub="en todos los eventos"
        />
        <Kpi
          label={isProvider ? "Facturas pendientes" : "Pagos pendientes"}
          value={isProvider ? kpiPaymentsAmt : fmtEur(kpiPaymentsAmt, cur)}
          delta={kpiPaymentsAmt > 0 ? "por cobrar" : "al día"}
          deltaTone={kpiPaymentsAmt > 0 ? "neg" : "zero"}
          sub="en facturas abiertas"
        />
        <Kpi
          label={isProvider ? "Ingresos totales" : "Leads activos"}
          value={isProvider ? fmtEur(kpiLeadsOrRev, cur) : kpiLeadsOrRev}
          animateValue={!isProvider && !loading ? kpiLeadsOrRev : undefined}
          delta={kpiLeadsOrRev > 0 ? "en pipeline" : "sin movimiento"}
          deltaTone={kpiLeadsOrRev > 0 ? "pos" : "zero"}
          sub={isProvider ? "facturas cobradas" : "oportunidades abiertas"}
        />
      </div>

      {/* Grid 3 columnas */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* COL 1 — Balance + Acciones */}
        <div className="flex flex-col gap-3.5">
          <DashCard>
            <div className="text-[13px] text-[var(--ink-3)] font-medium mb-1">
              {isProvider ? "Cobrado este año" : "Balance total"}
            </div>
            <div className="flex items-baseline gap-2.5">
              <span
                className="text-[26px] font-semibold text-[var(--ink-1)]"
                style={{ letterSpacing: "-0.02em" }}
              >
                {loading ? "—" : <AnimNum value={balanceTotal} decimals={2} prefix="€" />}
              </span>
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "var(--success-bg)", color: "var(--success-ink)" }}
              >
                +5%
              </span>
            </div>
            <Sparkline />
            <div className="flex justify-between mt-1.5 text-[11px] text-[var(--ink-4)]">
              <span>0</span><span>2K</span><span>3K</span><span>5K</span><span>100</span>
            </div>
          </DashCard>

          {isProvider ? (
            <>
              <ActionRow icon={IcoTasks} title="Mis tareas"
                sub={`${kpiTasks} pendiente${kpiTasks !== 1 ? "s" : ""}`}
                onClick={() => router.push("/dashboard/tasks")} />
              <ActionRow icon={IcoWallet} title="Mis facturas"
                sub={`${kpiPaymentsAmt} factura${kpiPaymentsAmt !== 1 ? "s" : ""} abierta${kpiPaymentsAmt !== 1 ? "s" : ""}`}
                onClick={() => router.push("/dashboard/finance/invoices")} />
              <ActionRow icon={IcoEvents} title="Mis eventos"
                sub={`${kpiEvents} con participación`}
                onClick={() => router.push("/dashboard/events")} />
            </>
          ) : (
            <>
              <ActionRow icon={IcoEvents} title="Nuevo evento" sub="Crear evento rápido"
                onClick={() => router.push("/dashboard/events?new=true")} />
              <ActionRow icon={IcoUser} title="Agregar Lead" sub="CRM rápido"
                onClick={() => router.push("/dashboard/crm?new=true")} />
              <ActionRow icon={IcoTasks} title="Nueva tarea" sub="Agregar tarea"
                onClick={() => router.push("/dashboard/tasks?new=true")} />
              <ActionRow icon={IcoMoney} title="Registrar pago" sub="Agregar pago rápido"
                onClick={() => router.push("/dashboard/payments?new=true")} />
            </>
          )}
        </div>

        {/* COL 2 — Próximo evento + Próximas tareas */}
        <div className="flex flex-col gap-3.5">
          <DashCard
            title="Próximo evento"
            icon={IcoEvents}
            action="Ver evento"
            onAction={() => {
              if (nextEvent) router.push(`/dashboard/events/${nextEvent.id}`);
              else router.push("/dashboard/events");
            }}
          >
            {loading ? (
              <div className="text-[13px] text-[var(--ink-3)] py-4">Cargando…</div>
            ) : nextEvent ? (
              <>
                <div className="text-[12.5px] text-[var(--ink-3)] mb-1 mt-1">Nombre del evento</div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-[17px] font-semibold text-[var(--ink-1)]"
                    style={{ letterSpacing: "-0.01em" }}
                  >
                    {nextEvent.name}
                  </span>
                  {(() => {
                    const meta = eventTypeMeta(nextEvent.type);
                    const pill = TYPE_PILL[meta.color];
                    return (
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: pill.bg, color: pill.ink }}
                      >
                        {meta.label}
                      </span>
                    );
                  })()}
                </div>

                {/* Progreso */}
                <div className="mb-3.5">
                  <div className="text-[11.5px] text-[var(--ink-3)] mb-1.5">Progreso</div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-[900ms] ease-out"
                      style={{ width: `${eventProgress * 100}%`, background: "var(--ink-1)" }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-5 gap-y-3.5 text-[13px]">
                  <div>
                    <div className="text-[11.5px] text-[var(--ink-3)] mb-1.5">Asignado A</div>
                    <div className="flex items-center gap-1.5">
                      <Avatar initials="L" size={22} />
                      <span className="text-[var(--ink-1)]">Laura P.</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11.5px] text-[var(--ink-3)] mb-1.5">Cliente</div>
                    <div className="flex items-center gap-1.5">
                      <Avatar initials="A" size={22} />
                      <span className="text-[var(--ink-1)]">Arthur G.</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11.5px] text-[var(--ink-3)] mb-1.5">Fecha del evento</div>
                    <div className="text-[var(--ink-1)]">
                      {nextEvent.date ? format(new Date(nextEvent.date), "d 'de' MMMM, yyyy", { locale: es }) : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11.5px] text-[var(--ink-3)] mb-1.5">Invitados</div>
                    <div className="flex items-center gap-1.5 text-[var(--ink-1)]">
                      <IcoGuests className="h-3.5 w-3.5" />
                      <span>{nextEvent.guestCount ?? "—"}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-9 text-center">
                <IcoCalendar className="h-7 w-7 mx-auto text-[var(--ink-3)]" />
                <div className="text-[14px] font-semibold text-[var(--ink-2)] mt-2.5">Sin eventos</div>
                <button
                  onClick={() => router.push("/dashboard/events?new=true")}
                  className="text-[13px] text-[var(--color-primary)] hover:underline mt-1.5 cursor-pointer bg-transparent border-none"
                >
                  Crear tu primer evento
                </button>
              </div>
            )}
          </DashCard>

          <DashCard
            title="Próximas tareas"
            icon={IcoTasks}
            action={
              <span className="inline-flex items-center gap-1">
                <IcoPlus className="h-3 w-3" /> Agregar
              </span>
            }
            onAction={() => router.push("/dashboard/tasks?new=true")}
          >
            {loading ? (
              <div className="text-[13px] text-[var(--ink-3)] py-2">Cargando…</div>
            ) : dash?.pendingTasksList && dash.pendingTasksList.length > 0 ? (
              <div className="flex flex-col">
                {dash.pendingTasksList.slice(0, 3).map((t) => (
                  <div key={t.id} className="flex items-start gap-2.5 py-2.5 border-t border-[var(--line-2)] first:border-t-0 first:pt-0">
                    <button
                      className="h-[18px] w-[18px] rounded-full border-[1.5px] flex-shrink-0 mt-0.5 cursor-pointer p-0"
                      style={{ borderColor: "var(--line-strong)", background: "#FFFFFF" }}
                      aria-label="Marcar como completada"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-medium text-[var(--ink-1)]">{t.title}</div>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {t.dueDate && (
                          <span
                            className="text-[11.5px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: "var(--danger-bg)", color: "var(--danger-ink)" }}
                          >
                            {format(new Date(t.dueDate), "d MMM", { locale: es })}
                          </span>
                        )}
                        <span
                          className="inline-flex items-center gap-1 text-[11.5px] text-[var(--ink-2)]"
                        >
                          <span className="opacity-60">◯</span> 0/2
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--ink-2)]">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--tag-stage-ink)" }} />
                          {t.priority}
                        </span>
                      </div>
                    </div>
                    <Avatar initials="L" size={22} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[13px] text-[var(--ink-3)] py-3">Sin tareas pendientes</div>
            )}
          </DashCard>
        </div>

        {/* COL 3 — Cronograma */}
        <DashCard
          title="Cronograma"
          icon={IcoCalendar}
          action="Ver todo"
          onAction={() => router.push("/dashboard/calendar")}
        >
          <CalendarStrip />

          <div
            className="flex items-center gap-2 mb-3 rounded-[8px]"
            style={{ background: "#FFFFFF", border: "1px solid var(--line-1)", padding: "8px 12px" }}
          >
            <IcoSearch className="h-3.5 w-3.5 text-[var(--ink-3)]" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-[13px] text-[var(--ink-1)] placeholder:text-[var(--ink-3)]"
            />
          </div>

          <div
            className="flex gap-1 mb-2 rounded-[8px]"
            style={{ background: "var(--bg-subtle)", padding: "3px" }}
          >
            {(["Eventos", "Pagos", "Tareas"] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-[6px] text-[13px] font-medium cursor-pointer border-none transition-colors"
                style={{
                  background: tab === t ? "#FFFFFF" : "transparent",
                  color: tab === t ? "var(--ink-1)" : "var(--ink-3)",
                  fontWeight: tab === t ? 600 : 500,
                  boxShadow: tab === t ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  padding: "7px 12px",
                }}
              >
                {t === "Eventos" && <IcoEvents className="h-[13px] w-[13px]" />}
                {t === "Pagos" && <IcoMoney className="h-[13px] w-[13px]" />}
                {t === "Tareas" && <IcoTasks className="h-[13px] w-[13px]" />}
                {t}
              </button>
            ))}
          </div>

          {/* Lista con altura estable: 3 tarjetas visibles, resto via "Ver N más".
              Cuando expandido, scroll vertical en su lugar para no romper el layout. */}
          {(() => {
            type AnyItem =
              | { kind: "event"; item: NonNullable<typeof dash>["recentEvents"][number] }
              | { kind: "task"; item: NonNullable<typeof dash>["pendingTasksList"][number] }
              | { kind: "payment"; item: (typeof MOCK_PAYMENTS)[number] };

            let all: AnyItem[] = [];
            let emptyMsg = "";

            if (tab === "Eventos") {
              all = (dash?.recentEvents || [])
                .filter((e) => !search || e.name.toLowerCase().includes(search.toLowerCase()))
                .map((e) => ({ kind: "event" as const, item: e }));
              emptyMsg = "Sin eventos";
            } else if (tab === "Tareas") {
              all = (dash?.pendingTasksList || [])
                .filter((t) => !search || t.title.toLowerCase().includes(search.toLowerCase()))
                .map((t) => ({ kind: "task" as const, item: t }));
              emptyMsg = "Sin tareas";
            } else {
              all = MOCK_PAYMENTS.filter(
                (p) =>
                  !search ||
                  p.concept.toLowerCase().includes(search.toLowerCase()) ||
                  p.client.toLowerCase().includes(search.toLowerCase()),
              ).map((p) => ({ kind: "payment" as const, item: p }));
              emptyMsg = "Sin pagos";
            }

            const visibleCount = expanded ? all.length : Math.min(3, all.length);
            const visible = all.slice(0, visibleCount);
            const hiddenCount = all.length - visibleCount;

            const renderItem = (entry: AnyItem) => {
              if (entry.kind === "event") {
                const e = entry.item;
                const meta = eventTypeMeta(e.type);
                return (
                  <EventMini
                    key={`ev-${e.id}`}
                    name={e.name}
                    type={meta.label}
                    typeColor={meta.color}
                    date={e.date}
                    location={e.location}
                    budget={e.budget}
                    guests={e.guestCount}
                    onClick={() => router.push(`/dashboard/events/${e.id}`)}
                  />
                );
              }
              if (entry.kind === "task") {
                const t = entry.item;
                return (
                  <TaskMini
                    key={`tk-${t.id}`}
                    title={t.title}
                    dueDate={t.dueDate}
                    stage={t.priority}
                    done={false}
                    assigneeInitial="L"
                  />
                );
              }
              const p = entry.item;
              return (
                <PaymentMini
                  key={`pm-${p.id}`}
                  concept={p.concept}
                  date={p.date}
                  client={p.client}
                  amount={p.amount}
                  status={p.status}
                />
              );
            };

            return (
              <div className="rounded-[8px]" style={{ border: "1px solid var(--line-1)" }}>
                <div
                  className="overflow-y-auto rounded-t-[8px]"
                  style={{
                    minHeight: "270px", // ~3 mini cards
                    maxHeight: expanded ? "420px" : "270px",
                  }}
                >
                  {all.length === 0 ? (
                    <div className="text-[13px] text-[var(--ink-3)] p-4 text-center">
                      {emptyMsg}
                    </div>
                  ) : (
                    visible.map(renderItem)
                  )}
                </div>
                {all.length > 3 && (
                  <button
                    onClick={() => setExpanded((e) => !e)}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-[12.5px] font-medium cursor-pointer transition-colors border-x-0 border-b-0"
                    style={{
                      background: "var(--bg-subtle)",
                      color: "var(--ink-2)",
                      borderTop: "1px solid var(--line-1)",
                    }}
                  >
                    {expanded ? "Ver menos" : `Ver ${hiddenCount} más`}
                    <span
                      className="inline-flex transition-transform"
                      style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
                    >
                      <IcoChevDown className="h-3 w-3" />
                    </span>
                  </button>
                )}
              </div>
            );
          })()}
        </DashCard>
      </div>
    </div>
  );
}
