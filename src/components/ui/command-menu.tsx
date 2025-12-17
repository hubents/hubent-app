"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { RiSearchLine, RiArrowRightLine } from "@remixicon/react";

interface CommandItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
  group?: string;
}

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: CommandItem[];
  placeholder?: string;
  className?: string;
}

const CommandMenu = ({ isOpen, onClose, items, placeholder = "Buscar...", className }: CommandMenuProps) => {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredItems = items.filter(item =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  const groupedItems = filteredItems.reduce((acc, item) => {
    const group = item.group || "General";
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSearch("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].onSelect();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />

      {/* Command Panel */}
      <div className={cn(
        "absolute left-1/2 top-1/4 w-full max-w-lg -translate-x-1/2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-xl animate-scale-in",
        className
      )}>
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
          <RiSearchLine className="h-5 w-5 text-[var(--muted-foreground)]" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedIndex(0); }}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted-foreground)]"
          />
          <kbd className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-xs">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {Object.entries(groupedItems).map(([group, groupItems]) => (
            <div key={group}>
              <p className="px-2 py-1.5 text-xs font-medium text-[var(--muted-foreground)]">{group}</p>
              {groupItems.map((item) => {
                flatIndex++;
                const isSelected = flatIndex === selectedIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => { item.onSelect(); onClose(); }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm transition-colors",
                      isSelected ? "bg-[var(--primary)] text-white" : "hover:bg-[var(--muted)]"
                    )}
                  >
                    {item.icon && <span className="opacity-70">{item.icon}</span>}
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.shortcut && (
                      <kbd className={cn(
                        "rounded px-1.5 py-0.5 text-xs",
                        isSelected ? "bg-white/20" : "bg-[var(--muted)]"
                      )}>
                        {item.shortcut}
                      </kbd>
                    )}
                    <RiArrowRightLine className="h-4 w-4 opacity-50" />
                  </button>
                );
              })}
            </div>
          ))}
          {filteredItems.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              No se encontraron resultados
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export { CommandMenu };
export type { CommandItem };
