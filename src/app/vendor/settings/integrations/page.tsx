"use client";

import { Suspense } from "react";
import { IntegrationsPage } from "@/components/integrations/integrations-page";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProviderIntegrationsPage() {
  return (
    <Suspense fallback={<div className="space-y-4 p-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>}>
      <IntegrationsPage portalType="provider" />
    </Suspense>
  );
}
