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
  RiStoreLine,
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
  RiMore2Line,
  RiCalendar2Line,
  RiFolder3Line,
  RiSurveyLine,
  RiRestaurantLine,
  RiBuilding2Line,
  RiGroupLine,
} from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo } from "react";
import { useUserSession } from "@/hooks/use-user-session";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navigationBeforeFinance = [
  { name: "Dashboard", href: "/dashboard", icon: RiDashboardLine, permission: null },
  { name: "Calendario", href: "/dashboard/calendar", icon: RiCalendar2Line, permission: null },
  { name: "Eventos", href: "/dashboard/events", icon: RiCalendarEventLine, permission: "events:read" },
  // Contactos is now a submenu, handled separately
  { name: "CRM", href: "/dashboard/crm", icon: RiUserLine, permission: "crm:read" },
  { name: "Tareas", href: "/dashboard/tasks", icon: RiFileListLine, permission: "tasks:read" },
];

const contactsSubNav = [
  { name: "Todos", href: "/dashboard/contacts", icon: RiGroupLine },
  { name: "Personas", href: "/dashboard/contacts?segment=persons", icon: RiUserLine },
  { name: "Empresas", href: "/dashboard/contacts?segment=companies", icon: RiBuilding2Line },
  { name: "Proveedores", href: "/dashboard/contacts?segment=vendors", icon: RiStore2Line },
];

const navigationAfterFinance = [
  { name: "Proveedores", href: "/dashboard/providers", icon: RiStoreLine, permission: "vendors:read" },
  { name: "Equipo", href: "/dashboard/team", icon: RiTeamLine, permission: "team:read" },
  { name: "Enti IA", href: "/dashboard/ai", icon: RiSparklingLine, permission: null },
];

const moreSubNav = [
  { name: "Menús", href: "/dashboard/menus", icon: RiRestaurantLine, comingSoon: true },
  { name: "Documentos", href: "/dashboard/documents", icon: RiFolder3Line, comingSoon: true },
  { name: "Formularios", href: "/dashboard/forms", icon: RiSurveyLine, comingSoon: true },
];

const financeSubNav = [
  { name: "Panel de Control", href: "/dashboard/finance", icon: RiDashboardLine },
  { name: "Presupuestos", href: "/dashboard/finance/quotes", icon: RiFileTextLine },
  { name: "Proformas", href: "/dashboard/finance/proformas", icon: RiFileTextLine },
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
  const { can, loading: sessionLoading } = useUserSession();
  const [financeExpanded, setFinanceExpanded] = useState(false);
  const [moreExpanded, setMoreExpanded] = useState(false);
  const [contactsExpanded, setContactsExpanded] = useState(false);

  const filteredNavBefore = useMemo(() => 
    navigationBeforeFinance.filter((item) => !item.permission || can(item.permission)),
    [can]
  );
  const filteredNavAfter = useMemo(() =>
    navigationAfterFinance.filter((item) => !item.permission || can(item.permission)),
    [can]
  );
  const showFinance = useMemo(() => can("finance:read"), [can]);
  const showContacts = useMemo(() => can("crm:read"), [can]);
  
  // Auto-expand menus based on current page
  const isFinancePage = pathname.startsWith("/dashboard/finance");
  const isContactsPage = pathname.startsWith("/dashboard/contacts");
  const isMorePage = pathname.startsWith("/dashboard/calendar") || 
                     pathname.startsWith("/dashboard/menus") ||
                     pathname.startsWith("/dashboard/documents") || 
                     pathname.startsWith("/dashboard/forms");
  
  useEffect(() => {
    if (isFinancePage) {
      setFinanceExpanded(true);
    }
    if (isContactsPage) {
      setContactsExpanded(true);
    }
    if (isMorePage) {
      setMoreExpanded(true);
    }
  }, [isFinancePage, isContactsPage, isMorePage]);
  
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
            {filteredNavBefore.map((item) => {
              const isActive = item.href === "/dashboard" 
                ? pathname === item.href 
                : pathname === item.href || pathname.startsWith(item.href + "/");
              
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

            {/* Contactos Menu with Submenu */}
            {showContacts && (isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/dashboard/contacts"
                    className={cn(
                      "flex items-center justify-center rounded-[var(--radius)] p-3 transition-colors",
                      isContactsPage
                        ? "bg-[var(--primary)] text-white"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                    )}
                  >
                    <RiContactsBookLine className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Contactos
                </TooltipContent>
              </Tooltip>
            ) : (
              <div>
                <button
                  onClick={() => setContactsExpanded(!contactsExpanded)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium transition-colors",
                    isContactsPage
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <RiContactsBookLine className="h-5 w-5" />
                    Contactos
                  </div>
                  <RiArrowDownSLine 
                    className={cn(
                      "h-4 w-4 transition-transform",
                      contactsExpanded && "rotate-180"
                    )} 
                  />
                </button>
                
                {contactsExpanded && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-[var(--border)] pl-3">
                    {contactsSubNav.map((subItem) => {
                      const isSubActive = pathname === subItem.href || 
                        (pathname === "/dashboard/contacts" && subItem.href === "/dashboard/contacts") ||
                        (pathname.includes(subItem.href) && subItem.href !== "/dashboard/contacts");
                      
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
            ))}

            {/* Finance Menu with Submenu */}
            {showFinance && (isCollapsed ? (
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
            ))}

            {/* More Menu with Submenu */}
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/dashboard/calendar"
                    className={cn(
                      "flex items-center justify-center rounded-[var(--radius)] p-3 transition-colors",
                      isMorePage
                        ? "bg-[var(--primary)] text-white"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                    )}
                  >
                    <RiMore2Line className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Más
                </TooltipContent>
              </Tooltip>
            ) : (
              <div>
                <button
                  onClick={() => setMoreExpanded(!moreExpanded)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium transition-colors",
                    isMorePage
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <RiMore2Line className="h-5 w-5" />
                    Más
                  </div>
                  <RiArrowDownSLine 
                    className={cn(
                      "h-4 w-4 transition-transform",
                      moreExpanded && "rotate-180"
                    )} 
                  />
                </button>
                
                {moreExpanded && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-[var(--border)] pl-3">
                    {moreSubNav.map((subItem) => {
                      const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href + "/");
                      
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
                          <span className="flex-1">{subItem.name}</span>
                          {subItem.comingSoon && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              Soon
                            </Badge>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Items after Finance */}
            {filteredNavAfter.map((item) => {
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
