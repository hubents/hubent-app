"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { createPortal } from "react-dom";
import { Logo } from "@/components/ui/logo";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEvent } from "@/contexts/event-context";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare03Icon,
  Calendar03Icon,
  UserCircleIcon,
  Agreement01Icon,
  UserListIcon,
  CheckmarkSquare02Icon,
  Settings01Icon,
  UserMultiple02Icon,
  Wallet01Icon,
  Contact01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  SparklesIcon,
  ArrowDown01Icon,
  Note01Icon,
  Invoice01Icon,
  DeliveryTruck01Icon,
  BankIcon,
  ChartUpIcon,
  Calendar01Icon,
  Folder01Icon,
  ClipboardIcon,
  Building01Icon,
  UserGroupIcon,
  Logout01Icon,
  PlusSignIcon,
  InvoiceIcon,
  ShoppingBag01Icon,
  GiftIcon,
  HelpCircleIcon,
  Store01Icon,
  House01Icon,
  Package01Icon,
  Camera01Icon,
  Archive01Icon,
  ShoppingCart01Icon,
} from "@hugeicons/core-free-icons";

// ============================================================
// Iconos — Hugeicons Stroke Rounded (set oficial del Guideline).
// Cada wrapper acepta className y renderiza el icon a través de
// HugeiconsIcon con stroke 1.5 (spec del prototipo).
// ============================================================
const ICON_STROKE = 1.5 as const;
type IconProps = { className?: string };
type IconCmp = React.ComponentType<IconProps>;
type IconData = Parameters<typeof HugeiconsIcon>[0]["icon"];
const wrap = (icon: IconData): IconCmp => {
  const W = ({ className }: IconProps) => (
    <HugeiconsIcon icon={icon} className={className} strokeWidth={ICON_STROKE} />
  );
  W.displayName = `HugeIcon`;
  return W;
};

// Nav icons mapped to prototype's intent (see prototipo src/icons.jsx for
// original Hugeicons references in JSDoc comments).
const IcoDashboard = wrap(DashboardSquare03Icon);
const IcoEvents = wrap(Calendar03Icon);
const IcoUser = wrap(UserCircleIcon);
const IcoPartners = wrap(Agreement01Icon);
const IcoStore = wrap(UserListIcon);
const IcoTasks = wrap(CheckmarkSquare02Icon);
const IcoSettings = wrap(Settings01Icon);
const IcoTeam = wrap(UserMultiple02Icon);
const IcoPayments = wrap(Wallet01Icon);
const IcoContacts = wrap(Contact01Icon);
const IcoChevLeft = wrap(ArrowLeft01Icon);
const IcoChevRight = wrap(ArrowRight01Icon);
const IcoSparkles = wrap(SparklesIcon);
const IcoChevDown = wrap(ArrowDown01Icon);
const IcoQuote = wrap(Note01Icon);
const IcoInvoice = wrap(Invoice01Icon);
const IcoDelivery = wrap(DeliveryTruck01Icon);
const IcoBank = wrap(BankIcon);
const IcoChart = wrap(ChartUpIcon);
const IcoCalendar = wrap(Calendar01Icon);
const IcoFolder = wrap(Folder01Icon);
const IcoForm = wrap(ClipboardIcon);
const IcoCompany = wrap(Building01Icon);
const IcoPeople = wrap(UserGroupIcon);
const IcoLogout = wrap(Logout01Icon);
const IcoAdd = wrap(PlusSignIcon);
const IcoRectif = wrap(InvoiceIcon);
const IcoProducts = wrap(ShoppingBag01Icon);
const IcoGift = wrap(GiftIcon);
const IcoVendor = wrap(Store01Icon);
const IcoHelp = wrap(HelpCircleIcon);
const IcoVenues = wrap(House01Icon);
const IcoLogistics = wrap(Package01Icon);
const IcoAudiovisual = wrap(Camera01Icon);
const IcoWarehouse = wrap(Archive01Icon);
const IcoOrders = wrap(ShoppingCart01Icon);

// ── Nav customisation ──────────────────────────────────────────────────────
type NavPrefs = { hidden: string[]; order: string[] };
const NAV_PREFS_KEY = "hubents:nav-prefs";

function navPrefsKey(orgId?: number) {
  return orgId ? `hubents:nav-prefs:${orgId}` : NAV_PREFS_KEY;
}

function loadNavPrefs(orgId?: number): NavPrefs {
  try {
    const raw = localStorage.getItem(navPrefsKey(orgId));
    if (raw) return JSON.parse(raw) as NavPrefs;
  } catch {}
  return { hidden: [], order: [] };
}
function saveNavPrefs(p: NavPrefs, orgId?: number) {
  try { localStorage.setItem(navPrefsKey(orgId), JSON.stringify(p)); } catch {}
}

const ALL_SECTIONS: { id: string; label: string; locked?: boolean }[] = [
  { id: "dashboard",        label: "Inicio",            locked: true },
  { id: "partners",         label: "Partners"           },
  { id: "contacts",         label: "Contactos"          },
  { id: "events",           label: "Eventos"            },
  { id: "crm",              label: "CRM"                },
  { id: "finance",          label: "Finanzas"           },
  { id: "products",         label: "Productos"          },
  { id: "provider-module",  label: "Módulo proveedor"   },
  { id: "productivity",     label: "Productividad"      },
  { id: "ai",               label: "HubIA"              },
];

// Sub-items for sections that have a NavParent expand/collapse.
// IDs use "sectionId.SubItemName" — must match the `name` field in the
// corresponding *SubNav array so renderSection can filter by navPrefs.hidden.
const SECTION_SUBITEMS: Record<string, { id: string; label: string }[]> = {
  contacts: [
    { id: "contacts.Todos", label: "Todos" },
    { id: "contacts.Personas", label: "Personas" },
    { id: "contacts.Empresas", label: "Empresas" },
    { id: "contacts.Proveedores", label: "Proveedores" },
  ],
  finance: [
    { id: "finance.Dashboard", label: "Dashboard" },
    { id: "finance.Presupuestos", label: "Presupuestos" },
    { id: "finance.Facturas", label: "Facturas" },
    { id: "finance.Rectificativas", label: "Rectificativas" },
    { id: "finance.Albaranes", label: "Albaranes" },
    { id: "finance.Pagos", label: "Pagos" },
    { id: "finance.Configuración", label: "Configuración" },
  ],
  productivity: [
    { id: "productivity.Calendario", label: "Calendario" },
    { id: "productivity.Tareas", label: "Tareas" },
    { id: "productivity.Formularios", label: "Formularios" },
    { id: "productivity.Documentos", label: "Documentos" },
  ],
};

import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo, useRef } from "react";
import { useUserSession } from "@/hooks/use-user-session";
import { useOnboardingProgress } from "@/hooks/use-onboarding-progress";
import { getSidebarSections } from "@/lib/tenant-type";
import { Av } from "@/components/ui/ds";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================
// TenantChip — workspace selector arriba del sidebar.
// Muestra monograma + nombre de la org + plan, abre menú con
// "Mi Perfil Público / Usuarios / Configuración" + cambio de espacio.
// ============================================================
type Org = { id: number; name: string; slug: string; logo?: string | null };

