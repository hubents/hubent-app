"use client";

import { useEffect, useState } from "react";

/**
 * Component that ensures the organization cookie is set
 * This runs on the client side and sets the cookie based on user's first organization
 */
export function OrgCookieSetter() {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function ensureOrgCookie() {
      try {
        console.log("[OrgCookieSetter] Checking for org cookie...");
        
        // Check if cookie already exists
        const existingCookie = document.cookie
          .split("; ")
          .find((row) => row.startsWith("hubents-org-id="));

        if (existingCookie) {
          console.log("[OrgCookieSetter] Cookie already exists:", existingCookie);
          setChecked(true);
          return;
        }

        console.log("[OrgCookieSetter] No cookie found, fetching organizations...");
        
        // Fetch user's organizations and set cookie
        const res = await fetch("/api/user/organizations");
        console.log("[OrgCookieSetter] API response status:", res.status);
        
        const data = await res.json();
        console.log("[OrgCookieSetter] API response data:", data);

        if (data.success && data.data?.length > 0) {
          const orgId = data.data[0].id;
          console.log("[OrgCookieSetter] Setting cookie for org ID:", orgId);
          // Set cookie with 30 day expiry
          document.cookie = `hubents-org-id=${orgId}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
          console.log("[OrgCookieSetter] Cookie set, reloading page...");
          // Reload to apply the cookie
          window.location.reload();
        } else {
          console.warn("[OrgCookieSetter] No organizations found or API error:", data);
        }
      } catch (error) {
        console.error("[OrgCookieSetter] Failed to set org cookie:", error);
      } finally {
        setChecked(true);
      }
    }

    ensureOrgCookie();
  }, []);

  // This component doesn't render anything
  return null;
}
