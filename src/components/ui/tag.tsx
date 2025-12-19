"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { RiCloseLine } from "@remixicon/react";

interface TagProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "error";
  size?: "sm" | "md";
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

const variantClasses = {
  default: "bg-[var(--muted)] text-[var(--foreground)]",
  primary: "bg-[var(--primary)]/10 text-[var(--primary)]",
  success: "bg-[var(--success)]/10 text-[var(--success)]",
  warning: "bg-[var(--warning)]/10 text-[var(--warning)]",
  error: "bg-[var(--destructive)]/10 text-[var(--destructive)]",
};

const sizeClasses = {
  sm: "text-xs px-2 py-0.5 gap-1",
  md: "text-sm px-2.5 py-1 gap-1.5",
};

const Tag = ({
  children,
  variant = "default",
  size = "md",
  removable = false,
  onRemove,
  className,
}: TagProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-full)] font-medium transition-colors",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
      {removable && (
        <button
          onClick={onRemove}
          className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
        >
          <RiCloseLine className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
        </button>
      )}
    </span>
  );
};

export { Tag };
