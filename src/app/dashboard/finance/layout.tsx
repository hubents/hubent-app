"use client";

import { EventScopedGuard } from "@/components/layout/event-scoped-guard";

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <EventScopedGuard>{children}</EventScopedGuard>;
}
