"use client";

import { useEvent } from "@/contexts/event-context";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface DashboardContentProps {
  children: ReactNode;
}

export function DashboardContent({ children }: DashboardContentProps) {
  const { isEventView } = useEvent();

  return (
    <div
      className={cn(
        "transition-all duration-300",
        // Mobile: no margin (full width)
        "ml-0",
        // Desktop: margin matches sidebar width exactly
        isEventView
          ? "md:ml-[272px]" // 56px (collapsed rail) + 216px (event sidebar)
          : "md:ml-[232px]" // 232px (expanded main sidebar — matches w-[232px])
      )}
    >
      {children}
    </div>
  );
}
