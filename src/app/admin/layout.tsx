"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  CreditCard, 
  Settings, 
  ScrollText,
  Megaphone,
  LogOut,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/tenants", label: "Tenants", icon: Building2 },
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/plans", label: "Planes", icon: CreditCard },
  { href: "/admin/billing", label: "Billing", icon: CreditCard },
  { href: "/admin/audit", label: "Auditoría", icon: ScrollText },
  { href: "/admin/announcements", label: "Anuncios", icon: Megaphone },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-[var(--muted)]">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--card)] border-r border-[var(--border)] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Shield className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h1 className="font-bold text-sm">SuperAdmin</h1>
              <p className="text-xs text-[var(--muted-foreground)]">HubEnts Platform</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/admin" && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)]">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Salir de Admin
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