function TenantChip({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [org, setOrg] = useState<Org | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/user/organizations")
      .then((r) => r.json())
      .then((res) => {
        if (alive && res?.success && res.data?.length > 0) setOrg(res.data[0]);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const id = setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", h); };
  }, [open]);

  if (!org) return null;
  const monogram = org.name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 3)
    .join("")
    .toUpperCase();

  if (collapsed) {
    return (
      <div className="px-2">
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-[8px] bg-[var(--ink-1)] text-[10.5px] font-bold tracking-wide text-white">
          {monogram}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative px-3">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center rounded-[10px] text-left transition-colors",
          open ? "bg-[var(--bg-subtle)]" : "hover:bg-[var(--bg-hover)]"
        )}
        style={{ padding: "10px 10px", gap: "10px" }}
      >
        <div
          className="flex h-[36px] w-[36px] flex-shrink-0 items-center justify-center rounded-[8px] bg-[var(--ink-1)] text-[11px] font-bold text-white"
          style={{ letterSpacing: "0.04em" }}
        >
          {monogram}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-[var(--ink-1)]" style={{ lineHeight: 1.25 }}>
            {org.name}
          </div>
          <div className="text-[11px] text-[var(--ink-3)]" style={{ lineHeight: 1.25 }}>Plan Free · ES</div>
        </div>
        <IcoChevDown
          className={cn(
            "h-[14px] w-[14px] flex-shrink-0 text-[var(--ink-3)] transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E8E3D8", zIndex: 9999 }}
          className="absolute left-2 right-2 top-[calc(100%+4px)] rounded-[12px] border p-1 shadow-[0_8px_28px_rgba(0,0,0,.12),0_2px_6px_rgba(0,0,0,.05)]"
        >
          <button
            onClick={() => { setOpen(false); router.push("/dashboard/public-profile"); }}
            className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[12.5px] font-medium text-[var(--ink-1)] hover:bg-[var(--bg-subtle)]"
          >
            <IcoStore className="h-4 w-4 text-[var(--ink-2)]" />
            Mi Perfil Público
          </button>
          <button
            onClick={() => { setOpen(false); router.push("/dashboard/team"); }}
            className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[12.5px] font-medium text-[var(--ink-1)] hover:bg-[var(--bg-subtle)]"
          >
            <IcoTeam className="h-4 w-4 text-[var(--ink-2)]" />
            Usuarios
          </button>
          <button
            onClick={() => { setOpen(false); router.push("/dashboard/settings"); }}
            className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[12.5px] font-medium text-[var(--ink-1)] hover:bg-[var(--bg-subtle)]"
          >
            <IcoSettings className="h-4 w-4 text-[var(--ink-2)]" />
            Configuración
          </button>
          <div className="my-1 mx-1 h-px bg-[var(--line-1)]" />
          <button
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[12.5px] font-medium text-[var(--ink-2)] hover:bg-[var(--bg-subtle)]"
          >
            <IcoAdd className="h-4 w-4 text-[var(--ink-2)]" />
            Cambiar de espacio
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// UserChip — perfil del usuario al final del sidebar.
// Avatar + nombre + rol, dropdown hacia arriba con menú.
// ============================================================
type Theme = "sand" | "mono" | "forest" | "dark";
type Density = "comfortable" | "compact";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (theme === "sand") {
    html.removeAttribute("data-theme");
    html.classList.remove("dark");
  } else if (theme === "dark") {
    html.classList.add("dark");
    html.removeAttribute("data-theme");
  } else {
    html.classList.remove("dark");
    html.setAttribute("data-theme", theme);
  }
  try { localStorage.setItem("hubents:theme", theme); } catch {}
}

function applyDensity(d: Density) {
  if (typeof document === "undefined") return;
  if (d === "compact") document.documentElement.setAttribute("data-density", "compact");
  else document.documentElement.removeAttribute("data-density");
  try { localStorage.setItem("hubents:density", d); } catch {}
}

function OnboardingRing({ pct, size = 40 }: { pct: number; size?: number }) {
  if (pct >= 100) return null;
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--line-1)" strokeWidth="2.5" />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke="#F59E0B" strokeWidth="2.5"
        strokeDasharray={circ} strokeDashoffset={circ - dash}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dashoffset .5s ease" }}
      />
    </svg>
  );
}

