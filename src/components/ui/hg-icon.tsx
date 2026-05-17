"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import type { ComponentProps, CSSProperties } from "react";

type IconData = ComponentProps<typeof HugeiconsIcon>["icon"];

interface HgIconProps {
  className?: string;
  /** Lucide-compat: sets width and height via inline style */
  size?: number;
  style?: CSSProperties;
  /** Sets CSS color (maps to style.color) */
  color?: string;
}

/**
 * `hgIcon(IconData)` is a Lucide/Remix-compatible wrapper for Hugeicons.
 * Stroke is fixed at 1.5 (per Hubents Guidelines.html §"Iconografía").
 */
export const hgIcon = (icon: IconData) => {
  const Cmp = ({ className, size, style, color }: HgIconProps) => {
    const merged: CSSProperties | undefined =
      size || color || style
        ? {
            ...(size ? { width: size, height: size } : {}),
            ...(color ? { color } : {}),
            ...style,
          }
        : undefined;
    return (
      <HugeiconsIcon icon={icon} className={className} strokeWidth={1.5} style={merged} />
    );
  };
  Cmp.displayName = "HgIcon";
  return Cmp;
};
