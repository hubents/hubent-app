"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEvent } from "@/contexts/event-context";
import {
  RiDashboardLine,
  RiFileListLine,
  RiGroupLine,
  RiMailSendLine,
  RiStore2Line,
  RiMoneyDollarCircleLine,
  RiSettings4Line,
  RiArrowLeftLine,
  RiCalendarEventLine,
  RiCalendarLine,
  RiLockLine,
  RiArrowDownSLine,
  RiFileTextLine,
  RiFileList2Line,
  RiListOrdered2,
} from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import { useUserSessionContext } from "@/contexts/user-session-context";

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-gray-100 text-gray-700" },
  confirmed: { label: "Confirmado", color: "bg-green-100 text-green-700" },
  in_progress: { label: "En progreso", color: "bg-yellow-100 text-yellow-700" },
  completed: { label: "Completado", color: "bg-blue-100 text-blue-700" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700" },
};

// Map sidebar items to event permission section keys
const SECTION_MAP: Record<string, string> = {
  "General": "general",
  "Cronograma": "general",
  "Tareas": "tasks",
  "Lista de Invitados": "guests",
  "RSVP": "rsvp",
  "Proveedores": "vendors",
  "Finanzas": "finances",
  "Orden del día": "general",
  "Configuración": "settings",
};

export function EventSidebar() {
  const pathname = usePathname();
  const { activeEvent, setActiveEvent } = useEvent();
  const { eventScoped } = useUserSessionContext();
  const [eventPermissions, setEventPermissions] = useState<Record<string, string> | null>(null);
  const [financeExpanded, setFinanceExpanded] = useState(false);

  const eventId = activeEvent?.id;

  // Fetch event permissions for eventScoped users
  useEffect(() => {
    if (!eventScoped || !eventId) {
      setEventPermissions(null);
      return;
    }
    async function fetchPermissions() {
      try {
        const res = await fetch(`/api/events/${eventId}/collaborators/me`);
        const data = await res.json();
        if (data.success && data.data?.permissions) {
          setEventPermissions(data.data.permissions);
        }
      } catch {
        // Non-scoped users won't need this
      }
    }
    fetchPermissions();
  }, [eventScoped, eventId]);

  const isFinancePage = activeEvent
    ? pathname.startsWith(`/dashboard/events/${activeEvent.id}/finances`)
    : false;

  useEffect(() => {
    if (isFinancePage) setFinanceExpanded(true);
  }, [isFinancePage]);

  if (!activeEvent) return null;

  const basePath = `/dashboard/events/${activeEvent.id}`;

  const allNavigation = [
    { name: "General", href: basePath, icon: RiDashboardLine, exact: true },
    { name: "Cronograma", href: `${basePath}/schedule`, icon: RiCalendarLine },
    { name: "Tareas", href: `${basePath}/tasks`, icon: RiFileListLine },
    { name: "Lista de Invitados", href: `${basePath}/guests`, icon: RiGroupLine },
    { name: "RSVP", href: `${basePath}/rsvp`, icon: RiMailSendLine },
    { name: "Proveedores", href: `${basePath}/vendors`, icon: RiStore2Line },
    { name: "Finanzas", href: `${basePath}/finances`, icon: RiMoneyDollarCircleLine, hasSubmenu: true },
    { name: "Orden del día", href: `${basePath}/run-sheet`, icon: RiListOrdered2 },
    { name: "Configuración", href: `${basePath}/settings`, icon: RiSettings4Line },
  ];

  // Filter navigation based on event permissions for scoped users
  // If eventScoped but permissions haven't loaded yet, show nothing (loading state)
  const navigation = eventScoped
    ? eventPermissions
      ? allNavigation.filter((item) => {
          const section = SECTION_MAP[item.name];
          if (!section) return true;
          return eventPermissions[section] !== "none";
        })
      : [] // eventScoped but permissions not yet loaded — hide all until loaded
    : allNavigation;

  const financeSubNav = [
    { name: "Presupuestos", href: `${basePath}/finances/quotes`, icon: RiFileTextLine },
    { name: "Facturas", href: `${basePath}/finances/invoices`, icon: RiFileList2Line },
    { name: "Pagos", href: `${basePath}/finances/payments`, icon: RiMoneyDollarCircleLine },
  ];

  const status = statusMap[activeEvent.status] || statusMap.draft;

  const handleBackToEvents = () => {
    setActiveEvent(null);
  };

  return (
    <aside className="fixed left-[72px] top-0 z-30 h-screen w-[200px] border-r border-[var(--border)] bg-[var(--card)] hidden md:block">
      <div className="flex h-full flex-col">
        {/* Event Header */}
        <div className="border-b border-[var(--border)] p-4">
          <button
            onClick={handleBackToEvents}
            className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-3"
          >
            <RiArrowLeftLine className="h-4 w-4" />
            <span>Eventos</span>
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
              <RiCalendarEventLine className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{activeEvent.name}</h3>
            </div>
          </div>
          
          <span className={cn("inline-block px-2 py-0.5 rounded text-xs font-medium", status.color)}>
            {status.label}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
          {navigation.map((item) => {
            if (item.hasSubmenu) {
              return (
                <div key={item.name}>
                  <button
                    onClick={() => setFinanceExpanded(!financeExpanded)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition-colors",
                      isFinancePage
                        ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {item.name}
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
                        const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href + "/");
                        return (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            className={cn(
                              "flex items-center gap-2 rounded-[var(--radius)] px-2 py-1.5 text-sm transition-colors",
                              isSubActive
                                ? "bg-[var(--primary)] text-white"
                                : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                            )}
                          >
                            <subItem.icon className="h-3.5 w-3.5" />
                            {subItem.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = item.exact 
              ? pathname === item.href 
              : pathname === item.href || pathname.startsWith(item.href + "/");
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Event Quick Info */}
        <div className="border-t border-[var(--border)] p-4 text-xs text-[var(--muted-foreground)]">
          {activeEvent.date && (
            <p className="mb-1">
              📅 {new Date(activeEvent.date).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
          {activeEvent.location && (
            <p className="truncate">📍 {activeEvent.location}</p>
          )}
        </div>
      </div>
    </aside>
  );
}
