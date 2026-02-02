"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIGlobalDrawer } from "./ai-global-drawer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AIHeaderButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(true)}
            className="relative group"
          >
            <Sparkles className="h-5 w-5 text-[var(--ai-accent)] group-hover:text-[var(--ai-accent-hover)] transition-colors" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Asistente IA (Enti)</p>
        </TooltipContent>
      </Tooltip>

      <AIGlobalDrawer open={isOpen} onOpenChange={setIsOpen} />
    </TooltipProvider>
  );
}