function UserChip({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const { data: session } = useSession();
  useUserSession();
  const onboarding = useOnboardingProgress();
  const [open, setOpen] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("sand");
  const [density, setDensity] = useState<Density>("comfortable");
  const ref = useRef<HTMLDivElement>(null);

  // Hydrate theme/density from localStorage on mount
  useEffect(() => {
    try {
      const t = (localStorage.getItem("hubents:theme") as Theme | null) || "sand";
      const d = (localStorage.getItem("hubents:density") as Density | null) || "comfortable";
      setTheme(t); applyTheme(t);
      setDensity(d); applyDensity(d);
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const id = setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", h); };
  }, [open]);

  const name = session?.user?.name || "Usuario";
  const email = session?.user?.email || "";
  const userImage = (session?.user as { image?: string | null })?.image;

  const obPct = onboarding?.pct ?? 100;

  if (collapsed) {
    return (
      <div className="px-2 flex justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => router.push("/dashboard/profile")}
              className="relative flex h-10 w-10 items-center justify-center"
            >
              <OnboardingRing pct={obPct} size={40} />
              <div className="overflow-hidden rounded-full" style={{ width: 32, height: 32 }}>
                <Av src={userImage} name={name} size={32} />
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {obPct < 100 ? `Perfil ${obPct}% completo — ${name}` : `${name} — Mi perfil`}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative px-3">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center rounded-[10px] border border-transparent text-left transition-all",
          open
            ? "bg-[var(--bg-subtle)] border-[var(--line-1)]"
            : "hover:bg-[var(--bg-hover)] hover:border-[var(--line-1)]"
        )}
        style={{ padding: "8px 10px", gap: "10px" }}
      >
        {/* Avatar con anillo de progreso */}
        <div className="relative flex-shrink-0" style={{ width: 38, height: 38 }}>
          <OnboardingRing pct={obPct} size={38} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="overflow-hidden rounded-full" style={{ width: 30, height: 30 }}>
              <Av src={userImage} name={name} size={30} />
            </div>
          </div>
        </div>
        {/* Nombre */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-[var(--ink-1)]" style={{ lineHeight: 1.3 }}>
            {name}
          </div>
          <div className="truncate text-[11px] text-[var(--ink-3)]" style={{ lineHeight: 1.3 }}>{email}</div>
        </div>
        <IcoChevDown
          className={cn(
            "h-[14px] w-[14px] flex-shrink-0 text-[var(--ink-3)] transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E8E3D8", zIndex: 9999 }}
          className="absolute left-2 right-2 bottom-[calc(100%+4px)] rounded-[12px] border p-1 shadow-[0_8px_28px_rgba(0,0,0,.12),0_2px_6px_rgba(0,0,0,.05)]"
        >
          <div className="flex items-center gap-2.5 px-2 py-2">
            <Av src={userImage} name={name} size={32} />
            <div className="min-w-0">
              <div className="truncate text-[12.5px] font-semibold leading-tight text-[var(--ink-1)]">{name}</div>
              <div className="truncate text-[11px] leading-tight text-[var(--ink-3)]">{email}</div>
            </div>
          </div>
          <div className="my-1 mx-1 h-px bg-[var(--line-1)]" />
          <button
            onClick={() => { setOpen(false); router.push("/dashboard/profile"); }}
            className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[12.5px] font-medium text-[var(--ink-1)] hover:bg-[var(--bg-subtle)]"
          >
            <IcoUser className="h-4 w-4 text-[var(--ink-2)]" />
            Mi perfil
          </button>
          <button
            onClick={() => { setOpen(false); router.push("/dashboard/public-profile"); }}
            className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[12.5px] font-medium text-[var(--ink-1)] hover:bg-[var(--bg-subtle)]"
          >
            <IcoStore className="h-4 w-4 text-[var(--ink-2)]" />
            Mi Perfil Público
          </button>
          <button
            onClick={() => { setOpen(false); router.push("/dashboard/settings"); }}
            className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[12.5px] font-medium text-[var(--ink-1)] hover:bg-[var(--bg-subtle)]"
          >
            <IcoSettings className="h-4 w-4 text-[var(--ink-2)]" />
            Preferencias
          </button>

          {/* Tweaks (theme + density) */}
          <div className="my-1 mx-1 h-px bg-[var(--line-1)]" />
          <button
            onClick={() => setTweaksOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[12.5px] font-medium text-[var(--ink-1)] hover:bg-[var(--bg-subtle)]"
          >
            <span className="flex items-center gap-2.5">
              <IcoDashboard className="h-4 w-4 text-[var(--ink-2)]" />
              Tweaks
            </span>
            <IcoChevDown
              className={cn(
                "h-3 w-3 text-[var(--ink-3)] transition-transform",
                tweaksOpen && "rotate-180"
              )}
            />
          </button>
          {tweaksOpen && (
            <div className="mx-1.5 mb-1 mt-0.5 flex flex-col gap-3 rounded-[10px] bg-[var(--bg-subtle)] p-2.5">
              <div>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[.08em] text-[var(--ink-4)]">
                  Tema
                </div>
                <div className="flex flex-wrap gap-1">
                  {([
                    ["sand", "Arena"],
                    ["mono", "Mono"],
                    ["forest", "Bosque"],
                    ["dark", "Oscuro"],
                  ] as const).map(([v, l]) => {
                    const active = theme === v;
                    return (
                      <button
                        key={v}
                        onClick={() => { setTheme(v); applyTheme(v); }}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors",
                          active
                            ? "bg-[var(--ink-1)] text-white border border-[var(--ink-1)]"
                            : "bg-white text-[var(--ink-2)] border border-[var(--line-1)] hover:border-[var(--line-strong)]"
                        )}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[.08em] text-[var(--ink-4)]">
                  Densidad
                </div>
                <div className="flex gap-1">
                  {([
                    ["comfortable", "Cómoda"],
                    ["compact", "Compacta"],
                  ] as const).map(([v, l]) => {
                    const active = density === v;
                    return (
                      <button
                        key={v}
                        onClick={() => { setDensity(v); applyDensity(v); }}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors",
                          active
                            ? "bg-[var(--ink-1)] text-white border border-[var(--ink-1)]"
                            : "bg-white text-[var(--ink-2)] border border-[var(--line-1)] hover:border-[var(--line-strong)]"
                        )}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="my-1 mx-1 h-px bg-[var(--line-1)]" />
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login", redirect: true })}
            className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[12.5px] font-medium text-[var(--ink-2)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-1)]"
          >
            <IcoLogout className="h-4 w-4 text-[var(--ink-2)]" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// NavConfigPanel — inline sidebar customisation panel.
// Visible (CSS flex) when navConfigOpen, hidden otherwise.
// No modals, no portals — same container as the nav.
// ============================================================
interface NavConfigPanelProps {
  availableSections: { id: string; label: string; locked?: boolean }[];
  initialPrefs: NavPrefs;
  currentTheme: Theme;
  onSave: (prefs: NavPrefs, theme: Theme) => void;
  onCancel: () => void;
}

function NavConfigPanel({
  availableSections,
  initialPrefs,
  currentTheme,
  onSave,
  onCancel,
}: NavConfigPanelProps) {
  const [hidden, setHidden] = React.useState<string[]>(initialPrefs.hidden);
  const [order, setOrder] = React.useState<string[]>(() => {
    const available = availableSections.map((s) => s.id);
    if (initialPrefs.order.length > 0) {
      return [
        ...initialPrefs.order.filter((id) => available.includes(id)),
        ...available.filter((id) => !initialPrefs.order.includes(id)),
      ];
    }
    return available;
  });
  const [draftTheme, setDraftTheme] = React.useState<Theme>(currentTheme);
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set());
  const dragSrcRef = React.useRef<string | null>(null);
  const [dragOver, setDragOver] = React.useState<string | null>(null);

  const toggleHidden = (id: string) => {
    setHidden((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleExpanded = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDragStart = (id: string) => { dragSrcRef.current = id; };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (dragSrcRef.current && dragSrcRef.current !== id) setDragOver(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const srcId = dragSrcRef.current;
    if (!srcId || srcId === targetId) { setDragOver(null); return; }
    setOrder((prev) => {
      const next = [...prev];
      const srcIdx = next.indexOf(srcId);
      const tgtIdx = next.indexOf(targetId);
      if (srcIdx === -1 || tgtIdx === -1) return prev;
      next.splice(srcIdx, 1);
      next.splice(tgtIdx, 0, srcId);
      return next;
    });
    dragSrcRef.current = null;
    setDragOver(null);
  };

  const handleDragEnd = () => { dragSrcRef.current = null; setDragOver(null); };

  const displayOrder = order.filter((id) => availableSections.some((s) => s.id === id));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="px-[14px] pt-4 pb-2">
        <div className="text-[13.5px] font-semibold text-[var(--ink-1)]">Personaliza tu navegación</div>
        <div className="text-[11px] text-[var(--ink-4)] mt-0.5">Marca las categorías que quieras ver y arrástralas para cambiar el orden.</div>
      </div>

      {/* Scrollable section list */}
      <div className="flex-1 overflow-y-auto px-[14px] py-1">
        <div className="flex flex-col gap-0.5">
          {displayOrder.map((id) => {
            const section = availableSections.find((s) => s.id === id);
            if (!section) return null;
            const isLocked = !!section.locked;
            const isChecked = !hidden.includes(id);
            const isDragTarget = dragOver === id;
            const subItems = SECTION_SUBITEMS[id] ?? [];
            const hasChildren = subItems.length > 0;
            const isExpanded = expandedSections.has(id);

            return (
              <div key={id}>
                {/* Parent row */}
                <div
                  draggable={!isLocked}
                  onDragStart={() => handleDragStart(id)}
                  onDragOver={(e) => handleDragOver(e, id)}
                  onDrop={(e) => handleDrop(e, id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "flex items-center gap-2 rounded-[8px] px-2 py-[7px] select-none",
                    isLocked ? "cursor-default" : "cursor-grab active:cursor-grabbing hover:bg-[var(--bg-hover)]",
                    isDragTarget && "border-t-2 border-[var(--ink-2)] bg-[var(--bg-hover)]"
                  )}
                >
                  {/* Drag handle / lock */}
                  {isLocked ? (
                    <span className="w-4 text-center text-[11px] text-[var(--ink-4)]">🔒</span>
                  ) : (
                    <span className="w-4 text-center text-[14px] text-[var(--ink-4)] leading-none select-none">⠿</span>
                  )}

                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isLocked ? true : isChecked}
                    disabled={isLocked}
                    onChange={() => !isLocked && toggleHidden(id)}
                    className="h-[13px] w-[13px] accent-[var(--ink-1)] cursor-pointer disabled:cursor-default flex-shrink-0"
                  />

                  {/* Label */}
                  <span className={cn(
                    "flex-1 text-[12.5px]",
                    isLocked ? "text-[var(--ink-3)]" : isChecked ? "text-[var(--ink-1)] font-medium" : "text-[var(--ink-4)]"
                  )}>
                    {section.label}
                  </span>

                  {/* Expand/collapse chevron for sections with sub-items */}
                  {hasChildren && (
                    <button
                      onClick={() => toggleExpanded(id)}
                      className="p-0.5 text-[var(--ink-3)] hover:text-[var(--ink-1)] transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                        className={cn("transition-transform", isExpanded && "rotate-180")}
                      >
                        <polyline points="2,4 6,8 10,4" />
                      </svg>
                    </button>
                  )}

                  {/* Drag handle icon on right */}
                  {!isLocked && (
                    <span className="text-[var(--ink-4)] opacity-50" style={{ fontSize: 13, lineHeight: 1, userSelect: "none" }}>⠿</span>
                  )}
                </div>

                {/* Sub-items (shown when expanded) */}
                {hasChildren && isExpanded && (
                  <div className="pl-8 flex flex-col gap-0.5 pb-1">
                    {subItems.map((sub) => {
                      const subChecked = !hidden.includes(sub.id);
                      return (
                        <label
                          key={sub.id}
                          className="flex items-center gap-2 rounded-[6px] px-2 py-[5px] cursor-pointer hover:bg-[var(--bg-hover)]"
                        >
                          <input
                            type="checkbox"
                            checked={subChecked}
                            onChange={() => toggleHidden(sub.id)}
                            className="h-[13px] w-[13px] accent-[var(--ink-1)] cursor-pointer flex-shrink-0"
                          />
                          <span className={cn(
                            "text-[12px]",
                            subChecked ? "text-[var(--ink-1)]" : "text-[var(--ink-4)]"
                          )}>
                            {sub.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-3 h-px bg-[var(--line-1)]" />

        {/* Theme — dropdown */}
        <div className="mb-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[.08em] text-[var(--ink-4)]">Tema</div>
          <div className="relative">
            <select
              value={draftTheme}
              onChange={(e) => setDraftTheme(e.target.value as Theme)}
              className="w-full appearance-none rounded-[8px] border border-[var(--line-1)] bg-white px-3 py-[7px] text-[12.5px] text-[var(--ink-1)] cursor-pointer pr-8 focus:outline-none focus:border-[var(--ink-2)]"
            >
              <option value="sand">Arena</option>
              <option value="mono">Mono</option>
              <option value="forest">Bosque</option>
              <option value="dark">Oscuro</option>
            </select>
            <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2,4 6,8 10,4" />
            </svg>
          </div>
        </div>

        <div className="mb-3 h-px bg-[var(--line-1)]" />
      </div>

      {/* Action buttons */}
      <div className="px-[14px] pb-4 pt-2 flex flex-col gap-2">
        <button
          onClick={() => onSave({ hidden, order }, draftTheme)}
          className="w-full rounded-[8px] bg-[var(--ink-1)] px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--ink-2)]"
        >
          Guardar
        </button>
        <button
          onClick={onCancel}
          className="w-full rounded-[8px] border border-[var(--line-1)] px-3 py-2 text-[13px] font-medium text-[var(--ink-2)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ============================================================
// NavParent — parent nav item with inline expand AND hover flyout
// (matches prototype shell.jsx::NavEntry behavior). When the
// inline submenu is closed and the user hovers the parent, a
// portal-positioned flyout appears to the right with the
// children, anchored at the button's right edge.
// ============================================================
type NavSubItem = {
  name: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
  exact?: boolean;
};

function NavParent({
  name,
  icon: Icon,
  parentHref,
  childrenItems,
  isInSection,
  expanded,
  onToggle,
  pathname,
}: {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  parentHref?: string;
  childrenItems: NavSubItem[];
  isInSection: boolean;
  expanded: boolean;
  onToggle: () => void;
  pathname: string;
}) {
  const [hover, setHover] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isSubActive = (sub: NavSubItem) => {
    if (sub.exact || sub.href === parentHref) return pathname === sub.href;
    return pathname === sub.href || pathname.startsWith(sub.href + "/");
  };

  const showFlyout = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setAnchor({ top: r.top, left: r.right + 6 });
    setHover(true);
  };
  const queueHide = () => {
    hideTimer.current = setTimeout(() => setHover(false), 140);
  };
  const cancelHide = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const flyoutVisible = mounted && hover && !expanded && anchor;

  return (
    <>
      <button
        ref={btnRef}
        onClick={onToggle}
        onMouseEnter={showFlyout}
        onMouseLeave={queueHide}
        aria-current={isInSection ? "page" : undefined}
        className={cn(
          "flex w-full items-center justify-between rounded-[8px] px-[11px] py-[9px] text-[14px] font-medium leading-[1.2] transition-colors",
          isInSection
            ? "bg-[var(--bg-subtle)] text-[var(--ink-1)] font-semibold"
            : "text-[var(--ink-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)]"
        )}
      >
        <div className="flex items-center gap-[11px]">
          <Icon className="h-[18px] w-[18px]" />
          {name}
        </div>
        <IcoChevDown
          className={cn(
            "h-[14px] w-[14px] transition-transform opacity-50",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && (
        <div className="ml-[18px] mt-1 mb-1 border-l border-[var(--line-1)] pl-2 flex flex-col">
          {childrenItems.map((sub) => {
            const active = isSubActive(sub);
            return (
              <Link
                key={sub.name}
                href={sub.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-[8px] px-[10px] py-[6px] text-[12.5px] transition-colors mb-0.5",
                  sub.comingSoon && "pointer-events-none opacity-60",
                  active
                    ? "bg-[var(--bg-subtle)] text-[var(--ink-1)] font-semibold"
                    : "text-[var(--ink-2)] font-normal hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)]"
                )}
              >
                <span className="flex-1">{sub.name}</span>
                {sub.comingSoon && (
                  <span
                    className="text-[9.5px] font-medium tracking-wide rounded-full px-1.5 py-px"
                    style={{
                      color: "var(--ink-3)",
                      border: "1px solid var(--line-strong)",
                    }}
                  >
                    Próx.
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {flyoutVisible &&
        createPortal(
          <div
            onMouseEnter={cancelHide}
            onMouseLeave={queueHide}
            style={{
              top: anchor.top,
              left: anchor.left,
              backgroundColor: "#FFFFFF",
              borderColor: "#E8E3D8",
              zIndex: 9999,
              isolation: "isolate",
            }}
            className="fixed min-w-[200px] rounded-[8px] border p-1.5 shadow-[0_12px_32px_rgba(15,16,18,.12),0_2px_6px_rgba(15,16,18,.06)]"
          >
            <div className="mb-1 flex items-center gap-2 border-b border-[var(--line-1)] px-2.5 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">
              <Icon className="h-[14px] w-[14px]" />
              <span>{name}</span>
            </div>
            {childrenItems.map((sub) => {
              const active = isSubActive(sub);
              if (sub.comingSoon) {
                return (
                  <div
                    key={sub.name}
                    className="flex w-full cursor-not-allowed items-center gap-2 rounded-[6px] px-2.5 py-2 text-[13px] text-[var(--ink-4)]"
                  >
                    <span className="flex-1">{sub.name}</span>
                    <span className="rounded-full border border-[var(--line-strong)] px-1.5 py-px text-[9.5px] font-medium tracking-wide text-[var(--ink-3)]">
                      Próx.
                    </span>
                  </div>
                );
              }
              return (
                <Link
                  key={sub.name}
                  href={sub.href}
                  onClick={() => {
                    setHover(false);
                    cancelHide();
                  }}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-[6px] px-2.5 py-2 text-[13px] transition-colors",
                    active
                      ? "bg-[var(--bg-subtle)] text-[var(--ink-1)] font-semibold"
                      : "text-[var(--ink-1)] hover:bg-[var(--bg-subtle)]"
                  )}
                >
                  <span className="flex-1">{sub.name}</span>
                </Link>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}

const navigationDashboard = [
  { name: "Dashboard", href: "/dashboard", icon: IcoDashboard, permission: null },
];


const navigationAfterContacts = [
  { name: "Eventos", href: "/dashboard/events", icon: IcoEvents, permission: "events:read" },
  { name: "CRM", href: "/dashboard/crm", icon: IcoUser, permission: "crm:read" },
];

const contactsSubNav = [
  { name: "Todos", href: "/dashboard/contacts", icon: IcoPeople },
  { name: "Personas", href: "/dashboard/contacts?segment=persons", icon: IcoUser },
  { name: "Empresas", href: "/dashboard/contacts?segment=companies", icon: IcoCompany },
  { name: "Proveedores", href: "/dashboard/contacts?segment=vendors", icon: IcoVendor },
];

const navigationPartners = [
  { name: "Partners", href: "/dashboard/partners", icon: IcoPartners, permission: null as string | null },
];


const productivitySubNav = [
  { name: "Calendario", href: "/dashboard/calendar", icon: IcoCalendar },
  { name: "Tareas", href: "/dashboard/tasks", icon: IcoTasks },
  { name: "Formularios", href: "/dashboard/forms", icon: IcoForm },
  { name: "Documentos", href: "/dashboard/documents", icon: IcoFolder },
];

// "Equipo" y "Mi Perfil Público" se omiten aquí porque ya están en el menú
// del tenant chip (Mi Perfil Público / Usuarios / Configuración).
const navigationAfterProductivity = [
  { name: "HubIA", href: "/dashboard/ai", icon: IcoSparkles, permission: null, section: "ai" },
];

const logisticsSubNav = [
  { name: "Productos",  href: "/dashboard/products",          icon: IcoProducts },
  { name: "Almacenes",  href: "/dashboard/logistics",         icon: IcoWarehouse },
  { name: "Órdenes",    href: "/dashboard/logistics/orders",  icon: IcoOrders },
];

const financeSubNav = [
  { name: "Dashboard", href: "/dashboard/finance", icon: IcoDashboard },
  { name: "Presupuestos", href: "/dashboard/finance/quotes", icon: IcoQuote },
  { name: "Facturas", href: "/dashboard/finance/invoices", icon: IcoInvoice },
  { name: "Rectificativas", href: "/dashboard/finance/credit-notes", icon: IcoRectif },
  { name: "Albaranes", href: "/dashboard/finance/delivery-notes", icon: IcoDelivery },
  { name: "Pagos", href: "/dashboard/finance/payments", icon: IcoPayments },
  { name: "Configuración", href: "/dashboard/finance/settings", icon: IcoSettings },
];

const bottomNavigation = [
  { name: "Configuración", href: "/dashboard/settings", icon: IcoSettings },
];

interface MainSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function MainSidebar({ collapsed = false, onToggle }: MainSidebarProps) {
  const pathname = usePathname();
  const { isEventView } = useEvent();
  const { can, eventScoped, orgType, providerModule, data: sessionData } = useUserSession();
  const orgId = sessionData?.organizationId;
  const [financeExpanded, setFinanceExpanded] = useState(false);
  const [productivityExpanded, setProductivityExpanded] = useState(false);
  const [contactsExpanded, setContactsExpanded] = useState(false);
  const [logisticsExpanded, setLogisticsExpanded] = useState(false);

  // Nav customisation state
  const [navConfigOpen, setNavConfigOpen] = useState(false);
  const [navPrefs, setNavPrefs] = useState<NavPrefs>({ hidden: [], order: [] });
  const [theme, setTheme] = useState<Theme>("sand");

  // Load nav prefs + theme from localStorage when org is known
  useEffect(() => {
    if (!orgId) return;
    setNavPrefs(loadNavPrefs(orgId));
    try {
      const t = (localStorage.getItem("hubents:theme") as Theme | null) || "sand";
      setTheme(t);
    } catch {}
  }, [orgId]);

  // Config-driven section visibility based on orgType
  const activeSections = useMemo(() => {
    return getSidebarSections(orgType);
  }, [orgType]);

  const hasSection = useMemo(() => {
    const set = new Set(activeSections);
    return (section: string) => set.has(section);
  }, [activeSections]);

  const filteredDashboard = useMemo(() => {
    if (eventScoped || !hasSection("dashboard")) return [];
    return navigationDashboard.filter((item) => !item.permission || can(item.permission));
  }, [can, eventScoped, hasSection]);

  const filteredPartners = useMemo(() => {
    if (eventScoped || !hasSection("partners")) return [];
    return navigationPartners.filter((item) => !item.permission || can(item.permission));
  }, [can, eventScoped, hasSection]);

  const filteredAfterContacts = useMemo(() => {
    const base = navigationAfterContacts.filter((item) => {
      if (item.name === "CRM" && !hasSection("crm")) return false;
      if (item.name === "Eventos" && !hasSection("events")) return false;
      if (item.permission && !can(item.permission)) return false;
      return true;
    });
    if (eventScoped) return base.filter((item) => item.name === "Eventos");
    return base;
  }, [can, eventScoped, hasSection]);
  const filteredNavAfterProductivity = useMemo(() => {
    if (eventScoped) return [];
    return navigationAfterProductivity.filter((item) => {
      if (item.section && !hasSection(item.section)) return false;
      return !item.permission || can(item.permission);
    });
  }, [can, eventScoped, hasSection]);
  const showFinance = useMemo(() => !eventScoped && hasSection("finance") && can("finance:read"), [can, eventScoped, hasSection]);
  const showContacts = useMemo(() => !eventScoped && hasSection("contacts") && can("crm:read"), [can, eventScoped, hasSection]);

  // Module-specific nav item for providers (booking → Venues, logistica → Logística, audiovisual → Audiovisual)
  const providerModuleNav = useMemo(() => {
    if (eventScoped || orgType !== "provider") return null;
    const map: Record<string, { name: string; href: string; icon: IconCmp }> = {
      booking:     { name: "Venues",     href: "/dashboard/venues",     icon: IcoVenues },
      logistica:   { name: "Logística",  href: "/dashboard/logistics",  icon: IcoLogistics },
      audiovisual: { name: "Audiovisual",href: "/dashboard/audiovisual",icon: IcoAudiovisual },
    };
    return providerModule ? (map[providerModule] ?? null) : null;
  }, [eventScoped, orgType, providerModule]);

  // Sections this user can actually see (used by NavConfigPanel)
  const availableSections = useMemo(() => {
    return ALL_SECTIONS.filter((s) => {
      if (s.id === "dashboard") return true;
      if (s.id === "partners") return hasSection("partners");
      if (s.id === "contacts") return showContacts;
      if (s.id === "events") return hasSection("events") && !eventScoped;
      if (s.id === "crm") return hasSection("crm") && !eventScoped;
      if (s.id === "finance") return showFinance;
      if (s.id === "products") return !eventScoped && providerModule !== "logistica";
      if (s.id === "provider-module") return !!providerModuleNav;
      if (s.id === "productivity") return hasSection("productivity") && !eventScoped;
      if (s.id === "ai") return hasSection("ai") && !eventScoped;
      return false;
    });
  }, [orgType, hasSection, showContacts, showFinance, eventScoped, providerModuleNav]);

  // Ordered section IDs respecting saved prefs (hidden sections excluded)
  const orderedSectionIds = useMemo(() => {
    const hiddenSet = new Set(navPrefs.hidden);
    const available = availableSections.map((s) => s.id);
    let ordered: string[];
    if (navPrefs.order.length > 0) {
      ordered = [
        ...navPrefs.order.filter((id) => available.includes(id)),
        ...available.filter((id) => !navPrefs.order.includes(id)),
      ];
    } else {
      ordered = available;
    }
    return ["dashboard", ...ordered.filter((id) => id !== "dashboard" && !hiddenSet.has(id))];
  }, [navPrefs, availableSections]);

  // Auto-expand menus based on current page
  const isFinancePage = pathname.startsWith("/dashboard/finance");
  const isContactsPage = pathname.startsWith("/dashboard/contacts");
  const isProductivityPage = pathname.startsWith("/dashboard/calendar") ||
                             pathname.startsWith("/dashboard/tasks") ||
                             pathname.startsWith("/dashboard/forms") ||
                             pathname.startsWith("/dashboard/documents");
  const isLogisticsPage = pathname.startsWith("/dashboard/logistics") ||
                          pathname.startsWith("/dashboard/products");

  useEffect(() => {
    if (isFinancePage) setFinanceExpanded(true);
    if (isContactsPage) setContactsExpanded(true);
    if (isProductivityPage) setProductivityExpanded(true);
    if (isLogisticsPage) setLogisticsExpanded(true);
  }, [isFinancePage, isContactsPage, isProductivityPage, isLogisticsPage]);
  
  // Auto-collapse when in event view on desktop
  const isCollapsed = collapsed || isEventView;

  // ── renderSection ─────────────────────────────────────────────────────────
  // Maps a section ID to its nav JSX. Each case returns the existing rendering
  // logic so the order is fully controlled by orderedSectionIds.
  // Sub-items hidden via navPrefs are filtered before passing to NavParent.
  const hiddenSubItems = new Set(navPrefs.hidden);
  const visibleContactsSub = contactsSubNav.filter((i) => !hiddenSubItems.has(`contacts.${i.name}`));
  const visibleFinanceSub = financeSubNav.filter((i) => !hiddenSubItems.has(`finance.${i.name}`));
  const visibleProductivitySub = productivitySubNav.filter((i) => !hiddenSubItems.has(`productivity.${i.name}`));

  const renderSection = (sectionId: string): React.ReactNode => {
    switch (sectionId) {
      case "dashboard":
        return (
          <React.Fragment key="dashboard">
            {filteredDashboard.map((item) => {
              const isActive = pathname === item.href;
              if (isCollapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center justify-center rounded-[8px] p-3 transition-colors",
                          isActive
                            ? "bg-[var(--bg-subtle)] text-[var(--ink-1)] font-semibold"
                            : "text-[var(--ink-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)]"
                        )}
                      >
                        <item.icon className="h-[18px] w-[18px]" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.name}</TooltipContent>
                  </Tooltip>
                );
              }
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-[11px] rounded-[8px] px-[11px] py-[9px] text-[14px] font-medium leading-[1.2] transition-colors",
                    isActive
                      ? "bg-[var(--bg-subtle)] text-[var(--ink-1)] font-semibold"
                      : "text-[var(--ink-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)]"
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" />
                  {item.name}
                </Link>
              );
            })}
          </React.Fragment>
        );

      case "partners":
        return (
          <React.Fragment key="partners">
            {filteredPartners.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              if (isCollapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center justify-center rounded-[8px] p-3 transition-colors",
                          isActive
                            ? "bg-[var(--bg-subtle)] text-[var(--ink-1)] font-semibold"
                            : "text-[var(--ink-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)]"
                        )}
                      >
                        <item.icon className="h-[18px] w-[18px]" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.name}</TooltipContent>
                  </Tooltip>
                );
              }
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-[11px] rounded-[8px] px-[11px] py-[9px] text-[14px] font-medium leading-[1.2] transition-colors",
                    isActive
                      ? "bg-[var(--bg-subtle)] text-[var(--ink-1)] font-semibold"
                      : "text-[var(--ink-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)]"
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" />
                  {item.name}
                </Link>
              );
            })}
          </React.Fragment>
        );

      case "contacts":
        if (!showContacts) return null;
        return (
          <React.Fragment key="contacts">
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/dashboard/contacts"
                    className={cn(
                      "flex items-center justify-center rounded-[8px] p-3 transition-colors",
                      isContactsPage
                        ? "bg-[var(--bg-subtle)] text-[var(--ink-1)] font-semibold"
                        : "text-[var(--ink-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)]"
                    )}
                  >
                    <IcoContacts className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Contactos</TooltipContent>
              </Tooltip>
            ) : (
              <NavParent
                name="Contactos"
                icon={IcoContacts}
                parentHref="/dashboard/contacts"
                childrenItems={visibleContactsSub}
                isInSection={isContactsPage}
                expanded={contactsExpanded}
                onToggle={() => setContactsExpanded((e) => !e)}
                pathname={pathname}
              />
            )}
          </React.Fragment>
        );

      case "events": {
        const eventsItem = filteredAfterContacts.find((i) => i.name === "Eventos");
        if (!eventsItem) return null;
        const isActive = pathname === eventsItem.href || pathname.startsWith(eventsItem.href + "/");
        return (
          <React.Fragment key="events">
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={eventsItem.href}
                    className={cn(
                      "flex items-center justify-center rounded-[8px] p-3 transition-colors",
                      isActive
                        ? "bg-[var(--bg-subtle)] text-[var(--ink-1)] font-semibold"
                        : "text-[var(--ink-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)]"
                    )}
                  >
                    <eventsItem.icon className="h-[18px] w-[18px]" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{eventsItem.name}</TooltipContent>
              </Tooltip>
            ) : (
              <Link
                href={eventsItem.href}
                className={cn(
                  "flex items-center gap-[11px] rounded-[8px] px-[11px] py-[9px] text-[14px] font-medium leading-[1.2] transition-colors",
                  isActive
                    ? "bg-[var(--bg-subtle)] text-[var(--ink-1)] font-semibold"
                    : "text-[var(--ink-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)]"
                )}
              >
                <eventsItem.icon className="h-[18px] w-[18px]" />
                {eventsItem.name}
              </Link>
            )}
          </React.Fragment>
        );
      }

      case "crm": {
        const crmItem = filteredAfterContacts.find((i) => i.name === "CRM");
        if (!crmItem) return null;
        const isActive = pathname === crmItem.href || pathname.startsWith(crmItem.href + "/");
        return (
          <React.Fragment key="crm">
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={crmItem.href}
                    className={cn(
                      "flex items-center justify-center rounded-[8px] p-3 transition-colors",
                      isActive
                        ? "bg-[var(--bg-subtle)] text-[var(--ink-1)] font-semibold"
                        : "text-[var(--ink-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)]"
                    )}
                  >
                    <crmItem.icon className="h-[18px] w-[18px]" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{crmItem.name}</TooltipContent>
              </Tooltip>
            ) : (
              <Link
                href={crmItem.href}
                className={cn(
                  "flex items-center gap-[11px] rounded-[8px] px-[11px] py-[9px] text-[14px] font-medium leading-[1.2] transition-colors",
                  isActive
                    ? "bg-[var(--bg-subtle)] text-[var(--ink-1)] font-semibold"
                    : "text-[var(--ink-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)]"
                )}
              >
                <crmItem.icon className="h-[18px] w-[18px]" />
                {crmItem.name}
              </Link>
            )}
          </React.Fragment>
        );
      }

      case "finance":
        if (!showFinance) return null;
        return (
          <React.Fragment key="finance">
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/dashboard/finance"
                    className={cn(
                      "flex items-center justify-center rounded-[8px] p-3 transition-colors",
                      isFinancePage
                        ? "bg-[var(--bg-subtle)] text-[var(--ink-1)] font-semibold"
                        : "text-[var(--ink-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)]"
                    )}
                  >
                    <IcoBank className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Finanzas</TooltipContent>
              </Tooltip>
            ) : (
              <NavParent
                name="Finanzas"
                icon={IcoBank}
                parentHref="/dashboard/finance"
                childrenItems={visibleFinanceSub}
                isInSection={isFinancePage}
                expanded={financeExpanded}
                onToggle={() => setFinanceExpanded((e) => !e)}
                pathname={pathname}
              />
            )}
          </React.Fragment>
        );

      case "products":
        if (eventScoped || providerModule === "logistica") return null;
        return (
          <React.Fragment key="products">
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/dashboard/products"
                    className={cn(
                      "flex items-center justify-center rounded-[8px] p-3 transition-colors",
                      pathname.startsWith("/dashboard/products")
                        ? "bg-[var(--bg-subtle)] text-[var(--ink-1)]"
                        : "text-[var(--ink-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)]"
                    )}
                  >
                    <IcoProducts className="h-[18px] w-[18px]" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Productos</TooltipContent>
              </Tooltip>
            ) : (
              <Link
                href="/dashboard/products"
                className={cn(
                  "flex items-center gap-[11px] rounded-[8px] px-[11px] py-[9px] text-[14px] font-medium leading-[1.2] transition-colors",
                  pathname.startsWith("/dashboard/products")
                    ? "bg-[var(--bg-subtle)] text-[var(--ink-1)] font-semibold"
                    : "text-[var(--ink-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)]"
                )}
              >
                <IcoProducts className="h-[18px] w-[18px]" />
                Productos
              </Link>
            )}
          </React.Fragment>
        );

      case "provider-module":
        if (!providerModuleNav) return null;
        return (
          <React.Fragment key="provider-module">
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={providerModuleNav.href}
                    className={cn(
                      "flex items-center justify-center rounded-[8px] p-3 transition-colors",
                      pathname.startsWith(providerModuleNav.href)
                        ? "bg-[var(--bg-subtle)] text-[var(--ink-1)] font-semibold"
                        : "text-[var(--ink-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)]"
                    )}
                  >
                    <providerModuleNav.icon className="h-[18px] w-[18px]" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{providerModuleNav.name}</TooltipContent>
              </Tooltip>
            ) : providerModuleNav.href === "/dashboard/logistics" ? (
              <NavParent
                name="Logística"
                icon={IcoLogistics}
                parentHref="/dashboard/logistics"
                childrenItems={logisticsSubNav}
                isInSection={isLogisticsPage}
                expanded={logisticsExpanded}
                onToggle={() => setLogisticsExpanded((e) => !e)}
                pathname={pathname}
              />
            ) : (
              <Link
                href={providerModuleNav.href}
                className={cn(
                  "flex items-center gap-[11px] rounded-[8px] px-[11px] py-[9px] text-[14px] font-medium leading-[1.2] transition-colors",
                  pathname.startsWith(providerModuleNav.href)
                    ? "bg-[var(--bg-subtle)] text-[var(--ink-1)] font-semibold"
                    : "text-[var(--ink-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)]"
                )}
              >
                <providerModuleNav.icon className="h-[18px] w-[18px]" />
                {providerModuleNav.name}
              </Link>
            )}
          </React.Fragment>
        );

      case "productivity":
        if (eventScoped || !hasSection("productivity")) return null;
        return (
          <React.Fragment key="productivity">
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/dashboard/calendar"
                    className={cn(
                      "flex items-center justify-center rounded-[8px] p-3 transition-colors",
                      isProductivityPage
                        ? "bg-[var(--bg-subtle)] text-[var(--ink-1)] font-semibold"
                        : "text-[var(--ink-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)]"
                    )}
                  >
                    <IcoChart className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Productividad</TooltipContent>
              </Tooltip>
            ) : (
              <NavParent
                name="Productividad"
                icon={IcoChart}
                childrenItems={visibleProductivitySub}
                isInSection={isProductivityPage}
                expanded={productivityExpanded}
                onToggle={() => setProductivityExpanded((e) => !e)}
                pathname={pathname}
              />
            )}
          </React.Fragment>
        );

      case "ai":
        if (!filteredNavAfterProductivity.some((i) => i.name === "HubIA")) return null;
        return (
          <React.Fragment key="ai">
            <div className="my-2 mx-2 h-px bg-[var(--line-1)]" />
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/dashboard/ai"
                    className={cn(
                      "flex items-center justify-center rounded-[12px] p-3 transition-colors",
                      pathname.startsWith("/dashboard/ai")
                        ? "bg-[var(--bg-subtle)] text-[var(--ink-1)]"
                        : "text-[var(--ink-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)]"
                    )}
                  >
                    <IcoSparkles className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">HubIA</TooltipContent>
              </Tooltip>
            ) : (
              <Link
                href="/dashboard/ai"
                aria-current={pathname.startsWith("/dashboard/ai") ? "page" : undefined}
                className={cn(
                  "mx-1 mt-1 mb-1 flex flex-col items-center justify-center gap-1.5 rounded-[12px] border border-[var(--line-1)] px-2 py-3 transition-all",
                  "bg-gradient-to-br from-[#F5F1EA] to-[#EDE8DD]",
                  pathname.startsWith("/dashboard/ai")
                    ? "border-[var(--ink-1)] shadow-[0_1px_2px_rgba(24,20,10,0.04)]"
                    : "hover:from-[#F2EEE6] hover:to-[#E8E3D8] hover:border-[var(--line-strong)]"
                )}
              >
                <IcoSparkles className="h-[22px] w-[22px] text-[var(--ink-1)]" />
                <span className="text-[12.5px] font-semibold text-[var(--ink-1)] tracking-tight">
                  HubIA
                </span>
              </Link>
            )}
          </React.Fragment>
        );

      default:
        return null;
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        suppressHydrationWarning
        className={cn(
          "fixed left-0 z-40 border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] transition-all duration-300 hidden md:block",
          isCollapsed ? "w-[56px]" : "w-[232px]"
        )}
        style={{
          top: "var(--banner-height, 0px)",
          height: "calc(100vh - var(--banner-height, 0px))",
        }}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className={cn(
            "flex items-center justify-center border-b border-[var(--line-1)] transition-all duration-300",
            isCollapsed ? "h-14 px-2" : "h-14 px-5"
          )}>
            {isCollapsed ? (
              <Image
                src="/images/isotipo-dark.png"
                alt="Hubents"
                width={22}
                height={22}
                className="flex-shrink-0"
              />
            ) : (
              <Logo variant="full" size="sm" theme="light" />
            )}
          </div>

          {/* Tenant chip — workspace selector */}
          {!eventScoped && <TenantChip collapsed={isCollapsed} />}

          {/* Hairline divider between chrome and nav */}
          <div className={cn("mx-2 mb-1 h-px bg-[var(--line-1)]", eventScoped ? "mt-1" : "mt-0")} />

          {/* Config panel — rendered on top when open, same fiber position always */}
          {navConfigOpen && (
            <NavConfigPanel
              availableSections={availableSections}
              initialPrefs={navPrefs}
              currentTheme={theme}
              onSave={(newPrefs, newTheme) => {
                saveNavPrefs(newPrefs, orgId);
                setNavPrefs(newPrefs);
                setTheme(newTheme);
                applyTheme(newTheme);
                setNavConfigOpen(false);
              }}
              onCancel={() => setNavConfigOpen(false)}
            />
          )}

          {/* Navigation — always mounted, hidden via CSS when config panel is open */}
          <nav
            className={cn("flex-1 py-2 overflow-y-auto", isCollapsed ? "px-1" : "px-[14px]", navConfigOpen && "hidden")}
            style={{ display: navConfigOpen ? "none" : "flex", flexDirection: "column", gap: "2px" }}
          >
            {orderedSectionIds.map((id) => renderSection(id))}

            {/* "Configurar barra lateral" — just below last nav item (e.g. HubIA) */}
            {!eventScoped && !isCollapsed && (
              <div className="mt-2 px-[3px]">
                <div className="h-px bg-[var(--line-1)] mb-1.5" />
                <button
                  onClick={() => setNavConfigOpen(true)}
                  className="text-[11.5px] text-[var(--ink-4)] hover:text-[var(--ink-2)] transition-colors px-[8px] py-1"
                >
                  Configurar barra lateral
                </button>
              </div>
            )}
          </nav>

          {/* NAV_BOTTOM — Invita y gana + Ayuda y soporte */}
          {!navConfigOpen && !eventScoped && !isCollapsed && (
            <div className="px-2 pt-1 pb-1 space-y-0.5">
              <div className="mx-1 mb-2 h-px bg-[var(--line-1)]" />
              <button
                onClick={() => {
                  toast("Programa de referidos — próximamente");
                }}
                className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-normal text-[var(--ink-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)] transition-colors bg-transparent border-none cursor-pointer"
              >
                <IcoGift className="h-[17px] w-[17px]" />
                <span className="text-left">Invita y gana hasta 500€</span>
              </button>
              <a
                href="mailto:hello@hubents.com"
                className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-normal text-[var(--ink-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)] transition-colors no-underline"
              >
                <IcoHelp className="h-[17px] w-[17px]" />
                <span>Ayuda y soporte</span>
              </a>
            </div>
          )}

          {/* Collapsed: icon-only bottom nav */}
          {!navConfigOpen && !eventScoped && isCollapsed && (
            <div className="px-2 pt-1 pb-1 space-y-0.5">
              <div className="mx-auto mb-2 h-px w-7 bg-[var(--line-1)]" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => toast("Programa de referidos — próximamente")}
                    className="flex items-center justify-center rounded-[8px] p-3 text-[var(--ink-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)] transition-colors bg-transparent border-none cursor-pointer w-full"
                  >
                    <IcoGift className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Invita y gana hasta 500€</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href="mailto:hello@hubents.com"
                    className="flex items-center justify-center rounded-[8px] p-3 text-[var(--ink-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)] transition-colors no-underline w-full"
                  >
                    <IcoHelp className="h-5 w-5" />
                  </a>
                </TooltipTrigger>
                <TooltipContent side="right">Ayuda y soporte</TooltipContent>
              </Tooltip>
            </div>
          )}


          {/* Footer: User chip + collapse toggle */}
          <div className="px-0 py-3">
            <div className="mx-2 mb-2 h-px bg-[var(--line-1)]" />
            {!eventScoped && <UserChip collapsed={isCollapsed} />}

            {/* Toggle Button */}
            {onToggle && !isEventView && (
              <button
                onClick={onToggle}
                className="mt-2 mx-2 flex items-center justify-center rounded-[8px] p-2 text-[var(--ink-3)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)] transition-colors"
                style={{ width: "calc(100% - 16px)" }}
              >
                {isCollapsed ? (
                  <IcoChevRight className="h-5 w-5" />
                ) : (
                  <IcoChevLeft className="h-5 w-5" />
                )}
              </button>
            )}
          </div>

{/* HIDDEN TEMPORARILY - NapsixAI branding
          {!isCollapsed && (
            <div className="px-4 py-3 border-t border-[var(--border)]">
              <a 
                href="https://napsix.ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 opacity-50 hover:opacity-80 transition-opacity"
              >
                <span className="text-[10px] text-muted-foreground">Powered by</span>
                <Image
                  src="/images/logos_napsixai/NAPSIX AI LOGO COLOR para fondos claros.png"
                  alt="NapsixAI"
                  width={55}
                  height={16}
                  className="h-3 w-auto"
                />
              </a>
            </div>
          )}
          */}
        </div>
      </aside>
    </TooltipProvider>
  );
}
