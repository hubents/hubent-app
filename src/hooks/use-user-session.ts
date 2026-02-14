"use client";

import { useUserSessionContext } from "@/contexts/user-session-context";

export function useUserSession() {
  return useUserSessionContext();
}
