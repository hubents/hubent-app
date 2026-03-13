"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserSession } from "@/hooks/use-user-session";

/**
 * Guard that redirects eventScoped users away from pages they shouldn't access.
 * eventScoped roles (client, viewer, assistant) should only see /dashboard/events.
 * Wrap page content with this component to enforce the restriction.
 */
export function EventScopedGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { eventScoped, loading } = useUserSession();

  useEffect(() => {
    if (!loading && eventScoped) {
      router.replace("/dashboard/events");
    }
  }, [eventScoped, loading, router]);

  if (loading) return null;
  if (eventScoped) return null;

  return <>{children}</>;
}
