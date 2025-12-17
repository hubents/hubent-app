import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "./avatar";

interface AvatarGroupProps {
  avatars: { name: string; image?: string }[];
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
};

const AvatarGroup = ({ avatars, max = 4, size = "md", className }: AvatarGroupProps) => {
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  return (
    <div className={cn("flex -space-x-2", className)}>
      {visibleAvatars.map((avatar, index) => (
        <Avatar
          key={index}
          className={cn(
            sizeClasses[size],
            "ring-2 ring-[var(--background)] transition-transform hover:z-10 hover:scale-110"
          )}
        >
          <AvatarFallback className="bg-[var(--primary)] text-white">
            {avatar.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            sizeClasses[size],
            "flex items-center justify-center rounded-full bg-[var(--muted)] ring-2 ring-[var(--background)] font-medium"
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

export { AvatarGroup };
