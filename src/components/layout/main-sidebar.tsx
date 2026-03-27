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
  RiToolsLine,
  RiCalendar2Line,
  RiFolder3Line,
  RiSurveyLine,
  RiBuilding2Line,
  RiGroupLine,
} from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo } from "react";
import { useUserSession } from "@/hooks/use-user-session";
import { getSidebarSections } from "@/lib/tenant-type";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navigationDashboard = [
  { name: "Dashboard", href: "/dashboard", icon: RiDashboardLine, permission: null },
];

const navigationProviderProfile = [
  { name: "Mi Perfil Público", href: "/dashboard/public-profile", icon: RiStoreLine, permission: null as string | null },
];

const navigationAfterContacts = [
  { name: "Eventos", href: "/dashboard/events", icon: RiCalendarEventLine, permission: "events:read" },
  { name: "CRM", href: "/dashboard/crm", icon: RiUserLine, permission: "crm:read" },
];

const contactsSubNav = [
  { name: "Todos", href: "/dashboard/contacts", icon: RiGroupLine },
  { name: "Personas", href: "/dashboard/contacts?segment=persons", icon: RiUserLine },
  { name: "Empresas", href: "/dashboard/contacts?segment=companies", icon: RiBuilding2Line },
];

const navigationMarketplace = [
  { name: "Marketplace", href: "/dashboard/marketplace", icon: RiStore2Line, permission: null as string | null },
];


const productivitySubNav = [
  { name: "Calendario", href: "/dashboard/calendar", icon: RiCalendar2Line },
  { name: "Tareas", href: "/dashboard/tasks", icon: RiFileListLine },
  { name: "Formularios", href: "/dashboard/forms", icon: RiSurveyLine },
  { name: "Documentos", href: "/dashboard/documents", icon: RiFolder3Line, comingSoon: true },
];

const navigationAfterProductivity = [
  { name: "Equipo", href: "/dashboard/team", icon: RiTeamLine, permission: "team:read" },
  { name: "HubIA", href: "/dashboard/ai", icon: RiSparklingLine, permission: null },
];

const financeSubNav = [
  { name: "Dashboard", href: "/dashboard/finance", icon: RiDashboardLine },
  { name: "Presupuestos", href: "/dashboard/finance/quotes", icon: RiFileTextLine },
  { name: "Facturas", href: "/dashboard/finance/invoices", icon: RiFileList2Line },
  { name: "Albaranes", href: "/dashboard/finance/delivery-notes", icon: RiTruckLine },
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

  const filteredMarketplace = useMemo(() => {
    if (eventScoped) return [];
    const items = [
      ...(hasSection("marketplace") ? navigationMarketplace : []),
      ...(hasSection("public-profile") ? navigationProviderProfile : []),
    ];
    return items.filter((item) => !item.permission || can(item.permission));
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
      if (item.name === "Equipo" && !hasSection("team")) return false;
      if (item.name === "HubIA" && !hasSection("ai")) return false;
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

            {/* Marketplace HubEnts (after Dashboard, before Contacts) */}
            {filteredMarketplace.map((item) => {
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

            {/* Contactos Menu with Submenu (right after Marketplace) */}
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

            {/* Productividad Menu with Submenu */}
            {!eventScoped && hasSection("productivity") && (isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/dashboard/calendar"
                    className={cn(
                      "flex items-center justify-center rounded-[var(--radius)] p-3 transition-colors",
                      isProductivityPage
                        ? "bg-[var(--primary)] text-white"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                    )}
                  >
                    <RiToolsLine className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Productividad
                </TooltipContent>
              </Tooltip>
            ) : (
              <div>
                <button
                  onClick={() => setProductivityExpanded(!productivityExpanded)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium transition-colors",
                    isProductivityPage
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <RiToolsLine className="h-5 w-5" />
                    Productividad
                  </div>
                  <RiArrowDownSLine 
                    className={cn(
                      "h-4 w-4 transition-transform",
                      productivityExpanded && "rotate-180"
                    )} 
                  />
                </button>
                
                {productivityExpanded && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
                    {productivitySubNav.map((subItem) => {
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
                              Próx.
                            </Badge>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Items after Productividad: Equipo + HubIA */}
            {filteredNavAfterProductivity.map((item) => {
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
          </nav>

          {/* Bottom Navigation */}
          <div className="border-t border-[var(--border)] px-2 py-4">
            {!eventScoped && bottomNavigation.map((item) => {
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
