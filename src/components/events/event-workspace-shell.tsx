"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  ArrowLeft01Icon,
  Home01Icon,
  Task01Icon,
  UserGroupIcon,
  Wallet01Icon,
  Store01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";

const IcoBack = hgIcon(ArrowLeft01Icon);
const IcoHome = hgIcon(Home01Icon);
const IcoTasks = hgIcon(Task01Icon);
const IcoGuests = hgIcon(UserGroupIcon);
const IcoFinance = hgIcon(Wallet01Icon);
const IcoPartners = hgIcon(Store01Icon);
const IcoSettings = hgIcon(Settings01Icon);

interface EventShell {
  id: number;
  name: string;
  status: string;
}

const STATUS_META: Record<string, { label: string; bg: string; ink: string }> = {
  draft:     { label: "Borrador",   bg: "#F3F4F6", ink: "#374151" },
  confirmed: { label: "Confirmado", bg: "#DBEAFE", ink: "#1E40AF" },
  active:    { label: "Activo",     bg: "#D1FAE5", ink: "#065F46" },
  in_progress: { label: "En progreso", bg: "#FEF3C7", ink: "#92400E" },
  completed: { label: "Completado", bg: "#EDE9FE", ink: "#5B21B6" },
  cancelled: { label: "Cancelado",  bg: "#FEE2E2", ink: "#991B1B" },
};

export function EventWorkspaceShell({
  eventId,
  children,
}: {
  eventId: number;
  children: React.ReactNode;
}) {
  const [event, setEvent] = useState<EventShell | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    fetch(`/api/events/${eventId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setEvent(d.data); })
      .catch(() => null);
  }, [eventId]);

  const base = `/dashboard/events/${eventId}`;

  const TABS = [
    { label: "Resumen",   href: base,                    icon: IcoHome,     exact: true },
    { label: "Tareas",    href: `${base}/tasks`,          icon: IcoTasks,    exact: false },
    { label: "Invitados", href: `${base}/guests`,         icon: IcoGuests,   exact: false },
    { label: "Finanzas",  href: `${base}/finances`,       icon: IcoFinance,  exact: false },
    { label: "Partners",  href: `${base}/partners`,       icon: IcoPartners, exact: false },
    { label: "Ajustes",   href: `${base}/settings`,       icon: IcoSettings, exact: false },
  ];

  const isActive = (tab: typeof TABS[0]) =>
    tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);

  const statusMeta = event?.status ? (STATUS_META[event.status] ?? null) : null;

  return (
    <div>
      {/* Workspace header — negative margins break out of the page padding,
          then we add it back as internal padding so content stays aligned */}
      <div
        className="-mx-[var(--padding-page)] md:-mx-[var(--padding-page-lg)] -mt-[var(--padding-page)] md:-mt-[var(--padding-page-lg)] px-[var(--padding-page)] md:px-[var(--padding-page-lg)]"
        style={{
          background: "#FFFFFF",
          borderBottom: "1px solid var(--line-1)",
          paddingTop: 14,
          paddingBottom: 0,
          marginBottom: 24,
        }}
      >
        {/* Top row: back + name + status */}
        <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
          <Link
            href="/dashboard/events"
            className="inline-flex items-center gap-1.5 no-underline"
            style={{
              fontSize: 12.5,
              color: "var(--ink-3)",
              fontWeight: 500,
              padding: "4px 6px",
              borderRadius: 6,
              border: "1px solid var(--line-1)",
              background: "transparent",
            }}
          >
            <IcoBack className="h-3.5 w-3.5" />
            Eventos
          </Link>

          <span style={{ color: "var(--line-strong)", fontSize: 14 }}>/</span>

          {event ? (
            <div className="flex items-center gap-2 min-w-0">
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--ink-1)",
                  letterSpacing: "-0.01em",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 380,
                }}
              >
                {event.name}
              </span>
              {statusMeta && (
                <span
                  style={{
                    background: statusMeta.bg,
                    color: statusMeta.ink,
                    borderRadius: 999,
                    fontSize: 10.5,
                    fontWeight: 600,
                    padding: "2px 9px",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {statusMeta.label}
                </span>
              )}
            </div>
          ) : (
            <div
              style={{
                width: 180,
                height: 18,
                borderRadius: 4,
                background: "var(--bg-subtle)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
          {TABS.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="no-underline inline-flex items-center gap-1.5"
                style={{
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--ink-1)" : "var(--ink-3)",
                  borderBottom: active
                    ? "2px solid var(--ink-1)"
                    : "2px solid transparent",
                  whiteSpace: "nowrap",
                  transition: "color .12s",
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Page content — inherits the dashboard's page padding */}
      {children}
    </div>
  );
}
