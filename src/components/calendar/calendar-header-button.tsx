"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";

export function CalendarHeaderButton() {
  return (
    <Link
      href="/dashboard/calendar"
      title="Calendario"
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--line-1)] bg-[var(--bg-subtle)] px-3 text-[12.5px] font-medium text-[var(--ink-1)] transition-colors hover:bg-[var(--bg-hover)] hover:border-[var(--line-strong)]"
    >
      <CalendarDays className="h-[15px] w-[15px]" />
      <span>Calendario</span>
    </Link>
  );
}
