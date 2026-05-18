"use client";

import { hgIcon } from "@/components/ui/hg-icon";
import { Moon02Icon, Sun01Icon, LanguageSkillIcon, UserCircleIcon, Store01Icon, Settings01Icon, DashboardSquare03Icon, ArrowDown01Icon, Logout01Icon } from "@hugeicons/core-free-icons";
import { AIHeaderButton } from "@/components/ai/ai-header-button";
import { CalendarHeaderButton } from "@/components/calendar/calendar-header-button";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useUserSession } from "@/hooks/use-user-session";
import { useOnboardingProgress } from "@/hooks/use-onboarding-progress";
import { Av } from "@/components/ui/ds";
import { cn } from "@/lib/utils";

const Moon = hgIcon(Moon02Icon);
const Sun = hgIcon(Sun01Icon);
const Lang = hgIcon(LanguageSkillIcon);
const IcoUser = hgIcon(UserCircleIcon);
const IcoStore = hgIcon(Store01Icon);
const IcoSettings = hgIcon(Settings01Icon);
const IcoDashboard = hgIcon(DashboardSquare03Icon);
const IcoChevDown = hgIcon(ArrowDown01Icon);
const IcoLogout = hgIcon(Logout01Icon);

const LOCALE_LABELS: Record<string, string> = {
  es: "Español", en: "English", pt: "Português", fr: "Français", it: "Italiano",
};

// Route prefix → translation key (longest prefix wins)
const PAGE_TITLE_KEYS: [string, string][] = [
  ["/dashboard/products",               "pages.products"],
  ["/dashboard/events",                 "pages.events"],
  ["/dashboard/contacts",               "pages.contacts"],
  ["/dashboard/tasks",                  "pages.tasks"],
  ["/dashboard/calendar",               "pages.calendar"],
  ["/dashboard/finance/quotes",         "pages.quotes"],
  ["/dashboard/finance/invoices",       "pages.invoices"],
  ["/dashboard/finance/credit-notes",   "pages.creditNotes"],
  ["/dashboard/finance/delivery-notes", "pages.deliveryNotes"],
  ["/dashboard/finance/payments",       "pages.payments"],
  ["/dashboard/finance/settings",       "pages.financeSettings"],
  ["/dashboard/finance",                "pages.finance"],
  ["/dashboard/providers",              "pages.providers"],
  ["/dashboard/partners",               "pages.partners"],
  ["/dashboard/settings",               "pages.settings"],
  ["/dashboard/team",                   "pages.team"],
  ["/dashboard/crm",                    "pages.crm"],
  ["/dashboard/logistics/orders",       "pages.orders"],
  ["/dashboard/logistics",              "pages.logistics"],
  ["/dashboard/venues",                 "pages.venues"],
  ["/dashboard/audiovisual",            "pages.audiovisual"],
  ["/dashboard/public-profile",         "pages.publicProfile"],
  ["/dashboard/ai",                     "pages.ai"],
];

type Theme = "sand" | "mono" | "forest" | "dark";
type Density = "comfortable" | "compact";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (theme === "sand") { html.removeAttribute("data-theme"); html.classList.remove("dark"); }
  else if (theme === "dark") { html.classList.add("dark"); html.removeAttribute("data-theme"); }
  else { html.classList.remove("dark"); html.setAttribute("data-theme", theme); }
  try { localStorage.setItem("hubents:theme", theme); } catch {}
}

function applyDensity(d: Density) {
  if (typeof document === "undefined") return;
  if (d === "compact") document.documentElement.setAttribute("data-density", "compact");
  else document.documentElement.removeAttribute("data-density");
  try { localStorage.setItem("hubents:density", d); } catch {}
}

function OnboardingRing({ pct, size = 36 }: { pct: number; size?: number }) {
  if (pct >= 100) return null;
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-1)" strokeWidth="2.5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="#F59E0B" strokeWidth="2.5"
        strokeDasharray={circ} strokeDashoffset={circ - dash}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .5s ease" }} />
    </svg>
  );
}

