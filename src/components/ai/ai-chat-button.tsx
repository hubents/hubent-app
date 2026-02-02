"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIChatPanel } from "./ai-chat-panel";

interface AIChatButtonProps {
  context?: string;
}

export function AIChatButton({ context = "dashboard" }: AIChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Floating Button - Bottom right, above mobile nav */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed z-[100] flex items-center justify-center transition-all duration-300",
          // Position - Bottom right corner, safe from drawer
          "bottom-20 right-4 md:bottom-6 md:right-6",
          // Size
          "w-14 h-14",
          // Style
          "rounded-full shadow-lg",
          // Gradient background
          "bg-[var(--ai-accent)]",
          // Hover effects
          "hover:scale-110 hover:shadow-xl hover:shadow-[var(--ai-accent)]/25 hover:bg-[var(--ai-accent-hover)]",
          // Active state
          "active:scale-95",
          // Glow effect
          "before:absolute before:inset-0 before:rounded-full before:bg-[var(--ai-accent)] before:blur-lg before:opacity-50 before:-z-10",
          // Hide when panel is open
          isOpen && "opacity-0 pointer-events-none scale-90"
        )}
        aria-label={isOpen ? "Cerrar chat" : "Abrir asistente IA"}
      >
        <div className="relative">
          {isOpen ? (
            <X className="w-6 h-6 md:w-7 md:h-7 text-white" />
          ) : (
            <>
              <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-white" />
              {/* Pulse animation */}
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
            </>
          )}
        </div>
      </button>

      {/* Chat Panel */}
      <AIChatPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        context={context}
      />
    </>,
    document.body
  );
}
