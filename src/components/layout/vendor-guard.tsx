"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function VendorGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ok" | "redirect">("loading");
  const router = useRouter();

  useEffect(() => {
    async function checkOrgType() {
      try {
        const res = await fetch("/api/user/organizations");
        const data = await res.json();

        if (!data.success || !data.data?.length) {
          setStatus("redirect");
          return;
        }

        // Check if any org is a provider
        const hasProviderOrg = data.data.some(
          (org: { orgType: string }) => org.orgType === "provider"
        );

        if (hasProviderOrg) {
          setStatus("ok");
        } else {
          setStatus("redirect");
        }
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
