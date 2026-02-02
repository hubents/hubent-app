"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Internal component that uses useSearchParams
 */
function OrgCookieSetterInner() {
  const [checked, setChecked] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    async function ensureOrgCookie() {
      try {
        const orgSlug = searchParams.get("org");
        
        // If ?org param exists, handle impersonation flow
        if (orgSlug) {
          console.log("[OrgCookieSetter] Found ?org param:", orgSlug);
          
          // Call impersonate API to set cookies properly
          const impersonateRes = await fetch("/api/admin/impersonate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug: orgSlug }),
          });

          if (impersonateRes.ok) {
            const data = await impersonateRes.json();
            console.log("[OrgCookieSetter] Impersonation successful:", data);
            // Remove ?org from URL and reload
            const url = new URL(window.location.href);
            url.searchParams.delete("org");
            window.location.href = url.toString();
            return;
          } else {
            console.warn("[OrgCookieSetter] Impersonation failed, falling back to normal flow");
          }
        }

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
  }, [searchParams]);

  // This component doesn't render anything
  return null;
}

/**
 * Component that ensures the organization cookie is set
 * This runs on the client side and sets the cookie based on:
 * 1. ?org=slug URL parameter (for impersonation)
 * 2. User's first organization (fallback)
 * 
 * Wrapped in Suspense for Next.js 16 compatibility with useSearchParams
 */
export function OrgCookieSetter() {
  return (
    <Suspense fallback={null}>
      <OrgCookieSetterInner />
    </Suspense>
  );
}
