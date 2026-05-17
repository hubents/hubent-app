"use client";

import dynamic from "next/dynamic";

// SSR disabled for mobile-only components to prevent Radix UI useId() hydration mismatches.
// These components are never visible on desktop (md:hidden), so skipping SSR has no effect
// on SEO or initial desktop render.
export const MobileHeaderClient = dynamic(
  () => import("./mobile-header").then((m) => ({ default: m.MobileHeader })),
  { ssr: false }
);

export const BottomNavClient = dynamic(
  () => import("./bottom-nav").then((m) => ({ default: m.BottomNav })),
  { ssr: false }
);
