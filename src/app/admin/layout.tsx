"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Building2, 
  Store,
  Users, 
  CreditCard, 
  Settings, 
  ScrollText,
  Megaphone,
  LogOut,
  Bot,
  Activity,
  Globe,
  Wallet,
  Link2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminHeader } from "@/components/layout/admin-header";

interface SidebarGroup {
  label: string;
  items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
}

const sidebarGroups: SidebarGroup[] = [
  {
    label: "PRINCIPAL",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/status", label: "Estado", icon: Activity },
    ],
  },
  {
    label: "GESTIÓN",
    items: [
      { href: "/admin/tenants", label: "Tenants", icon: Building2 },
      { href: "/admin/providers", label: "Proveedores", icon: Store },
      { href: "/admin/users", label: "Usuarios", icon: Users },
      { href: "/admin/plans", label: "Planes", icon: CreditCard },
    ],
  },
  {
    label: "PLATAFORMA",
    items: [
      { href: "/admin/billing", label: "Billing", icon: Wallet },
      { href: "/admin/api-platform", label: "API Platform", icon: Globe },
      { href: "/admin/integrations", label: "Integraciones", icon: Link2 },
      { href: "/admin/ai", label: "Asistente IA", icon: Bot },
    ],
  },
  {
    label: "SISTEMA",
    items: [
      { href: "/admin/audit", label: "Auditoría", icon: ScrollText },
      { href: "/admin/announcements", label: "Anuncios", icon: Megaphone },
      { href: "/admin/settings", label: "Configuración", icon: Settings },
    ],
  },
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
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {sidebarGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1 text-[10px] font-semibold tracking-wider text-[var(--muted-foreground)]/60 uppercase">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
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
              </div>
            </div>
          ))}
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
