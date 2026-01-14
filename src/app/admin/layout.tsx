"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/logo";
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
  Bot
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminHeader } from "@/components/layout/admin-header";

const sidebarItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/tenants", label: "Tenants", icon: Building2 },
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/plans", label: "Planes", icon: CreditCard },
  { href: "/admin/billing", label: "Billing", icon: CreditCard },
  { href: "/admin/ai", label: "Asistente IA", icon: Bot },
  { href: "/admin/audit", label: "Auditoría", icon: ScrollText },
  { href: "/admin/announcements", label: "Anuncios", icon: Megaphone },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
];

// Pages that should NOT have the admin sidebar
const standalonePages = ["/admin/login", "/admin/invite"];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Check if current page should be standalone (no sidebar)
  const isStandalone = standalonePages.some(page => pathname.startsWith(page));

  // Render standalone pages without sidebar
  if (isStandalone) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-[var(--muted)]">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--card)] border-r border-[var(--border)] flex flex-col">
        {/* Header with Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-[var(--border)]">
          <Logo variant="full" size="md" theme="light" />
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
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
