"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { RiArrowDownSLine } from "@remixicon/react";

interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  className?: string;
  allowMultiple?: boolean;
}

const Accordion = ({ items, className, allowMultiple = false }: AccordionProps) => {
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    if (allowMultiple) {
      setOpenItems(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    } else {
      setOpenItems(prev => prev.includes(id) ? [] : [id]);
    }
  };

  return (
    <div className={cn("divide-y divide-[var(--border)] rounded-[var(--radius)] border border-[var(--border)]", className)}>
      {items.map((item) => {
        const isOpen = openItems.includes(item.id);
        return (
          <div key={item.id} className="overflow-hidden">
            <button
              onClick={() => toggleItem(item.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left font-medium transition-colors hover:bg-[var(--muted)]/50"
            >
              <span>{item.title}</span>
              <RiArrowDownSLine 
                className={cn(
                  "h-5 w-5 transition-transform duration-300",
                  isOpen && "rotate-180"
                )} 
              />
            </button>
            <div
              className={cn(
                "grid transition-all duration-300 ease-in-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <div className="px-4 pb-4 pt-0 text-sm text-[var(--muted-foreground)]">
                  {item.content}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export { Accordion };
export type { AccordionItem };
