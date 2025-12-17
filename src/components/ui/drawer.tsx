"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { RiCloseLine } from "@remixicon/react";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  position?: "left" | "right";
  className?: string;
}

const Drawer = ({ isOpen, onClose, children, title, position = "right", className }: DrawerProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div
        className={cn(
          "absolute top-0 h-full w-full max-w-md bg-[var(--card)] shadow-xl",
          position === "right" ? "right-0 animate-slide-in-right" : "left-0 animate-slide-in-left",
          className
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-[var(--radius)] p-1.5 transition-colors hover:bg-[var(--muted)]"
            >
              <RiCloseLine className="h-5 w-5" />
            </button>
          </div>
        )}
        
        {/* Content */}
        <div className="h-full overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export { Drawer };
