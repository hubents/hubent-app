"use client";

import Link from "next/link";
import Image from "next/image";
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
} from "@remixicon/react";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: RiDashboardLine },
  { name: "Eventos", href: "/dashboard/events", icon: RiCalendarEventLine },
  { name: "Contactos", href: "/dashboard/contacts", icon: RiContactsBookLine },
  { name: "CRM", href: "/dashboard/crm", icon: RiUserLine },
  { name: "Proveedores", href: "/dashboard/vendors", icon: RiStore2Line },
  { name: "Tareas", href: "/dashboard/tasks", icon: RiFileListLine },
  { name: "Pagos", href: "/dashboard/payments", icon: RiMoneyDollarCircleLine },
  { name: "Equipo", href: "/dashboard/team", icon: RiTeamLine },
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
  
  // Auto-collapse when in event view on desktop
  const isCollapsed = collapsed || isEventView;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-[var(--border)] bg-[var(--card)] transition-all duration-300 hidden md:block",
          isCollapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className={cn(
            "flex h-16 items-center border-b border-[var(--border)] transition-all duration-300",
            isCollapsed ? "justify-center px-2" : "gap-3 px-6"
          )}>
            <Image
              src="/images/icon.png"
              alt="HubEnts"
              width={32}
              height={32}
              className="rounded-lg flex-shrink-0"
            />
            {!isCollapsed && <span className="text-xl font-bold">hubents</span>}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
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
        </div>
      </aside>
    </TooltipProvider>
  );
}
