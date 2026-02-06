"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RiEyeLine, RiCloseLine } from "@remixicon/react";

interface ImpersonationInfo {
  isImpersonating: boolean;
  organizationName?: string;
  planName?: string;
  totalEvents?: number;
  totalMembers?: number;
}

export function ImpersonationBanner() {
  const [info, setInfo] = useState<ImpersonationInfo>({ isImpersonating: false });
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    const isImpersonating = document.cookie
      .split("; ")
      .some((row) => row.startsWith("hubents-impersonating=true"));

    if (isImpersonating) {
      document.body.style.paddingTop = "40px";
      
      fetch("/api/user/context")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.currentOrganization) {
            setInfo({
              isImpersonating: true,
              organizationName: data.data.currentOrganization.name,
              planName: data.data.tenantStats?.planName,
              totalEvents: data.data.tenantStats?.totalEvents,
              totalMembers: data.data.tenantStats?.totalMembers,
            });
          }
        })
        .catch(console.error);
    }

    return () => {
      document.body.style.paddingTop = "";
    };
  }, []);

  async function endImpersonation() {
    setEnding(true);
    try {
      const res = await fetch("/api/admin/impersonate", { method: "DELETE" });
      if (res.ok) {
        document.body.style.paddingTop = "";
        window.location.href = "/admin/tenants";
      }
    } catch (error) {
      console.error("Failed to end impersonation:", error);
      setEnding(false);
    }
  }

  if (!info.isImpersonating) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 px-4 py-2 h-10">
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between h-full">
        <div className="flex items-center gap-2">
          <RiEyeLine className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium truncate">
            Impersonando: <strong>{info.organizationName || "Tenant"}</strong>
            {info.planName && (
              <span className="hidden sm:inline text-amber-800 ml-2">
                | Plan: {info.planName}
              </span>
            )}
            {info.totalEvents !== undefined && (
              <span className="hidden md:inline text-amber-800 ml-2">
                | {info.totalEvents} eventos | {info.totalMembers} usuarios
              </span>
            )}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={endImpersonation}
          disabled={ending}
          className="text-amber-950 hover:bg-amber-600 hover:text-amber-950 h-7 shrink-0"
        >
          <RiCloseLine className="h-4 w-4 mr-1" />
          {ending ? "Saliendo..." : "Salir"}
        </Button>
      </div>
    </div>
  );
}
