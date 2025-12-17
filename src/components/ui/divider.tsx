import * as React from "react";
import { cn } from "@/lib/utils";

interface DividerProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
  children?: React.ReactNode;
}

const Divider = ({ orientation = "horizontal", className, children }: DividerProps) => {
  if (children) {
    return (
      <div className={cn("flex items-center gap-4", className)}>
        <div className="flex-1 h-px bg-[var(--border)]" />
        <span className="text-xs text-[var(--muted-foreground)] font-medium">{children}</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-[var(--border)]",
        orientation === "horizontal" ? "h-px w-full" : "w-px h-full",
        className
      )}
    />
  );
};

export { Divider };
