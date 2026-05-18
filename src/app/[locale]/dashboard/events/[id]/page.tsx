import { EventDetailClient } from "@/components/events/event-detail-client";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const eventId = parseInt(id, 10);

  return <EventDetailClient eventId={eventId} />;
}
