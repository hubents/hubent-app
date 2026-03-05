"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  RiDashboardLine,
  RiCalendarEventLine,
  RiCalendar2Line,
  RiFileListLine,
  RiSettings4Line,
  RiMoreLine,
  RiMoneyDollarCircleLine,
  RiProfileLine,
  RiTeamLine,
} from "@remixicon/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mainNav = [
  { name: "Dashboard", href: "/vendor", icon: RiDashboardLine, exact: true },
  { name: "Calendario", href: "/vendor/calendar", icon: RiCalendar2Line },
  { name: "Eventos", href: "/vendor/events", icon: RiCalendarEventLine },
  { name: "Tareas", href: "/vendor/tasks", icon: RiFileListLine },
];

const moreItems = [
  { name: "Mi Perfil", href: "/vendor/profile", icon: RiProfileLine },
  { name: "Equipo", href: "/vendor/team", icon: RiTeamLine },
  { name: "Configuración", href: "/vendor/settings", icon: RiSettings4Line },
];

export function VendorBottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
      <nav className="flex items-center justify-around h-16 px-2">
        {mainNav.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 text-[10px] font-medium text-muted-foreground">
              <RiMoreLine className="h-5 w-5" />
              Más
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="mb-2">
            {moreItems.map((item) => (
              <DropdownMenuItem key={item.name} asChild>
                <Link href={item.href} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </div>
  );
}
