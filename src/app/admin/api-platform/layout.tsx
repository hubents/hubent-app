"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/api-platform", label: "Overview", exact: true },
  { href: "/admin/api-platform/organizations", label: "Organizations" },
  { href: "/admin/api-platform/logs", label: "Request Logs" },
  { href: "/admin/api-platform/webhooks", label: "Webhooks" },
];

export default function ApiPlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">API Platform</h1>
        <p className="text-sm text-muted-foreground">Monitoreo y gestion de la API publica de HubEnts</p>
      </div>

      <div className="border-b">
        <nav className="flex gap-6">
          {TABS.map((tab) => {
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "pb-2 text-sm font-medium border-b-2 transition-colors -mb-px",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
