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
        // Desktop: margin based on sidebar state
        isEventView 
          ? "md:ml-[272px]" // 72px (collapsed main) + 200px (event sidebar)
          : "md:ml-[260px]" // 260px (expanded main sidebar)
      )}
    >
      {children}
    </div>
  );
}
