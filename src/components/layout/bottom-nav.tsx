"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEvent } from "@/contexts/event-context";
import {
  RiDashboardLine,
  RiCalendarEventLine,
  RiFileListLine,
  RiGroupLine,
  RiMailSendLine,
  RiMoreLine,
  RiStore2Line,
  RiMoneyDollarCircleLine,
  RiSettings4Line,
  RiContactsBookLine,
} from "@remixicon/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// General navigation (when no event is active)
const generalNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: RiDashboardLine },
  { name: "Eventos", href: "/dashboard/events", icon: RiCalendarEventLine },
  { name: "Contactos", href: "/dashboard/contacts", icon: RiContactsBookLine },
  { name: "Tareas", href: "/dashboard/tasks", icon: RiFileListLine },
];

const generalMoreItems = [
  { name: "Proveedores", href: "/dashboard/contacts?segment=vendors", icon: RiStore2Line },
  { name: "Pagos", href: "/dashboard/payments", icon: RiMoneyDollarCircleLine },
  { name: "Configuración", href: "/dashboard/settings", icon: RiSettings4Line },
];

export function BottomNav() {
  const pathname = usePathname();
  const { activeEvent, isEventView } = useEvent();

  // Event-specific navigation
  const getEventNavigation = (eventId: number) => [
    { name: "General", href: `/dashboard/events/${eventId}`, icon: RiDashboardLine, exact: true },
    { name: "Tareas", href: `/dashboard/events/${eventId}/tasks`, icon: RiFileListLine },
    { name: "Invitados", href: `/dashboard/events/${eventId}/guests`, icon: RiGroupLine },
    { name: "RSVP", href: `/dashboard/events/${eventId}/rsvp`, icon: RiMailSendLine },
  ];

  const getEventMoreItems = (eventId: number) => [
    { name: "Proveedores", href: `/dashboard/events/${eventId}/vendors`, icon: RiStore2Line },
    { name: "Finanzas", href: `/dashboard/events/${eventId}/finances`, icon: RiMoneyDollarCircleLine },
    { name: "Configuración", href: `/dashboard/events/${eventId}/settings`, icon: RiSettings4Line },
  ];

  const navigation = isEventView && activeEvent 
    ? getEventNavigation(activeEvent.id) 
    : generalNavigation;
  
  const moreItems = isEventView && activeEvent 
    ? getEventMoreItems(activeEvent.id) 
    : generalMoreItems;

  const isMoreActive = moreItems.some(item => 
    pathname === item.href || pathname.startsWith(item.href + "/")
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[var(--card)] md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navigation.map((item) => {
          const isActive = 'exact' in item && item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                isActive
                  ? "text-[var(--primary)]"
                  : "text-[var(--muted-foreground)]"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}

        {/* More Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                isMoreActive
                  ? "text-[var(--primary)]"
                  : "text-[var(--muted-foreground)]"
              )}
            >
              <RiMoreLine className="h-5 w-5" />
              <span className="text-[10px] font-medium">Más</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 mb-2">
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
      </div>
    </nav>
  );
}
