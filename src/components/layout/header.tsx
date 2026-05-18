"use client";

import { hgIcon } from "@/components/ui/hg-icon";
import { Moon02Icon, Sun01Icon, LanguageSkillIcon } from "@hugeicons/core-free-icons";
import { AIHeaderButton } from "@/components/ai/ai-header-button";
import { CalendarHeaderButton } from "@/components/calendar/calendar-header-button";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

const Moon = hgIcon(Moon02Icon);
const Sun = hgIcon(Sun01Icon);
const Lang = hgIcon(LanguageSkillIcon);

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

export function Header() {
  const [isDark, setIsDark] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("header");

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const switchLocale = () => {
    const cycle: Record<string, string> = { es: "en", en: "pt", pt: "fr", fr: "it", it: "es" };
    router.replace(pathname, { locale: cycle[locale] ?? "es" });
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
        <Button variant="ghost" size="icon" onClick={switchLocale} title={{ es: "Switch to English", en: "Mudar para Português", pt: "Passer au Français", fr: "Passa all'Italiano", it: "Cambiar a Español" }[locale] ?? "Switch language"}>
          <Lang className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Cambiar tema">
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <NotificationCenter />
      </div>
    </header>
  );
}
