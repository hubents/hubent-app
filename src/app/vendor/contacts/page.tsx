"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactsPageContent } from "@/components/contacts/contacts-page-content";

export default function VendorContactsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    }>
      <ContactsPageContent />
    </Suspense>
  );
}
