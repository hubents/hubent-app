"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/ui-utils";

const AVATAR_COLORS = [
  "bg-gray-500 text-white",
  "bg-amber-300 text-amber-900",
  "bg-blue-300 text-blue-900",
  "bg-pink-300 text-pink-900",
  "bg-green-300 text-green-900",
  "bg-violet-300 text-violet-900",
];

function getColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

interface AvatarGroupProps {
  items: { name?: string | null; image?: string | null }[];
  max?: number;
  total?: number;
  size?: "sm" | "md";
  className?: string;
}

export function AvatarGroup({ items, max = 3, total, size = "md", className }: AvatarGroupProps) {
  const displayed = items.slice(0, max);
  const remaining = (total ?? items.length) - displayed.length;
  const sizeClass = size === "sm" ? "size-6 text-[10px]" : "size-8 text-xs";

  return (
    <div className={cn("flex items-center", className)}>
      {displayed.map((item, i) => (
        <Avatar
          key={i}
          className={cn(
            sizeClass,
            "border-2 border-background",
            i > 0 && "-ml-2"
          )}
        >
          {item.image && <AvatarImage src={item.image} alt={item.name || ""} />}
          <AvatarFallback className={cn(sizeClass, getColor(i), "font-medium")}>
            {getInitials(item.name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {remaining > 0 && (
        <span
          className={cn(
            "flex items-center justify-center rounded-full border-2 border-background bg-muted font-medium text-muted-foreground -ml-2",
            sizeClass
          )}
        >
          +{remaining}
        </span>
      )}
    </div>
  );
}
