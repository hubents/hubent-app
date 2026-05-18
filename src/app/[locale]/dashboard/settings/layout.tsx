"use client";

import { EventScopedGuard } from "@/components/layout/event-scoped-guard";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <EventScopedGuard>{children}</EventScopedGuard>;
}
