import { EventWorkspaceShell } from "@/components/events/event-workspace-shell";

export default async function EventWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const eventId = parseInt(id, 10);

  return (
    <EventWorkspaceShell eventId={eventId}>
      {children}
    </EventWorkspaceShell>
  );
}
