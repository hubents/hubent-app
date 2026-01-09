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
        // Check if cookie already exists
        const existingCookie = document.cookie
          .split("; ")
          .find((row) => row.startsWith("hubents-org-id="));

        if (existingCookie) {
          setChecked(true);
          return;
        }

        // Fetch user's organizations and set cookie
        const res = await fetch("/api/user/organizations");
        const data = await res.json();

        if (data.success && data.data?.length > 0) {
          const orgId = data.data[0].id;
          // Set cookie with 30 day expiry
          document.cookie = `hubents-org-id=${orgId}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
          // Reload to apply the cookie
          window.location.reload();
        }
      } catch (error) {
        console.error("Failed to set org cookie:", error);
      } finally {
        setChecked(true);
      }
    }

    ensureOrgCookie();
  }, []);

  // This component doesn't render anything
  return null;
}
