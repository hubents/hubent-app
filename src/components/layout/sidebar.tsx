"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  RiDashboardLine,
  RiCalendarEventLine,
  RiUserLine,
  RiStore2Line,
  RiFileListLine,
  RiSettings4Line,
  RiTeamLine,
  RiMoneyDollarCircleLine,
} from "@remixicon/react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: RiDashboardLine },
  { name: "Eventos", href: "/dashboard/events", icon: RiCalendarEventLine },
  { name: "CRM", href: "/dashboard/crm", icon: RiUserLine },
  { name: "Proveedores", href: "/dashboard/vendors", icon: RiStore2Line },
  { name: "Tareas", href: "/dashboard/tasks", icon: RiFileListLine },
  { name: "Pagos", href: "/dashboard/payments", icon: RiMoneyDollarCircleLine },
  { name: "Equipo", href: "/dashboard/team", icon: RiTeamLine },
];

const bottomNavigation = [
  { name: "Configuración", href: "/dashboard/settings", icon: RiSettings4Line },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[var(--sidebar-width)] border-r border-[var(--border)] bg-[var(--card)]">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-[var(--border)] px-6">
          <Image
            src="/images/icon.png"
            alt="HubEnts"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="text-xl font-bold">hubents</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
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
        </nav>

        {/* Bottom Navigation */}
        <div className="border-t border-[var(--border)] px-3 py-4">
          {bottomNavigation.map((item) => {
            const isActive = pathname === item.href;
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
