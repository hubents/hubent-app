"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import type { ComponentProps } from "react";

type IconData = ComponentProps<typeof HugeiconsIcon>["icon"];

/**
 * `hgIcon(IconData)` produces a thin wrapper that takes only `className`
 * — perfect drop-in for `LucideIcon`-shaped slots like
 * `{ name: 'Dashboard', icon: hgIcon(DashboardSquare03Icon) }`.
 *
 * Stroke is fixed at 1.5 (per Hubents Guidelines.html §"Iconografía").
 */
export const hgIcon = (icon: IconData) => {
  const Cmp = ({ className }: { className?: string }) => (
    <HugeiconsIcon icon={icon} className={className} strokeWidth={1.5} />
  );
  Cmp.displayName = "HgIcon";
  return Cmp;
};
