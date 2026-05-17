"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { TIMEZONES } from "@/lib/constants/locale";
import { cn } from "@/lib/utils";

interface TimezoneComboboxProps {
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function TimezoneCombobox({ value, onValueChange, placeholder = "Seleccionar país…", className }: TimezoneComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => TIMEZONES.find(t => t.value === value), [value]);

  const filtered = useMemo(() => {
    if (!query.trim()) return TIMEZONES;
    const q = query.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return TIMEZONES.filter(t => {
      const haystack = `${t.label} ${t.zone ?? ""}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      return haystack.includes(q);
    });
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
    else setQuery("");
  }, [open]);

  const triggerLabel = selected
    ? `${selected.flag} ${selected.label}${selected.zone ? ` — ${selected.zone}` : ""}`
    : placeholder;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex w-full items-center justify-between rounded-[8px] border bg-transparent px-3 text-left transition-colors",
          "border-[var(--line-1)] hover:border-[var(--line-2)] focus:outline-none",
          open && "border-[var(--line-2)] ring-2 ring-[var(--ring,#4B6FE520)]",
        )}
        style={{ height: 36, fontSize: 13, gap: 6 }}
      >
        <span className={cn("flex-1 truncate", !selected && "text-[var(--ink-4)]")}>{triggerLabel}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={cn("flex-shrink-0 text-[var(--ink-3)] transition-transform", open && "rotate-180")}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-[200] mt-1 w-full overflow-hidden rounded-[10px] border bg-white shadow-[0_8px_24px_rgba(0,0,0,.12)]"
          style={{ borderColor: "var(--line-1)" }}
        >
          <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: "var(--line-1)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 text-[var(--ink-3)]">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar país…"
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--ink-4)] text-[var(--ink-1)]"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-[var(--ink-3)] hover:text-[var(--ink-1)]">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          <div className="max-h-[240px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-[12.5px] text-[var(--ink-3)]">
                Sin resultados para &ldquo;{query}&rdquo;
              </div>
            ) : (
              filtered.map(t => {
                const isSelected = t.value === value;
                const displayName = t.zone ? `${t.label} — ${t.zone}` : t.label;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => { onValueChange(t.value); setOpen(false); }}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-[7px] text-left text-[13px] transition-colors",
                      isSelected
                        ? "bg-[var(--bg-accent-subtle,#EEF4FF)] text-[var(--ink-accent,#4B6FE5)] font-medium"
                        : "text-[var(--ink-1)] hover:bg-[var(--bg-hover)]",
                    )}
                  >
                    <span className="text-base leading-none">{t.flag}</span>
                    <span className="flex-1">{displayName}</span>
                    <span className="text-[11px] text-[var(--ink-4)]">{t.offset}</span>
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
