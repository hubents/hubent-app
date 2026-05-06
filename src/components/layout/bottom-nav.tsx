"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEvent } from "@/contexts/event-context";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  DashboardSquare03Icon,
  Calendar03Icon,
  CheckmarkSquare02Icon,
  UserGroupIcon,
  MailSend01Icon,
  MoreHorizontalIcon,
  Agreement01Icon,
  Wallet01Icon,
  Settings01Icon,
  Contact01Icon,
} from "@hugeicons/core-free-icons";

const RiDashboardLine = hgIcon(DashboardSquare03Icon);
const RiCalendarEventLine = hgIcon(Calendar03Icon);
const RiFileListLine = hgIcon(CheckmarkSquare02Icon);
const RiGroupLine = hgIcon(UserGroupIcon);
const RiMailSendLine = hgIcon(MailSend01Icon);
const RiMoreLine = hgIcon(MoreHorizontalIcon);
const RiStore2Line = hgIcon(Agreement01Icon);
const RiMoneyDollarCircleLine = hgIcon(Wallet01Icon);
const RiSettings4Line = hgIcon(Settings01Icon);
const RiContactsBookLine = hgIcon(Contact01Icon);
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserSession } from "@/hooks/use-user-session";

// General navigation (when no event is active)
const generalNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: RiDashboardLine },
  { name: "Eventos", href: "/dashboard/events", icon: RiCalendarEventLine },
  { name: "Contactos", href: "/dashboard/contacts", icon: RiContactsBookLine },
  { name: "Tareas", href: "/dashboard/tasks", icon: RiFileListLine },
];

const generalMoreItems = [
  { name: "Proveedores", href: "/dashboard/providers", icon: RiStore2Line },
  { name: "Pagos", href: "/dashboard/payments", icon: RiMoneyDollarCircleLine },
  { name: "Configuración", href: "/dashboard/settings", icon: RiSettings4Line },
];

export function BottomNav() {
  const pathname = usePathname();
  const { activeEvent, isEventView } = useEvent();
  const { eventScoped } = useUserSession();

  // Event-specific navigation
  const getEventNavigation = (eventId: number) => [
    { name: "General", href: `/dashboard/events/${eventId}`, icon: RiDashboardLine, exact: true },
    { name: "Tareas", href: `/dashboard/events/${eventId}/tasks`, icon: RiFileListLine },
    { name: "Invitados", href: `/dashboard/events/${eventId}/guests`, icon: RiGroupLine },
    { name: "RSVP", href: `/dashboard/events/${eventId}/rsvp`, icon: RiMailSendLine },
  ];

  const getEventMoreItems = (eventId: number) => [
    { name: "Partners", href: `/dashboard/events/${eventId}/partners`, icon: RiStore2Line },
    { name: "Finanzas", href: `/dashboard/events/${eventId}/finances`, icon: RiMoneyDollarCircleLine },
    { name: "Configuración", href: `/dashboard/events/${eventId}/settings`, icon: RiSettings4Line },
  ];

  const filteredGeneralNav = eventScoped
    ? generalNavigation.filter((item) => item.name === "Eventos")
    : generalNavigation;

  const navigation = isEventView && activeEvent 
    ? getEventNavigation(activeEvent.id) 
    : filteredGeneralNav;
  
  const moreItems = isEventView && activeEvent 
    ? getEventMoreItems(activeEvent.id) 
    : eventScoped ? [] : generalMoreItems;

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
        {moreItems.length > 0 && <DropdownMenu>
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
        </DropdownMenu>}
      </div>
    </nav>
  );
}
