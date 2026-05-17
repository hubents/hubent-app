"use client";

import { cn } from "@/lib/utils";
import { RiFilterLine, RiArrowDownSLine, RiCheckLine } from "@remixicon/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ScopeValue = "standalone" | "event" | "all";

interface ScopeFilterProps {
  value: ScopeValue;
  onChange: (value: ScopeValue) => void;
  className?: string;
}

const OPTIONS: { key: ScopeValue; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "standalone", label: "Independientes" },
  { key: "event", label: "De eventos" },
];

export function ScopeFilter({ value, onChange, className }: ScopeFilterProps) {
  const current = OPTIONS.find((o) => o.key === value) ?? OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn("inline-flex items-center gap-1.5 cursor-pointer", className)}
          style={{
            padding: "7px 12px",
            border: "1px solid var(--line-strong)",
            borderRadius: "var(--r-sm)",
            background: "var(--bg-panel)",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--ink-1)",
          }}
        >
          <RiFilterLine size={13} />
          {current.label}
          <RiArrowDownSLine size={12} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" style={{ minWidth: 180 }}>
        {OPTIONS.map((o) => (
          <DropdownMenuItem
            key={o.key}
            onClick={() => onChange(o.key)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: value === o.key ? "var(--bg-subtle)" : undefined,
            }}
          >
            <span>{o.label}</span>
            {value === o.key && <RiCheckLine size={13} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