function HeaderUserChip() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const { data: session } = useSession();
  useUserSession();
  const onboarding = useOnboardingProgress();
  const tMenu = useTranslations("userMenu");
  const [open, setOpen] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("sand");
  const [density, setDensity] = useState<Density>("comfortable");
  const ref = useRef<HTMLDivElement>(null);

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

  const name = session?.user?.name || tMenu("userFallback");
  const firstName = name.split(" ").filter(Boolean)[0] || name;
  const email = session?.user?.email || "";
  const userImage = (session?.user as { image?: string | null })?.image;
  const obPct = onboarding?.pct ?? 100;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 rounded-[10px] px-2 py-1.5 transition-colors",
          open ? "bg-[var(--bg-subtle)]" : "hover:bg-[var(--bg-hover)]"
        )}
      >
        <div className="relative flex-shrink-0" style={{ width: 28, height: 28 }}>
          <OnboardingRing pct={obPct} size={28} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="overflow-hidden rounded-full" style={{ width: 22, height: 22 }}>
              <Av src={userImage} name={name} size={22} />
            </div>
          </div>
        </div>
        <span className="text-[13px] font-semibold text-[var(--ink-1)]">{firstName}</span>
        <IcoChevDown className={cn("h-[13px] w-[13px] text-[var(--ink-3)] transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          style={{ backgroundColor: "#FFFFFF", borderColor: "#E8E3D8", zIndex: 9999 }}
          className="absolute right-0 top-[calc(100%+8px)] w-[220px] rounded-[12px] border p-1 shadow-[0_8px_28px_rgba(0,0,0,.12),0_2px_6px_rgba(0,0,0,.05)]"
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
            {tMenu("profile")}
          </button>
          <button
            onClick={() => setLangOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[12.5px] font-medium text-[var(--ink-1)] hover:bg-[var(--bg-subtle)]"
          >
            <span className="flex items-center gap-2.5">
              <Lang className="h-4 w-4 text-[var(--ink-2)]" />
              {LOCALE_LABELS[locale] ?? locale.toUpperCase()}
            </span>
            <IcoChevDown className={cn("h-3 w-3 text-[var(--ink-3)] transition-transform", langOpen && "rotate-180")} />
          </button>
          {langOpen && (
            <div className="mx-1.5 mb-1 mt-0.5 flex flex-col gap-0.5 rounded-[10px] bg-[var(--bg-subtle)] p-1.5">
              {(["es", "en", "pt", "fr", "it"] as const).map((loc) => (
                <button
                  key={loc}
                  onClick={() => { setLangOpen(false); setOpen(false); router.replace(pathname, { locale: loc }); }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-left text-[12.5px] font-medium transition-colors",
                    locale === loc
                      ? "bg-[var(--ink-1)] text-white"
                      : "text-[var(--ink-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink-1)]"
                  )}
                >
                  {LOCALE_LABELS[loc]}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => { setOpen(false); router.push("/dashboard/settings"); }}
            className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[12.5px] font-medium text-[var(--ink-1)] hover:bg-[var(--bg-subtle)]"
          >
            <IcoSettings className="h-4 w-4 text-[var(--ink-2)]" />
            {tMenu("preferences")}
          </button>
          <div className="my-1 mx-1 h-px bg-[var(--line-1)]" />
          <button
            onClick={() => setTweaksOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[12.5px] font-medium text-[var(--ink-1)] hover:bg-[var(--bg-subtle)]"
          >
            <span className="flex items-center gap-2.5">
              <IcoDashboard className="h-4 w-4 text-[var(--ink-2)]" />
              {tMenu("tweaks")}
            </span>
            <IcoChevDown className={cn("h-3 w-3 text-[var(--ink-3)] transition-transform", tweaksOpen && "rotate-180")} />
          </button>
          {tweaksOpen && (
            <div className="mx-1.5 mb-1 mt-0.5 flex flex-col gap-3 rounded-[10px] bg-[var(--bg-subtle)] p-2.5">
              <div>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[.08em] text-[var(--ink-4)]">
                  {tMenu("theme")}
                </div>
                <div className="flex flex-wrap gap-1">
                  {(["sand", "mono", "forest", "dark"] as const).map((v) => {
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
                        {tMenu(`themes.${v}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[.08em] text-[var(--ink-4)]">
                  {tMenu("density")}
                </div>
                <div className="flex gap-1">
                  {(["comfortable", "compact"] as const).map((v) => {
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
                        {tMenu(`densities.${v}`)}
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
            {tMenu("signOut")}
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const [isDark, setIsDark] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const t = useTranslations("header");

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const isHome = pathname === "/dashboard";
  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? "greeting.morning" : hour < 20 ? "greeting.afternoon" : "greeting.evening";
  const firstName = session?.user?.name?.split(" ").filter(Boolean)[0] || "";
  const greetingPrefix = t(greetingKey);
  const greeting = firstName ? `${greetingPrefix}, ${firstName}` : greetingPrefix;

  const getPageTitle = (): string => {
    const match = PAGE_TITLE_KEYS.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + "/"));
    return match ? t(match[1]) : "";
  };

  const title = isHome ? greeting : getPageTitle();

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between"
      style={{
        padding: "22px 34px 14px",
        gap: "14px",
        background: "var(--bg-app)",
      }}
    >
      <h1
        className="text-[22px] font-semibold text-[var(--ink-1)] truncate m-0"
        style={{ letterSpacing: "-0.015em" }}
      >
        {title}
      </h1>

      <div className="flex items-center gap-2">
        <CalendarHeaderButton />
        <AIHeaderButton />
        <span className="w-px h-5 bg-[var(--line-1)]" />
        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Cambiar tema">
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <NotificationCenter />
        <span className="w-px h-5 bg-[var(--line-1)]" />
        <HeaderUserChip />
      </div>
    </header>
  );
}
