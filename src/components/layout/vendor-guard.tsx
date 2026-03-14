"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function VendorGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ok" | "redirect">("loading");
  const router = useRouter();

  useEffect(() => {
    async function checkOrgType() {
      try {
        // Use /api/user/me which returns the ACTIVE org context (from cookie)
        const res = await fetch("/api/user/me");
        const data = await res.json();

        if (!data.success || !data.data) {
          setStatus("redirect");
          return;
        }

        // Check if the ACTIVE org is a provider (not just any org)
        if (data.data.orgType === "provider") {
          setStatus("ok");
          return;
        }

        // Active org is not provider — try to find and switch to a provider org
        const orgsRes = await fetch("/api/user/organizations");
        const orgsData = await orgsRes.json();

        if (orgsData.success && orgsData.data?.length) {
          const providerOrg = orgsData.data.find(
            (org: { orgType: string }) => org.orgType === "provider"
          );

          if (providerOrg) {
            // Switch to provider org by setting the cookie
            document.cookie = `hubents-org-id=${providerOrg.id};path=/;max-age=${30 * 24 * 60 * 60}`;
            // Reload to apply the new org context
            window.location.reload();
            return;
          }
        }

        setStatus("redirect");
      } catch {
        setStatus("redirect");
      }
    }

    checkOrgType();
  }, []);

  useEffect(() => {
    if (status === "redirect") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (status === "redirect") return null;

  return <>{children}</>;
}
