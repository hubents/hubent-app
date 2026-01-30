"use client";

import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/ui/logo";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEvent } from "@/contexts/event-context";
import {
  RiDashboardLine,
  RiCalendarEventLine,
  RiUserLine,
  RiStore2Line,
  RiFileListLine,
  RiSettings4Line,
  RiTeamLine,
  RiMoneyDollarCircleLine,
  RiContactsBookLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiSparklingLine,
  RiArrowDownSLine,
  RiFileTextLine,
  RiFileList2Line,
  RiTruckLine,
  RiBankLine,
} from "@remixicon/react";
import { useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navigationBeforeFinance = [
  { name: "Dashboard", href: "/dashboard", icon: RiDashboardLine },
  { name: "Eventos", href: "/dashboard/events", icon: RiCalendarEventLine },
  { name: "Contactos", href: "/dashboard/contacts", icon: RiContactsBookLine },
  { name: "CRM", href: "/dashboard/crm", icon: RiUserLine },
  { name: "Proveedores", href: "/dashboard/vendors", icon: RiStore2Line },
  { name: "Tareas", href: "/dashboard/tasks", icon: RiFileListLine },
];

const navigationAfterFinance = [
  { name: "Equipo", href: "/dashboard/team", icon: RiTeamLine },
  { name: "Enti IA", href: "/dashboard/ai", icon: RiSparklingLine },
];

const financeSubNav = [
  { name: "Panel de Control", href: "/dashboard/finance", icon: RiDashboardLine },
  { name: "Presupuestos", href: "/dashboard/finance/quotes", icon: RiFileTextLine },
  { name: "Albaranes", href: "/dashboard/finance/delivery-notes", icon: RiTruckLine },
  { name: "Facturas", href: "/dashboard/finance/invoices", icon: RiFileList2Line },
  { name: "Pagos", href: "/dashboard/finance/payments", icon: RiMoneyDollarCircleLine },
  { name: "Configuración", href: "/dashboard/finance/settings", icon: RiSettings4Line },
];

const bottomNavigation = [
  { name: "Configuración", href: "/dashboard/settings", icon: RiSettings4Line },
];

interface MainSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function MainSidebar({ collapsed = false, onToggle }: MainSidebarProps) {
  const pathname = usePathname();
  const { isEventView } = useEvent();
  const [financeExpanded, setFinanceExpanded] = useState(false);
  
  // Auto-expand finance menu if we're on a finance page
  const isFinancePage = pathname.startsWith("/dashboard/finance");
  
  useEffect(() => {
    if (isFinancePage) {
      setFinanceExpanded(true);
    }
  }, [isFinancePage]);
  
  // Auto-collapse when in event view on desktop
  const isCollapsed = collapsed || isEventView;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] transition-all duration-300 hidden md:block",
          isCollapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className={cn(
            "flex h-16 items-center border-b border-[var(--border)] transition-all duration-300",
            isCollapsed ? "justify-center px-2" : "gap-3 px-6"
          )}>
            {isCollapsed ? (
              <Image
                src="/images/isotipo-dark.png"
                alt="HubEnts"
                width={32}
                height={32}
                className="flex-shrink-0"
              />
            ) : (
              <Logo variant="full" size="md" theme="light" />
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
            {/* Items before Finance */}
            {navigationBeforeFinance.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              
              if (isCollapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center justify-center rounded-[var(--radius)] p-3 transition-colors",
                          isActive
                            ? "bg-[var(--primary)] text-white"
                            : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
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

            {/* Finance Menu with Submenu */}
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/dashboard/finance"
                    className={cn(
                      "flex items-center justify-center rounded-[var(--radius)] p-3 transition-colors",
                      isFinancePage
                        ? "bg-[var(--primary)] text-white"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                    )}
                  >
                    <RiBankLine className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Finanzas
                </TooltipContent>
              </Tooltip>
            ) : (
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
                        (subItem.href !== "/dashboard/finance" && pathname.startsWith(subItem.href));
                      
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

            {/* Items after Finance */}
            {navigationAfterFinance.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              
              if (isCollapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center justify-center rounded-lg p-3 transition-colors",
                          isActive
                            ? "bg-primary text-white"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
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
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Navigation */}
          <div className="border-t border-[var(--border)] px-2 py-4">
            {bottomNavigation.map((item) => {
              const isActive = pathname === item.href;
              
              if (isCollapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center justify-center rounded-[var(--radius)] p-3 transition-colors",
                          isActive
                            ? "bg-[var(--primary)] text-white"
                            : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
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

            {/* Toggle Button */}
            {onToggle && !isEventView && (
              <button
                onClick={onToggle}
                className="mt-2 flex w-full items-center justify-center rounded-[var(--radius)] p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                {isCollapsed ? (
                  <RiArrowRightSLine className="h-5 w-5" />
                ) : (
                  <RiArrowLeftSLine className="h-5 w-5" />
                )}
              </button>
            )}
          </div>

          {/* Powered by NapsixAI */}
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
        </div>
      </aside>
    </TooltipProvider>
  );
}
