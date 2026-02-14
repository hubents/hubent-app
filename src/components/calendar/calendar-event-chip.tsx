"use client";

import { cn } from "@/lib/utils";
import type { CalendarItem } from "@/lib/calendar";
import { CALENDAR_COLORS, CALENDAR_BG_LIGHT, CALENDAR_TEXT_COLORS } from "@/lib/calendar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";

interface CalendarEventChipProps {
  item: CalendarItem;
  compact?: boolean;
  onNavigate?: () => void;
}

export function CalendarEventChip({ item, compact, onNavigate }: CalendarEventChipProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate?.();
    router.push(item.href);
  };

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0",
              CALENDAR_COLORS[item.type]
            )}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {item.title}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleClick}
          className={cn(
            "w-full text-left text-[11px] leading-tight px-1.5 py-0.5 rounded truncate cursor-pointer transition-opacity hover:opacity-80",
            CALENDAR_BG_LIGHT[item.type],
            CALENDAR_TEXT_COLORS[item.type],
            "font-medium"
          )}
        >
          {item.time && (
            <span className="opacity-70 mr-0.5">{item.time}</span>
          )}
          {item.title}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <p className="font-medium text-xs">{item.title}</p>
        {item.time && <p className="text-[10px] opacity-70">{item.time}</p>}
        {item.meta?.location && (
          <p className="text-[10px] opacity-70">{item.meta.location}</p>
        )}
        {item.meta?.amount && (
          <p className="text-[10px] opacity-70">
            {item.meta.currency || "€"}{" "}
            {item.meta.amount.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
