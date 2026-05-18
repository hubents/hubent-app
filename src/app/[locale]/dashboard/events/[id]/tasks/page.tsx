"use client";

import { Suspense, use } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TasksPageContent } from "@/components/tasks/tasks-page-content";
import { EventSectionGuard } from "@/components/events/event-section-guard";

/**
 * Tasks tab inside an event workspace.
 *
 * Reuses the global `<TasksPageContent />` so the in-event view stays in
 * lockstep with the standalone Tasks page. The component hides its scope
 * tabs and pre-fills `eventId` on the create-task drawer when an `eventId`
 * is supplied.
 */
export default function EventTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);

  return (
    <EventSectionGuard eventId={eventId} section="tasks">
      <Suspense
        fallback={
          <div className="space-y-[var(--gap-cards-lg)]">
            <Skeleton className="h-10 w-48" />
            <div className="grid gap-[var(--gap-cards)] md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        }
      >
        <TasksPageContent eventId={eventId} />
      </Suspense>
    </EventSectionGuard>
  );
}
