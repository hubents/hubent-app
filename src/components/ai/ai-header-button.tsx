"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { AIGlobalDrawer } from "./ai-global-drawer";

export function AIHeaderButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Asistente IA (HubIA)"
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--ink-1)] bg-[var(--ink-1)] px-3 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90"
      >
        <Sparkles className="h-[15px] w-[15px]" />
        <span>HubIA</span>
      </button>

      <AIGlobalDrawer open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
