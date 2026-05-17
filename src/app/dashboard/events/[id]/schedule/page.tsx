"use client";

import { use } from "react";
import { EventSectionGuard } from "@/components/events/event-section-guard";
import { CalendarPageContent } from "@/app/dashboard/calendar/page";

function EventCalendar({ eventId }: { eventId: number }) {
  return <CalendarPageContent eventId={eventId} defaultRange="week" />;
}

export default function EventSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);

  return (
    <EventSectionGuard eventId={eventId} section="calendar">
      <EventCalendar eventId={eventId} />
    </EventSectionGuard>
  );
}
