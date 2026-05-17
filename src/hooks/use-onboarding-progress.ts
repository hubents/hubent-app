"use client";

import { useEffect, useState } from "react";
import { useUserSession } from "./use-user-session";

export interface OnboardingProgress {
  pct: number;      // 0–100
  allDone: boolean;
}

export function useOnboardingProgress(): OnboardingProgress | null {
  const { orgType } = useUserSession();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);

  useEffect(() => {
    if (orgType !== "provider") return; // solo proveedores por ahora

    let cancelled = false;
    fetch("/api/organizations/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (cancelled || !json?.data) return;
        const pct: number = json.data.profileCompleteness ?? 0;
        setProgress({ pct, allDone: pct >= 100 });
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [orgType]);

  return progress;
}
