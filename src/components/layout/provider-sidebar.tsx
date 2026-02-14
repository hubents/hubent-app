"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUserSession } from "@/hooks/use-user-session";
import {
  RiDashboardLine,
  RiCalendarEventLine,
  RiFileListLine,
  RiSettings4Line,
  RiMoneyDollarCircleLine,
  RiContactsBookLine,
  RiUserLine,
  RiSparklingLine,
  RiArrowDownSLine,
  RiFileTextLine,
  RiFileList2Line,
  RiTruckLine,
  RiBankLine,
  RiTeamLine,
  RiProfileLine,
} from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo } from "react";

const mainNav = [
  { name: "Dashboard", href: "/vendor", icon: RiDashboardLine, permission: null },
  { name: "Eventos", href: "/vendor/events", icon: RiCalendarEventLine, permission: null },
  { name: "Tareas", href: "/vendor/tasks", icon: RiFileListLine, permission: null },
];

const financeSubNav: typeof mainNav = [];

const bottomNav = [
  { name: "Mi Perfil", href: "/vendor/profile", icon: RiProfileLine, permission: null },
  { name: "Equipo", href: "/vendor/team", icon: RiTeamLine, permission: null },
  { name: "Configuración", href: "/vendor/settings", icon: RiSettings4Line, permission: null },
];

export function ProviderSidebar() {
  const pathname = usePathname();
  const { can } = useUserSession();
  const [financeExpanded, setFinanceExpanded] = useState(false);

  const filteredMainNav = useMemo(() =>
    mainNav.filter((item) => !item.permission || can(item.permission)),
    [can]
  );
  const filteredBottomNav = useMemo(() =>
    bottomNav.filter((item) => !item.permission || can(item.permission)),
    [can]
  );
  const showFinance = useMemo(() => can("finance:read"), [can]);

  const isFinancePage = pathname.startsWith("/vendor/finance");

  useEffect(() => {
    if (isFinancePage) setFinanceExpanded(true);
  }, [isFinancePage]);

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[260px] border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] hidden md:block">
      <div className="flex h-full flex-col">
        {/* Logo + Badge */}
        <div className="flex h-16 items-center gap-3 border-b border-[var(--border)] px-6">
          <Image
            src="/images/isotipo-dark.png"
            alt="HubEnts"
            width={32}
            height={32}
          />
          <span className="text-xl font-bold">hubents</span>
          <Badge variant="secondary" className="text-[10px] ml-auto">
            Proveedor
          </Badge>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
          {filteredMainNav.map((item) => {
            const isActive = item.href === "/vendor"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}

          {/* Finance Submenu */}
          {showFinance && (
            <div>
              <button
                onClick={() => setFinanceExpanded(!financeExpanded)}
                className={cn(
                  "flex w-full items-center justify-between rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium transition-colors",
                  isFinancePage
                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                <div className="flex items-center gap-3">
                  <RiBankLine className="h-5 w-5" />
                  Finanzas
                </div>
                <RiArrowDownSLine
                  className={cn(
                    "h-4 w-4 transition-transform",
                    financeExpanded && "rotate-180"
                  )}
                />
              </button>

              {financeExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l border-[var(--border)] pl-3">
                  {financeSubNav.map((subItem) => {
                    const isSubActive = pathname === subItem.href ||
                      (subItem.href !== "/vendor/finance" && pathname.startsWith(subItem.href));

                    return (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className={cn(
                          "flex items-center gap-2 rounded-[var(--radius)] px-2 py-2 text-sm transition-colors",
                          isSubActive
                            ? "bg-[var(--primary)] text-white"
                            : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                        )}
                      >
                        <subItem.icon className="h-4 w-4" />
                        {subItem.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Bottom Nav */}
        <div className="border-t border-[var(--border)] px-2 py-4 space-y-1">
          {filteredBottomNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
