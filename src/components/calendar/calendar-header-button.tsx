"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarDrawer } from "./calendar-drawer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function CalendarHeaderButton() {
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
            <CalendarDays className="h-5 w-5 text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Calendario</p>
        </TooltipContent>
      </Tooltip>

      <CalendarDrawer open={isOpen} onOpenChange={setIsOpen} />
    </TooltipProvider>
  );
}
