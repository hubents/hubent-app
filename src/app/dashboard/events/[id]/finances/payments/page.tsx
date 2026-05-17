"use client";

import { use } from "react";
import { PaymentsPageContent } from "@/components/finance/payments-page-content";
import { EventSectionGuard } from "@/components/events/event-section-guard";

/**
 * Payments tab inside an event workspace.
 *
 * Reuses the global `<PaymentsPageContent />` so the in-event view stays in
 * lockstep with `/dashboard/finance/payments`. The component hides its scope
 * filter and pre-fills `eventId` on the create-payment drawer when an
 * `eventId` is supplied.
 */
export default function EventPaymentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);

  return (
    <EventSectionGuard eventId={eventId} section="finances">
      <PaymentsPageContent eventId={eventId} />
    </EventSectionGuard>
  );
}
