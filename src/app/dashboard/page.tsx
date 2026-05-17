"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, addDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useUserSession } from "@/hooks/use-user-session";
import { fmtEur, fmtEurDecimals } from "@/lib/format";
import { avColor } from "@/lib/ui-utils";
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
  CheckmarkCircle02Icon,
  Cancel01Icon,
  Edit01Icon,
  RocketIcon,
  UserEdit01Icon,
  Image01Icon,
  Invoice01Icon,
  Briefcase01Icon,
  UserAdd01Icon,
  Store01Icon,
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
const IcoCheckCircle = hgIcon(CheckmarkCircle02Icon);
const IcoClose = hgIcon(Cancel01Icon);
const IcoEdit = hgIcon(Edit01Icon);
const IcoRocket = hgIcon(RocketIcon);
const IcoUserEdit = hgIcon(UserEdit01Icon);
const IcoImage = hgIcon(Image01Icon);
const IcoInvoice = hgIcon(Invoice01Icon);
const IcoBriefcase = hgIcon(Briefcase01Icon);
const IcoUserAdd = hgIcon(UserAdd01Icon);
const IcoStore = hgIcon(Store01Icon);

interface PlannerStats {
  type: "planner";
  totalEvents: number;
  pendingTasks: number;
  pendingPayments: number;
  activeLeads: number;
  onboarding?: { eventCount: number; contactCount: number; quoteCount: number };
  revenue?: {
    balanceYtd: number;
    thisMonth: number;
    prevMonth: number;
    deltaPct: number | null;
    series: Array<{ month: string; total: number }>;
    currency: string;
  };
  recentEvents: Array<{
    id: number;
    name: string;
    date: string | null;
    status: string;
    guestCount: number | null;
    location: string | null;
    budget: number | null;
    type: string | null;
    clientName: string | null;
    assignedTo: string | null;
    taskProgress: number | null;
  }>;
  pendingTasksList: Array<{
    id: number;
    title: string;
    priority: string;
    dueDate: string | null;
  }>;
  recentInvoices?: Array<{
    id: number;
    concept: string;
    date: string;
    client: string;
    amount: number;
    status: "Pagada" | "Pendiente" | "Vencida" | "Parcial" | "Borrador";
  }>;
}

interface ProviderStats {
  type: "provider";
  organization: {
    name: string;
    verificationStatus: string | null;
    instagramHandle: string | null;
    providerCategory: string | null;
    profileCompleteness: number;
    reviewCount: number;
    portfolioCount: number;
    invoiceCount: number;
    hasFiscalData: boolean;
  };
  stats: {
    activeEvents: number;
    pendingTasks: number;
    totalRevenue: number;
    pendingInvoices: number;
    currency: string;
  };
  recentEvents?: PlannerStats["recentEvents"];
  pendingTasksList?: PlannerStats["pendingTasksList"];
  recentInvoices?: PlannerStats["recentInvoices"];
  revenue?: PlannerStats["revenue"];
}

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
  const display = v.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
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
      <div className="flex items-baseline gap-2.5 flex-wrap">
        <span
          className="text-[26px] font-semibold text-[var(--ink-1)]"
          style={{ letterSpacing: "-0.02em" }}
        >
          {animateValue !== undefined ? <AnimNum value={animateValue} /> : value}
        </span>
        {delta && <span style={{ color: deltaColor }} className="text-[12px] font-medium">{delta}</span>}
        {sub && <span className="text-[12px] text-[var(--ink-3)]">{sub}</span>}
      </div>
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
      style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)" }}
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
// OnboardingCard — primeros pasos con gamificación
// ============================================================
const ONBOARDING_KEY = "hubents:onboarding-v1-dismissed";

const XP_PER_STEP = 25;

const LEVELS = [
  { min: 0,   label: "Recién llegado", emoji: "👋", color: "#6B7280" },
  { min: 25,  label: "Empezando",      emoji: "🌱", color: "#3B82F6" },
  { min: 50,  label: "En camino",      emoji: "⚡", color: "#F59E0B" },
  { min: 75,  label: "Casi listo",     emoji: "🔥", color: "#EF4444" },
  { min: 100, label: "¡Nivel máximo!", emoji: "🏆", color: "#10B981" },
];

function getLevel(pct: number) {
  return [...LEVELS].reverse().find((l) => pct >= l.min) ?? LEVELS[0];
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const lvl = getLevel(pct);
  return (
    <div className="relative flex-shrink-0" style={{ width: 56, height: 56 }}>
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--line-2)" strokeWidth="4" />
        <circle
          cx="28" cy="28" r={r} fill="none"
          stroke={lvl.color} strokeWidth="4"
          strokeDasharray={circ}
          strokeDashoffset={circ - dash}
          strokeLinecap="round"
          transform="rotate(-90 28 28)"
          style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[11.5px] font-bold"
        style={{ color: "var(--ink-1)" }}
      >
        {pct}%
      </span>
    </div>
  );
}

