"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { RiStarFill, RiStarLine } from "@remixicon/react";

interface RatingProps {
  value?: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

const Rating = ({ 
  value = 0, 
  onChange, 
  max = 5, 
  size = "md", 
  readonly = false,
  className 
}: RatingProps) => {
  const [hoverValue, setHoverValue] = useState(0);

  const displayValue = hoverValue || value;

  return (
    <div 
      className={cn("flex items-center gap-0.5", className)}
      onMouseLeave={() => !readonly && setHoverValue(0)}
    >
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= displayValue;

        return (
          <button
            key={i}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(starValue)}
            onMouseEnter={() => !readonly && setHoverValue(starValue)}
            className={cn(
              "transition-all",
              !readonly && "cursor-pointer hover:scale-110",
              readonly && "cursor-default"
            )}
          >
            {isFilled ? (
              <RiStarFill className={cn(sizeClasses[size], "text-yellow-400 animate-scale-in")} />
            ) : (
              <RiStarLine className={cn(sizeClasses[size], "text-[var(--muted-foreground)]")} />
            )}
          </button>
        );
      })}
    </div>
  );
};

export { Rating };
