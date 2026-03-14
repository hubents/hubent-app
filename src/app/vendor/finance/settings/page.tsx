"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FinanceSettingsContent } from "@/app/dashboard/finance/settings/page";

export default function VendorFinanceSettingsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    }>
      <FinanceSettingsContent basePath="/vendor/finance/settings" />
    </Suspense>
  );
}
