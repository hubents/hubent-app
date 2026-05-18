"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactsPageContent } from "@/components/contacts/contacts-page-content";
import { EventScopedGuard } from "@/components/layout/event-scoped-guard";

export default function ContactsPage() {
  return (
    <EventScopedGuard>
    <Suspense fallback={
      <div className="space-y-[var(--gap-cards-lg)]">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-[var(--gap-cards)] md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    }>
      <ContactsPageContent />
    </Suspense>
    </EventScopedGuard>
  );
}