function OnboardingCard({ isProvider, profileCompleteness, instagramHandle, verificationStatus, portfolioCount, invoiceCount, hasFiscalData, plannerOnboarding, router }: {
  isProvider: boolean;
  profileCompleteness: number;
  instagramHandle: string | null | undefined;
  verificationStatus?: string | null;
  portfolioCount?: number;
  invoiceCount?: number;
  hasFiscalData?: boolean;
  plannerOnboarding?: { eventCount: number; contactCount: number; quoteCount: number };
  router: ReturnType<typeof import("next/navigation").useRouter>;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  // Instagram inline action
  const [igInput, setIgInput] = useState("");
  const [igSaving, setIgSaving] = useState(false);
  const [igSaved, setIgSaved] = useState(false);
  // Verification inline action
  const [verifSaving, setVerifSaving] = useState(false);
  const [verifDone, setVerifDone] = useState(
    verificationStatus === "pending" || verificationStatus === "verified"
  );

  type OnboardingStep = {
    icon: ReturnType<typeof hgIcon>;
    label: string; sub: string; time: string; reward: string; done: boolean; href: string;
    inlineAction?: "instagram" | "request-verification";
  };

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(ONBOARDING_KEY)) {
      setDismissed(true);
    }
  }, []);

  const providerSteps: OnboardingStep[] = [
    {
      icon: IcoUserEdit,
      label: "Completar perfil público",
      sub: "Descripción, categoría y datos de contacto",
      time: "~5 min",
      reward: "Apareces en búsquedas de planificadores",
      done: profileCompleteness >= 60,
      href: "/dashboard/public-profile",
    },
    {
      icon: IcoImage,
      label: "Subir fotos de portfolio",
      sub: "Muestra tus trabajos para atraer clientes",
      time: "~10 min",
      reward: "Hasta 3× más solicitudes de contacto",
      done: (portfolioCount ?? 0) > 0,
      href: "/dashboard/public-profile",
    },
    {
      icon: IcoStore,
      label: "Agregar tu Instagram",
      sub: "Usuario y posts visibles en tu perfil",
      time: "~1 min",
      reward: "Muestra tu estilo y trabajo reciente",
      done: !!instagramHandle,
      href: "/dashboard/public-profile",
      inlineAction: "instagram",
    },
    {
      icon: IcoInvoice,
      label: "Configurar datos fiscales",
      sub: "Nombre fiscal, NIF/CIF y dirección",
      time: "~3 min",
      reward: "Tus facturas tendrán validez legal",
      done: hasFiscalData ?? false,
      href: "/dashboard/settings?section=fiscal",
    },
    {
      icon: IcoInvoice,
      label: "Emitir tu primera factura",
      sub: "Registra un servicio y envíalo al cliente",
      time: "~3 min",
      reward: "Gestión financiera desde el primer día",
      done: (invoiceCount ?? 0) > 0,
      href: "/dashboard/finance/invoices",
    },
    {
      icon: IcoBriefcase,
      label: "Solicitar verificación",
      sub: "Aparece con el badge verificado en el directorio",
      time: "~1 min",
      reward: "Los planners priorizan proveedores verificados",
      done: verificationStatus === "verified" || verificationStatus === "pending",
      href: "/dashboard/public-profile",
      inlineAction: "request-verification",
    },
  ];

  const plannerSteps: OnboardingStep[] = [
    {
      icon: IcoEvents,
      label: "Crear tu primer evento",
      sub: "Plantillas listas para bodas y corporativos",
      time: "~3 min",
      reward: "Centraliza toda la organización en un lugar",
      done: (plannerOnboarding?.eventCount ?? 0) > 0,
      href: "/dashboard/events?new=true",
    },
    {
      icon: IcoUserAdd,
      label: "Agregar contactos o leads",
      sub: "Clientes y prospectos desde el CRM",
      time: "~2 min",
      reward: "Nunca pierdas una oportunidad de venta",
      done: (plannerOnboarding?.contactCount ?? 0) > 0,
      href: "/dashboard/contacts",
    },
    {
      icon: IcoInvoice,
      label: "Emitir un presupuesto",
      sub: "Presupuestos y facturas profesionales",
      time: "~5 min",
      reward: "Cobra y gestiona pagos sin salir del app",
      done: (plannerOnboarding?.quoteCount ?? 0) > 0,
      href: "/dashboard/finance/quotes",
    },
    {
      icon: IcoBriefcase,
      label: "Explorar proveedores",
      sub: "Vincula proveedores verificados a tus eventos",
      time: "~5 min",
      reward: "Red de proveedores disponible de inmediato",
      done: false,
      href: "/dashboard/partners",
    },
  ];

  const steps = isProvider ? providerSteps : plannerSteps;
  const completedCount = steps.filter((s) => s.done).length;
  const pct = Math.round((completedCount / steps.length) * 100);
  const xp = completedCount * XP_PER_STEP;
  const lvl = getLevel(pct);
  const nextIdx = steps.findIndex((s) => !s.done);

  useEffect(() => {
    if (pct < 100 || celebrating) return;
    setCelebrating(true);
    const t = setTimeout(() => {
      localStorage.setItem(ONBOARDING_KEY, "1");
      setDismissed(true);
    }, 3500);
    return () => clearTimeout(t);
  }, [pct, celebrating]);

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setDismissed(true);
  };

  const FOOTER_MSG = [
    "Completa el primer paso para aparecer en búsquedas",
    "¡Buen comienzo! Sigue completando para desbloquear más visibilidad",
    "Ya vas por la mitad — el perfil completo genera más confianza",
    "¡Casi! Un paso más para el perfil al máximo",
    "🏆 ¡Perfil completo! Ahora apareces mejor posicionado",
  ];
  const footerIdx = Math.min(completedCount, FOOTER_MSG.length - 1);

  if (celebrating) {
    return (
      <div
        className="rounded-[14px] p-6 text-center"
        style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)" }}
      >
        <div className="text-[36px] mb-2">🎉</div>
        <div className="text-[16px] font-bold text-[var(--ink-1)]" style={{ letterSpacing: "-0.02em" }}>
          ¡Perfil al máximo nivel!
        </div>
        <div className="text-[13px] text-[var(--ink-3)] mt-1">
          Has ganado <strong>{steps.length * XP_PER_STEP} XP</strong>. Esta tarjeta se cerrará en unos segundos.
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-[14px] overflow-hidden"
      style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)" }}
    >
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3.5"
        style={{ borderBottom: "1px solid var(--line-1)", background: "var(--bg-subtle)" }}
      >
        <div className="flex items-center gap-3">
          <ProgressRing pct={pct} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[15px] font-bold text-[var(--ink-1)]" style={{ letterSpacing: "-0.02em" }}>
                Primeros pasos
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[13px]">{lvl.emoji}</span>
              <span className="text-[12.5px] font-semibold" style={{ color: lvl.color }}>
                {lvl.label}
              </span>
            </div>
            {/* XP bar */}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--line-2)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: lvl.color }}
                />
              </div>
              <span
                className="text-[10.5px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: lvl.color + "22", color: lvl.color }}
              >
                {xp} XP
              </span>
            </div>
          </div>

          <button
            onClick={dismiss}
            className="self-start p-1 rounded-full opacity-40 hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none flex-shrink-0"
            aria-label="Cerrar"
          >
            <IcoClose size={14} className="text-[var(--ink-3)]" />
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {steps.map((step, i) => {
          const isNext = i === nextIdx;
          const isPending = !step.done && !isNext;
          const showInline = isNext && !!step.inlineAction && !step.done;

          const cardStyle = {
            background: step.done ? "var(--success-bg)" : isNext ? "var(--bg-panel)" : "var(--bg-subtle)",
            borderColor: step.done ? "#10B98133" : isNext ? "var(--primary)" : "var(--line-1)",
            boxShadow: isNext ? "0 0 0 1px var(--primary)" : "none",
            opacity: isPending ? 0.6 : 1,
          };
          const cardClass = "flex items-start gap-3 rounded-[10px] p-3 text-left transition-all border";

          const innerContent = (
            <>
              {/* Step badge */}
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold mt-0.5"
                style={{
                  background: step.done ? "#10B981" : isNext ? "var(--primary)" : "var(--line-2)",
                  color: step.done || isNext ? "#fff" : "var(--ink-3)",
                }}
              >
                {step.done ? <IcoCheckCircle size={15} style={{ color: "#fff" }} /> : <span>{i + 1}</span>}
              </div>

              <div className="flex-1 min-w-0">
                <div
                  className="text-[12.5px] font-semibold leading-tight"
                  style={{ color: step.done ? "#10B981" : "var(--ink-1)", textDecoration: step.done ? "line-through" : "none" }}
                >
                  {step.label}
                </div>
                <div className="text-[11px] text-[var(--ink-3)] mt-0.5 leading-tight">{step.sub}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  {step.done ? (
                    <span className="text-[10.5px] font-semibold" style={{ color: "#10B981" }}>+{XP_PER_STEP} XP obtenidos ✓</span>
                  ) : isNext && !showInline ? (
                    <>
                      <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--primary)", color: "#fff" }}>
                        Siguiente →
                      </span>
                      <span className="text-[10.5px] text-[var(--ink-3)]">{step.time}</span>
                    </>
                  ) : isNext ? (
                    <span className="text-[10.5px] text-[var(--ink-3)]">{step.time}</span>
                  ) : (
                    <span className="text-[10.5px] text-[var(--ink-3)]">{step.time}</span>
                  )}
                </div>
                {isNext && !showInline && (
                  <div className="text-[10.5px] mt-1 font-medium" style={{ color: "var(--primary)" }}>
                    {step.reward}
                  </div>
                )}

                {/* Inline action: Instagram */}
                {showInline && step.inlineAction === "instagram" && (
                  <div className="mt-2.5 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1.5">
                      <div className="flex-1 flex items-center gap-1 rounded-[7px] px-2 py-1.5 text-[11.5px]" style={{ background: "var(--bg-subtle)", border: "1px solid var(--line-1)" }}>
                        <span className="text-[var(--ink-3)] font-medium select-none">@</span>
                        <input
                          value={igInput}
                          onChange={(e) => setIgInput(e.target.value.replace(/^@+/, ""))}
                          onKeyDown={(e) => e.key === "Enter" && !igSaving && igInput.trim() && (async () => {
                            setIgSaving(true);
                            await fetch("/api/organizations/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instagramHandle: igInput.trim() }) });
                            setIgSaving(false); setIgSaved(true); router.refresh();
                          })()}
                          placeholder="tu_usuario"
                          className="flex-1 bg-transparent outline-none text-[var(--ink-1)] placeholder:text-[var(--ink-3)]"
                          style={{ minWidth: 0, fontSize: "11.5px", color: "var(--ink-1)" }}
                          disabled={igSaving || igSaved}
                        />
                      </div>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!igInput.trim() || igSaving || igSaved) return;
                          setIgSaving(true);
                          await fetch("/api/organizations/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instagramHandle: igInput.trim() }) });
                          setIgSaving(false); setIgSaved(true); router.refresh();
                        }}
                        disabled={igSaving || igSaved || !igInput.trim()}
                        className="px-2.5 py-1.5 rounded-[7px] text-[11px] font-semibold flex-shrink-0 transition-opacity"
                        style={{ background: "var(--primary)", color: "#fff", opacity: (!igInput.trim() || igSaving || igSaved) ? 0.5 : 1, cursor: (!igInput.trim() || igSaving || igSaved) ? "not-allowed" : "pointer" }}
                      >
                        {igSaved ? "✓ Guardado" : igSaving ? "..." : "Guardar"}
                      </button>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(step.href); }}
                      className="text-[10.5px] text-[var(--ink-3)] hover:text-[var(--ink-1)] transition-colors bg-transparent border-none cursor-pointer p-0"
                    >
                      Ir al perfil completo →
                    </button>
                  </div>
                )}

                {/* Inline action: Solicitar verificación */}
                {showInline && step.inlineAction === "request-verification" && (
                  <div className="mt-2.5 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (verifSaving || verifDone) return;
                        setVerifSaving(true);
                        await fetch("/api/organizations/request-verification", { method: "POST" });
                        setVerifSaving(false); setVerifDone(true); router.refresh();
                      }}
                      disabled={verifSaving || verifDone}
                      className="w-full py-1.5 rounded-[7px] text-[11px] font-semibold transition-opacity text-center"
                      style={{ background: "var(--primary)", color: "#fff", opacity: (verifSaving || verifDone) ? 0.6 : 1, cursor: (verifSaving || verifDone) ? "not-allowed" : "pointer" }}
                    >
                      {verifDone ? "Solicitud enviada — te avisaremos por email ✓" : verifSaving ? "Enviando solicitud..." : "Solicitar verificación ahora"}
                    </button>
                    <div className="text-[10px] text-[var(--ink-3)] leading-tight">
                      {step.reward}
                    </div>
                  </div>
                )}
              </div>
            </>
          );

          if (showInline) {
            return (
              <div key={i} className={cardClass} style={cardStyle}>
                {innerContent}
              </div>
            );
          }

          return (
            <button
              key={i}
              onClick={() => !step.done && router.push(step.href)}
              disabled={step.done}
              className={cardClass + " cursor-pointer w-full"}
              style={cardStyle}
            >
              {innerContent}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2.5 text-center text-[11.5px] text-[var(--ink-3)]"
        style={{ borderTop: "1px solid var(--line-1)" }}
      >
        {FOOTER_MSG[footerIdx]}
      </div>
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
      style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)" }}
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
// Sparkline — smoothed area chart driven by real revenue series.
// `series` is the last 12 months of paid-invoice totals from the API.
// Returns null when there is no signal to plot (all-zero / empty),
// so we don't render a flat line that could be mistaken for data.
// ============================================================
function Sparkline({ series }: { series: { month: string; total: number }[] }) {
  const data = series.map((s, i) => ({ x: i, v: s.total }));
  const hasSignal = data.some((d) => d.v > 0);
  if (!hasSignal) {
    return (
      <div className="mt-2 h-[80px] w-full flex items-center justify-center text-[12px] text-[var(--ink-4)]">
        Aún no hay ingresos registrados
      </div>
    );
  }
  return (
    <div className="mt-2 h-[80px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
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


// ============================================================
// Avatar (lightweight, just for dashboard use)
// ============================================================
const Avatar = ({ initials, color, size = 24 }: { initials: string; color?: string; size?: number }) => (
  <div
    className="inline-flex items-center justify-center rounded-full text-white font-semibold flex-shrink-0"
    style={{
      width: size,
      height: size,
      background: color || avColor(initials),
      fontSize: Math.round(size * 0.45),
    }}
  >
    {initials}
  </div>
);

// ============================================================
// Client Dashboard (role === "client" — couple / client view)
// ============================================================
interface ClientDashData {
  event: {
    id: number;
    name: string;
    type: string | null;
    customType: string | null;
    date: string | null;
    location: string | null;
    coverImage: string | null;
  };
  daysLeft: number | null;
  progress: number;
  budget: { total: number | null; spent: number };
  rsvp: { total: number; confirmed: number; declined: number; pending: number };
  checklist: Array<{ id: number; title: string; status: string; dueDate: string | null; priority: string | null }>;
  meetings: Array<{ id: number; title: string; date: string; startTime: string | null; location: string | null }>;
  documents: Array<{ id: number; name: string; fileType: string | null; storageUrl: string | null; createdAt: string }>;
}

function ClientDashboard() {
  const [data, setData] = useState<ClientDashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client/dashboard")
      .then((r) => r.json())
      .then((d) => { if (d.data) setData(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-[var(--bg-subtle)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <IcoEvents className="h-10 w-10 text-[var(--ink-3)]" />
        <p className="text-[var(--ink-2)] text-sm">No tienes eventos asignados todavía.</p>
      </div>
    );
  }

  const { event, daysLeft, progress, budget, rsvp, checklist, meetings, documents } = data;
  const meta = eventTypeMeta(event.type);
  const EVENT_GRADIENT: Record<string, string> = {
    wedding: "linear-gradient(135deg,#FCE0DA 0%,#F9D4DC 60%,#F3EADB 100%)",
    birthday: "linear-gradient(135deg,#FFF4D6 0%,#FFE6A0 60%,#FFF0C8 100%)",
    corporate: "linear-gradient(135deg,#DDE8F8 0%,#B8D1F3 60%,#D8EBF8 100%)",
    social: "linear-gradient(135deg,#E0F0E8 0%,#C8E6D4 60%,#DCF0E8 100%)",
  };
  const heroGradient = EVENT_GRADIENT[event.type ?? ""] ?? EVENT_GRADIENT.corporate;
  const dateLabel = event.date
    ? format(new Date(event.date), "d 'de' MMMM, yyyy", { locale: es })
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Hero banner */}
      <div className="rounded-xl overflow-hidden" style={{ background: heroGradient }}>
        <div className="px-6 pt-6 pb-4">
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider mb-3 inline-block"
            style={{ background: "rgba(0,0,0,0.08)", color: "var(--ink-1)" }}
          >
            {meta.label}
          </span>
          <h1 className="text-[26px] font-semibold tracking-tight text-[var(--ink-1)] mt-1">{event.name}</h1>
          {(dateLabel || event.location) && (
            <p className="text-sm text-[var(--ink-2)] mt-0.5">
              {dateLabel}{event.location ? ` · ${event.location}` : ""}
            </p>
          )}
        </div>
        <div className="px-6 py-3 border-t border-black/5 flex items-center gap-6 flex-wrap">
          {daysLeft !== null && (
            <div>
              <div className="text-[10.5px] text-[var(--ink-3)] uppercase tracking-wider">Faltan</div>
              <div className="text-xl font-semibold text-[var(--ink-1)]">{daysLeft} días</div>
            </div>
          )}
          {daysLeft !== null && <div className="w-px self-stretch bg-black/10" />}
          <div className="flex-1 min-w-[140px]">
            <div className="text-[10.5px] text-[var(--ink-3)] uppercase tracking-wider mb-1.5">Progreso general</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-black/10 rounded-full overflow-hidden">
                <div className="h-full bg-[var(--ink-1)] rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-sm font-semibold text-[var(--ink-1)]">{progress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Budget */}
        <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--line-1)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <IcoWallet className="h-4 w-4 text-[var(--ink-3)]" />
            <span className="text-sm font-medium text-[var(--ink-2)]">Presupuesto</span>
          </div>
          <div className="text-[22px] font-semibold text-[var(--ink-1)] tracking-tight">
            {fmtEur(budget.spent)}{" "}
            {budget.total !== null && (
              <span className="text-sm text-[var(--ink-3)] font-normal">/ {fmtEur(budget.total)}</span>
            )}
          </div>
          {budget.total !== null && budget.total > 0 && (
            <div className="mt-3 h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--ink-accent,#5B8FE8)] rounded-full"
                style={{ width: `${Math.min(100, (budget.spent / budget.total) * 100)}%` }}
              />
            </div>
          )}
          <div className="mt-2 flex justify-between text-[11.5px] text-[var(--ink-3)]">
            <span>Pagado: {fmtEur(budget.spent)}</span>
            {budget.total !== null && <span>Restante: {fmtEur(Math.max(0, budget.total - budget.spent))}</span>}
          </div>
        </div>

        {/* RSVP */}
        <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--line-1)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <IcoGuests className="h-4 w-4 text-[var(--ink-3)]" />
            <span className="text-sm font-medium text-[var(--ink-2)]">Invitados (RSVP)</span>
          </div>
          <div className="flex gap-5">
            <div>
              <div className="text-[22px] font-semibold text-[var(--ink-1)]">{rsvp.confirmed}</div>
              <div className="text-[11.5px] text-[var(--ink-3)]">Confirmados</div>
            </div>
            <div>
              <div className="text-[22px] font-semibold text-[var(--ink-1)]">{rsvp.pending}</div>
              <div className="text-[11.5px] text-[var(--ink-3)]">Pendientes</div>
            </div>
            <div>
              <div className="text-[22px] font-semibold text-[var(--ink-1)]">{rsvp.declined}</div>
              <div className="text-[11.5px] text-[var(--ink-3)]">No asisten</div>
            </div>
          </div>
          {rsvp.total > 0 && (
            <div className="mt-3 h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00B66D] rounded-full"
                style={{ width: `${(rsvp.confirmed / rsvp.total) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Checklist summary */}
        <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--line-1)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <IcoTasks className="h-4 w-4 text-[var(--ink-3)]" />
            <span className="text-sm font-medium text-[var(--ink-2)]">Mi checklist</span>
          </div>
          {checklist.length === 0 ? (
            <p className="text-[13px] text-[var(--ink-3)]">Sin tareas asignadas</p>
          ) : (
            <div className="flex flex-col gap-2">
              {checklist.slice(0, 3).map((t) => {
                const done = t.status === "completed";
                return (
                  <div key={t.id} className="flex items-start gap-2.5">
                    <div
                      className="w-4 h-4 mt-0.5 rounded flex-shrink-0 flex items-center justify-center border"
                      style={{
                        background: done ? "#00B66D" : "transparent",
                        borderColor: done ? "#00B66D" : "var(--line-strong)",
                      }}
                    >
                      {done && <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 5l2.5 2.5L8 3"/></svg>}
                    </div>
                    <span className={`text-[13px] ${done ? "line-through text-[var(--ink-3)]" : "text-[var(--ink-1)]"}`}>
                      {t.title}
                    </span>
                  </div>
                );
              })}
              {checklist.length > 3 && (
                <p className="text-[11.5px] text-[var(--ink-3)] mt-1">+{checklist.length - 3} más</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Meetings + Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upcoming meetings */}
        <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--line-1)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <IcoCalendar className="h-4 w-4 text-[var(--ink-3)]" />
            <span className="text-sm font-medium text-[var(--ink-2)]">Próximas reuniones</span>
          </div>
          {meetings.length === 0 ? (
            <p className="text-[13px] text-[var(--ink-3)]">Sin reuniones programadas</p>
          ) : (
            <div className="flex flex-col divide-y divide-[var(--line-2)]">
              {meetings.map((m) => {
                const d = new Date(m.date);
                const dayStr = format(d, "d MMM", { locale: es }).toUpperCase();
                return (
                  <div key={m.id} className="flex gap-3 py-2.5 first:pt-0">
                    <div className="w-10 text-center flex-shrink-0">
                      <div className="text-[10px] text-[var(--ink-3)] uppercase">{dayStr.split(" ")[1]}</div>
                      <div className="text-[16px] font-semibold text-[var(--ink-1)]">{dayStr.split(" ")[0]}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-medium text-[var(--ink-1)] truncate">{m.title}</div>
                      {m.location && (
                        <div className="text-[11.5px] text-[var(--ink-3)] truncate">{m.location}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Shared documents */}
        <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--line-1)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <IcoMoney className="h-4 w-4 text-[var(--ink-3)]" />
            <span className="text-sm font-medium text-[var(--ink-2)]">Documentos compartidos</span>
          </div>
          {documents.length === 0 ? (
            <p className="text-[13px] text-[var(--ink-3)]">Sin documentos compartidos todavía</p>
          ) : (
            <div className="flex flex-col divide-y divide-[var(--line-2)]">
              {documents.map((doc) => {
                const ext = doc.fileType?.split("/").pop()?.toUpperCase() ?? "DOC";
                return (
                  <div key={doc.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                    <div
                      className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: "#5B8FE8" }}
                    >
                      {ext.slice(0, 3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[var(--ink-1)] truncate">{doc.name}</div>
                      <div className="text-[11px] text-[var(--ink-3)]">
                        {format(new Date(doc.createdAt), "d MMM yyyy", { locale: es })}
                      </div>
                    </div>
                    {doc.storageUrl && (
                      <a href={doc.storageUrl} target="_blank" rel="noreferrer"
                        className="text-[11.5px] text-[var(--ink-accent,#5B8FE8)] hover:underline flex-shrink-0"
                      >
                        Ver
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main Dashboard
// ============================================================
export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { eventScoped, loading: sessionLoading, orgType, role } = useUserSession();
  const [data, setData] = useState<PlannerStats | ProviderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"Eventos" | "Pagos" | "Tareas">("Eventos");
  const [search, setSearch] = useState("");

  const isProvider = orgType === "provider";
  const isClient = role === "client";
  const [expanded, setExpanded] = useState(false);

  // Claimed banner: show once when arriving with ?claimed=1
  const isClaimed = searchParams.get("claimed") === "1";
  const [showClaimedBanner, setShowClaimedBanner] = useState(false);

  useEffect(() => {
    if (!isClaimed || !isProvider) return;
    const key = "hubents-claimed-banner-dismissed";
    if (!sessionStorage.getItem(key)) {
      setShowClaimedBanner(true);
    }
  }, [isClaimed, isProvider]);

  const dismissClaimedBanner = useCallback(() => {
    sessionStorage.setItem("hubents-claimed-banner-dismissed", "1");
    setShowClaimedBanner(false);
    // Remove the ?claimed=1 param from URL so F5 doesn't re-trigger
    router.replace("/dashboard");
  }, [router]);

  // Reset expanded state when switching tabs so each tab starts collapsed.
  const handleTabChange = (t: typeof tab) => {
    setTab(t);
    setExpanded(false);
  };

  useEffect(() => {
    if (!sessionLoading && eventScoped && !isClient) router.replace("/dashboard/events");
  }, [eventScoped, sessionLoading, router, isClient]);

  useEffect(() => {
    if (isClient || eventScoped || sessionLoading) return;
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => setData(d.success ? d.data : null))
      .catch((e) => console.error("dashboard stats:", e))
      .finally(() => setLoading(false));
  }, [isClient, eventScoped, sessionLoading]);

  // Client users see their own event dashboard
  if (!sessionLoading && isClient) return <ClientDashboard />;

  const dash = !isProvider && data?.type === "planner" ? data : null;
  const prov = isProvider && data?.type === "provider" ? data : null;
  const cur = isProvider ? prov?.stats.currency || "EUR" : dash?.revenue?.currency || "EUR";

  // ── Unified accessors (work for both planner and provider) ───
  const unifiedRevenue = isProvider ? prov?.revenue : dash?.revenue;
  const unifiedRecentEvents = isProvider ? prov?.recentEvents : dash?.recentEvents;
  const unifiedPendingTasks = isProvider ? prov?.pendingTasksList : dash?.pendingTasksList;
  const unifiedInvoices = isProvider ? prov?.recentInvoices : dash?.recentInvoices;

  // ── KPIs ─────────────────────────────────────────────────────
  const kpiEvents = isProvider ? prov?.stats.activeEvents ?? 0 : dash?.totalEvents ?? 0;
  const kpiTasks = isProvider ? prov?.stats.pendingTasks ?? 0 : dash?.pendingTasks ?? 0;
  const kpiPaymentsAmt = isProvider ? prov?.stats.pendingInvoices ?? 0 : dash?.pendingPayments ?? 0;
  const kpiLeadsOrRev = isProvider ? prov?.stats.totalRevenue ?? 0 : dash?.activeLeads ?? 0;
  const balanceTotal = isProvider
    ? prov?.stats.totalRevenue ?? 0
    : unifiedRevenue?.balanceYtd ?? 0;
  const sparkSeries: { month: string; total: number }[] = unifiedRevenue?.series ?? [];
  const deltaPct: number | null = unifiedRevenue?.deltaPct ?? null;

  const nextEvent = unifiedRecentEvents?.[0];
  const eventProgress = nextEvent?.taskProgress ?? 0;

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Claimed welcome banner */}
      {showClaimedBanner && (
        <div
          className="relative rounded-[12px] p-4 flex gap-3 items-start"
          style={{ background: "var(--success-bg)", border: "1px solid var(--success-ink)" }}
        >
          <IcoCheckCircle size={20} style={{ color: "var(--success-ink)", flexShrink: 0, marginTop: 1 }} />
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-semibold" style={{ color: "var(--success-ink)" }}>
              ¡Perfil reclamado y verificado!
            </p>
            <p className="text-[12.5px] mt-0.5" style={{ color: "var(--success-ink)", opacity: 0.85 }}>
              Ya eres parte de Hubents como proveedor verificado. Completa tu perfil público para que los organizadores te encuentren más fácilmente.
            </p>
            <button
              onClick={() => { dismissClaimedBanner(); router.push("/dashboard/public-profile"); }}
              className="mt-2 text-[12px] font-semibold underline underline-offset-2"
              style={{ color: "var(--success-ink)" }}
            >
              Completar perfil ahora →
            </button>
          </div>
          <button
            onClick={dismissClaimedBanner}
            className="p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: "var(--success-ink)" }}
            aria-label="Cerrar"
          >
            <IcoClose size={16} />
          </button>
        </div>
      )}

      {/* Onboarding card — all account types, dismissable */}
      {!loading && data && (
        <OnboardingCard
          isProvider={isProvider}
          profileCompleteness={prov?.organization.profileCompleteness ?? 0}
          instagramHandle={prov?.organization.instagramHandle}
          verificationStatus={prov?.organization.verificationStatus}
          portfolioCount={prov?.organization.portfolioCount}
          invoiceCount={prov?.organization.invoiceCount}
          hasFiscalData={prov?.organization.hasFiscalData}
          plannerOnboarding={dash?.onboarding}
          router={router}
        />
      )}

      {/* KPI row */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 rounded-[12px] overflow-hidden"
        style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)" }}
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
              {!loading && deltaPct !== null && (
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: deltaPct >= 0 ? "var(--success-bg)" : "var(--danger-bg)",
                    color: deltaPct >= 0 ? "var(--success-ink)" : "var(--danger-ink)",
                  }}
                >
                  {deltaPct >= 0 ? "+" : ""}
                  {deltaPct.toFixed(1)}%
                </span>
              )}
            </div>
            <Sparkline series={sparkSeries} />
            {sparkSeries.length > 0 && sparkSeries.some((s) => s.total > 0) && (
              <div className="flex justify-between mt-1.5 text-[11px] text-[var(--ink-4)]">
                {(() => {
                  const months = sparkSeries.map((s) => {
                    const [, m] = s.month.split("-");
                    return ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][Number(m)] || "";
                  });
                  // Show 5 evenly spaced labels (first, q1, mid, q3, last) so it
                  // mirrors the prototype's 5-tick scale without overcrowding.
                  const idxs = [0, 3, 6, 9, 11];
                  return idxs.map((i) => <span key={i}>{months[i] ?? ""}</span>);
                })()}
              </div>
            )}
          </DashCard>

          {isProvider && prov && (
            <div
              className="rounded-[12px] p-[18px]"
              style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-semibold text-[var(--ink-1)]">Perfil público</span>
                {prov.organization.verificationStatus === "verified" ? (
                  <span
                    className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "var(--success-bg)", color: "var(--success-ink)" }}
                  >
                    Verificado ✓
                  </span>
                ) : prov.organization.verificationStatus === "pending" ? (
                  <span
                    className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "var(--warn-bg)", color: "var(--warn-ink)" }}
                  >
                    En revisión
                  </span>
                ) : (
                  <span
                    className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "var(--bg-subtle)", color: "var(--ink-3)" }}
                  >
                    Sin verificar
                  </span>
                )}
              </div>

              {prov.organization.providerCategory && (
                <div className="text-[12px] text-[var(--ink-3)] mb-3">{prov.organization.providerCategory}</div>
              )}

              {/* Completeness bar */}
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11.5px] text-[var(--ink-3)]">Completitud del perfil</span>
                <span className="text-[11.5px] font-semibold text-[var(--ink-1)]">
                  {prov.organization.profileCompleteness ?? 0}%
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "var(--bg-subtle)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${prov.organization.profileCompleteness ?? 0}%`,
                    background: (prov.organization.profileCompleteness ?? 0) >= 70
                      ? "var(--success-ink)"
                      : (prov.organization.profileCompleteness ?? 0) >= 40
                      ? "#F59E0B"
                      : "var(--danger-ink)",
                  }}
                />
              </div>

              {/* Stats row */}
              <div className="flex gap-4">
                <div>
                  <div className="text-[18px] font-semibold text-[var(--ink-1)]">{prov.organization.reviewCount}</div>
                  <div className="text-[11px] text-[var(--ink-3)]">Reseñas</div>
                </div>
                <div className="w-px self-stretch bg-[var(--line-1)]" />
                <div>
                  <div className="text-[18px] font-semibold text-[var(--ink-1)]">{prov.stats.activeEvents}</div>
                  <div className="text-[11px] text-[var(--ink-3)]">Eventos</div>
                </div>
                <div className="w-px self-stretch bg-[var(--line-1)]" />
                <div>
                  <div className="text-[18px] font-semibold text-[var(--ink-1)]">{fmtEur(prov.stats.totalRevenue, prov.stats.currency)}</div>
                  <div className="text-[11px] text-[var(--ink-3)]">Cobrado</div>
                </div>
              </div>
            </div>
          )}

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
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[11.5px] text-[var(--ink-3)]">Progreso de tareas</div>
                    <div className="text-[11.5px] font-medium text-[var(--ink-2)]">
                      {nextEvent.taskProgress !== null
                        ? `${Math.round(nextEvent.taskProgress * 100)}%`
                        : "Sin tareas"}
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-[900ms] ease-out"
                      style={{ width: `${eventProgress * 100}%`, background: "var(--ink-1)" }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-5 gap-y-3.5 text-[13px]">
                  <div>
                    <div className="text-[11.5px] text-[var(--ink-3)] mb-1.5">Creado por</div>
                    <div className="flex items-center gap-1.5">
                      {nextEvent.assignedTo ? (
                        <>
                          <Avatar initials={nextEvent.assignedTo.charAt(0).toUpperCase()} size={22} />
                          <span className="text-[var(--ink-1)]">{nextEvent.assignedTo.split(" ").slice(0, 2).join(" ")}</span>
                        </>
                      ) : <span className="text-[var(--ink-3)]">—</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11.5px] text-[var(--ink-3)] mb-1.5">Cliente</div>
                    <div className="flex items-center gap-1.5">
                      {nextEvent.clientName ? (
                        <>
                          <Avatar initials={nextEvent.clientName.charAt(0).toUpperCase()} size={22} />
                          <span className="text-[var(--ink-1)]">{nextEvent.clientName.split(" ").slice(0, 2).join(" ")}</span>
                        </>
                      ) : <span className="text-[var(--ink-3)]">—</span>}
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
            ) : unifiedPendingTasks && unifiedPendingTasks.length > 0 ? (
              <div className="flex flex-col">
                {unifiedPendingTasks.slice(0, 3).map((t) => (
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
            style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", padding: "8px 12px" }}
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
              | { kind: "event"; item: PlannerStats["recentEvents"][number] }
              | { kind: "task"; item: PlannerStats["pendingTasksList"][number] }
              | { kind: "payment"; item: NonNullable<PlannerStats["recentInvoices"]>[number] };

            let all: AnyItem[] = [];
            let emptyMsg = "";

            if (tab === "Eventos") {
              all = (unifiedRecentEvents || [])
                .filter((e) => !search || e.name.toLowerCase().includes(search.toLowerCase()))
                .map((e) => ({ kind: "event" as const, item: e }));
              emptyMsg = "Sin eventos";
            } else if (tab === "Tareas") {
              all = (unifiedPendingTasks || [])
                .filter((t) => !search || t.title.toLowerCase().includes(search.toLowerCase()))
                .map((t) => ({ kind: "task" as const, item: t }));
              emptyMsg = "Sin tareas";
            } else {
              all = (unifiedInvoices || [])
                .filter(
                  (p) =>
                    !search ||
                    p.concept.toLowerCase().includes(search.toLowerCase()) ||
                    p.client.toLowerCase().includes(search.toLowerCase()),
                )
                .map((p) => ({ kind: "payment" as const, item: p }));
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
