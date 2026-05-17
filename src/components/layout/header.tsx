"use client";

import { hgIcon } from "@/components/ui/hg-icon";
import { Moon02Icon, Sun01Icon } from "@hugeicons/core-free-icons";
import { AIHeaderButton } from "@/components/ai/ai-header-button";
import { CalendarHeaderButton } from "@/components/calendar/calendar-header-button";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

const Moon = hgIcon(Moon02Icon);
const Sun = hgIcon(Sun01Icon);

// Título por ruta. Las rutas dinámicas usan el prefijo más largo que coincida.
const PAGE_TITLES: [string, string][] = [
  ["/dashboard/products",              "Catálogo de productos"],
  ["/dashboard/events",                "Eventos"],
  ["/dashboard/contacts",              "Contactos"],
  ["/dashboard/tasks",                 "Tareas"],
  ["/dashboard/calendar",              "Calendario"],
  ["/dashboard/finance/quotes",        "Presupuestos"],
  ["/dashboard/finance/invoices",      "Facturas"],
  ["/dashboard/finance/credit-notes",  "Rectificativas"],
  ["/dashboard/finance/delivery-notes","Albaranes"],
  ["/dashboard/finance/payments",      "Pagos"],
  ["/dashboard/finance/settings",      "Configuración de finanzas"],
  ["/dashboard/finance",               "Finanzas"],
  ["/dashboard/providers",             "Proveedores"],
  ["/dashboard/partners",              "Partners"],
  ["/dashboard/settings",              "Configuración"],
  ["/dashboard/team",                  "Equipo"],
  ["/dashboard/crm",                   "CRM"],
  ["/dashboard/logistics/orders",      "Órdenes"],
  ["/dashboard/logistics",             "Logística"],
  ["/dashboard/venues",                "Venues"],
  ["/dashboard/audiovisual",           "Audiovisual"],
  ["/dashboard/public-profile",        "Perfil público"],
  ["/dashboard/ai",                    "HubIA"],
];

function getPageTitle(pathname: string): string | null {
  const match = PAGE_TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + "/"));
  return match ? match[1] : null;
}

export function Header() {
  const [isDark, setIsDark] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const isHome = pathname === "/dashboard";
  const hour = new Date().getHours();
  const greetingPrefix = hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const firstName = session?.user?.name?.split(" ").filter(Boolean)[0] || "";
  const greeting = firstName ? `${greetingPrefix}, ${firstName}` : greetingPrefix;

  const title = isHome ? greeting : (getPageTitle(pathname) ?? "");

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
      </div>
    </header>
  );
}
