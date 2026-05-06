"use client";

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
const IcoHelp = wrap(HelpCircleIcon);
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo, useRef } from "react";
import { useUserSession } from "@/hooks/use-user-session";
import { getSidebarSections } from "@/lib/tenant-type";
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
    <div ref={ref} className="relative px-[14px]">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center rounded-[8px] border border-transparent text-left transition-colors",
          open
            ? "bg-[var(--bg-subtle)] border-[var(--line-1)]"
            : "hover:bg-[var(--bg-hover)] hover:border-[var(--line-1)]"
        )}
        style={{ padding: "7px 9px", gap: "9px" }}
      >
        <div
          className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-[6px] bg-[var(--ink-1)] text-[10.5px] font-bold text-white"
          style={{ letterSpacing: "0.02em" }}
        >
          {monogram}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-semibold text-[var(--ink-1)]" style={{ lineHeight: 1.2 }}>
            {org.name}
          </div>
          <div className="text-[10.5px] text-[var(--ink-3)]" style={{ lineHeight: 1.2 }}>Plan Free · ES</div>
        </div>
        <IcoChevDown
          className={cn(
            "h-[13px] w-[13px] flex-shrink-0 text-[var(--ink-3)] transition-transform",
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
const AV_COLORS = ["#5B8FE8", "#00B66D", "#E85D4E", "#F4B942", "#9B7EDB", "#3DB6A8"] as const;

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

function UserChip({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { role, isOwner, isAdmin } = useUserSession();
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
  const initials = (name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("") || "U").toUpperCase();
  const avBg = AV_COLORS[(initials.charCodeAt(0) || 0) % AV_COLORS.length];
  const roleLabel = isOwner ? "Owner" : isAdmin ? "Admin" : role ? role.charAt(0).toUpperCase() + role.slice(1) : "Member";

  if (collapsed) {
    return (
      <div className="px-2">
        <div
          className="mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold text-white"
          style={{ background: avBg }}
        >
          {initials}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative px-[14px]">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center rounded-[8px] border border-transparent text-left transition-colors",
          open
            ? "bg-[var(--bg-subtle)] border-[var(--line-1)]"
            : "hover:bg-[var(--bg-hover)] hover:border-[var(--line-1)]"
        )}
        style={{ padding: "7px 9px", gap: "9px" }}
      >
        <div
          className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
          style={{ background: avBg }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-semibold text-[var(--ink-1)]" style={{ lineHeight: 1.2 }}>
            {name}
          </div>
          <div className="text-[10.5px] text-[var(--ink-3)]" style={{ lineHeight: 1.2 }}>{roleLabel}</div>
        </div>
        <IcoChevDown
          className={cn(
            "h-[13px] w-[13px] flex-shrink-0 text-[var(--ink-3)] transition-transform",
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
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
              style={{ background: avBg }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[12.5px] font-semibold leading-tight text-[var(--ink-1)]">{name}</div>
              <div className="truncate text-[11px] leading-tight text-[var(--ink-3)]">{email}</div>
            </div>
          </div>
          <div className="my-1 mx-1 h-px bg-[var(--line-1)]" />
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

const navigationProviderProfile = [
  { name: "Mi Perfil Público", href: "/dashboard/public-profile", icon: IcoStore, permission: null as string | null },
];

const navigationAfterContacts = [
  { name: "Eventos", href: "/dashboard/events", icon: IcoEvents, permission: "events:read" },
  { name: "CRM", href: "/dashboard/crm", icon: IcoUser, permission: "crm:read" },
];

const contactsSubNav = [
  { name: "Todos", href: "/dashboard/contacts", icon: IcoPeople },
  { name: "Personas", href: "/dashboard/contacts?segment=persons", icon: IcoUser },
  { name: "Empresas", href: "/dashboard/contacts?segment=companies", icon: IcoCompany },
];

const navigationPartners = [
  { name: "Partners", href: "/dashboard/partners", icon: IcoPartners, permission: null as string | null },
];


const productivitySubNav = [
  { name: "Calendario", href: "/dashboard/calendar", icon: IcoCalendar },
  { name: "Tareas", href: "/dashboard/tasks", icon: IcoTasks },
  { name: "Formularios", href: "/dashboard/forms", icon: IcoForm },
  { name: "Documentos", href: "/dashboard/documents", icon: IcoFolder, comingSoon: true },
];

// "Equipo" y "Mi Perfil Público" se omiten aquí porque ya están en el menú
// del tenant chip (Mi Perfil Público / Usuarios / Configuración).
const navigationAfterProductivity = [
  { name: "HubIA", href: "/dashboard/ai", icon: IcoSparkles, permission: null, section: "ai" },
];

// Productos — entrada simple entre Finanzas y Productividad
const navigationProducts = [
  { name: "Productos", href: "/dashboard/products", icon: IcoProducts, permission: null as string | null },
];

const financeSubNav = [
  { name: "Dashboard", href: "/dashboard/finance", icon: IcoDashboard },
  { name: "Presupuestos", href: "/dashboard/finance/quotes", icon: IcoQuote },
  { name: "Facturas", href: "/dashboard/finance/invoices", icon: IcoInvoice },
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
  const { can, eventScoped, orgType, loading: sessionLoading } = useUserSession();
  const [financeExpanded, setFinanceExpanded] = useState(false);
  const [productivityExpanded, setProductivityExpanded] = useState(false);
  const [contactsExpanded, setContactsExpanded] = useState(false);

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

  const filteredProducts = useMemo(() => {
    if (eventScoped) return [];
    return navigationProducts.filter((item) => !item.permission || can(item.permission));
  }, [can, eventScoped]);

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
  
  // Auto-expand menus based on current page
  const isFinancePage = pathname.startsWith("/dashboard/finance");
  const isContactsPage = pathname.startsWith("/dashboard/contacts");
  const isProductivityPage = pathname.startsWith("/dashboard/calendar") ||
                             pathname.startsWith("/dashboard/tasks") ||
                             pathname.startsWith("/dashboard/forms") ||
                             pathname.startsWith("/dashboard/documents");
  
  useEffect(() => {
    if (isFinancePage) {
      setFinanceExpanded(true);
    }
    if (isContactsPage) {
      setContactsExpanded(true);
    }
    if (isProductivityPage) {
      setProductivityExpanded(true);
    }
  }, [isFinancePage, isContactsPage, isProductivityPage]);
  
  // Auto-collapse when in event view on desktop
  const isCollapsed = collapsed || isEventView;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
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
            "flex h-16 items-center transition-all duration-300",
            isCollapsed ? "justify-center px-2" : "gap-3 px-5"
          )}>
            {isCollapsed ? (
              <Image
                src="/images/isotipo-dark.png"
                alt="HubEnts"
                width={28}
                height={28}
                className="flex-shrink-0"
              />
            ) : (
              <Logo variant="full" size="md" theme="light" />
            )}
          </div>

          {/* Tenant chip — workspace selector */}
          {!eventScoped && <TenantChip collapsed={isCollapsed} />}

          {/* Hairline divider between chrome and nav */}
          <div className={cn("mx-2 mt-3 mb-1 h-px bg-[var(--line-1)]", eventScoped && "mt-1")} />

          {/* Navigation */}
          <nav className="flex-1 px-[14px] py-2 overflow-y-auto" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {/* Dashboard */}
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
                    <TooltipContent side="right">
                      {item.name}
                    </TooltipContent>
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

            {/* Partners HubEnts (after Dashboard, before Contacts) */}
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
                    <TooltipContent side="right">
                      {item.name}
                    </TooltipContent>
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

            {/* Contactos Menu with Submenu + hover flyout */}
            {showContacts && (isCollapsed ? (
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
                childrenItems={contactsSubNav}
                isInSection={isContactsPage}
                expanded={contactsExpanded}
                onToggle={() => setContactsExpanded((e) => !e)}
                pathname={pathname}
              />
            ))}

            {/* Eventos + CRM (after Contactos) */}
            {filteredAfterContacts.map((item) => {
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
                    <TooltipContent side="right">
                      {item.name}
                    </TooltipContent>
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

            {/* Finance Menu with Submenu + hover flyout */}
            {showFinance && (isCollapsed ? (
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
                childrenItems={financeSubNav}
                isInSection={isFinancePage}
                expanded={financeExpanded}
                onToggle={() => setFinanceExpanded((e) => !e)}
                pathname={pathname}
              />
            ))}

            {/* Productos (single nav item — entre Finanzas y Productividad) */}
            {filteredProducts.map((item) => {
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

            {/* Productividad Menu with Submenu + hover flyout */}
            {!eventScoped && hasSection("productivity") && (isCollapsed ? (
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
                childrenItems={productivitySubNav}
                isInSection={isProductivityPage}
                expanded={productivityExpanded}
                onToggle={() => setProductivityExpanded((e) => !e)}
                pathname={pathname}
              />
            ))}

            {/* Items after Productividad: Equipo + Mi Perfil Público (HubIA tile abajo) */}
            {filteredNavAfterProductivity
              .filter((item) => item.name !== "HubIA")
              .map((item) => {
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
                      <TooltipContent side="right">
                        {item.name}
                      </TooltipContent>
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

            {/* HubIA — tile destacado (icono arriba + label, fondo sand gradient) */}
            {filteredNavAfterProductivity.some((i) => i.name === "HubIA") && (
              <>
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
              </>
            )}
          </nav>

          {/* NAV_BOTTOM — Invita y gana + Ayuda y soporte (después del spacer
              que mete .flex-1 implícito por flex-col del aside) */}
          {!eventScoped && !isCollapsed && (
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

          {/* Versión collapsed: solo iconos con tooltip */}
          {!eventScoped && isCollapsed && (
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
