"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useUserSessionContext } from "@/contexts/user-session-context";
import { useEventPermissions } from "@/hooks/use-event-permissions";
import { EventAccessDenied } from "./event-access-denied";
import type { EventSectionPermissions } from "@/types";

const SECTION_LABELS: Record<string, string> = {
  general: "General",
  tasks: "Tareas",
  guests: "Invitados",
  rsvp: "RSVP",
  vendors: "Partners",
  partners: "Partners",
  finances: "Finanzas",
  runsheet: "Orden del día",
  calendar: "Calendario",
  settings: "Configuración",
};

interface EventSectionGuardProps {
  eventId: number;
  section: keyof EventSectionPermissions;
  children: React.ReactNode;
}

export function EventSectionGuard({ eventId, section, children }: EventSectionGuardProps) {
  const { eventScoped } = useUserSessionContext();
  // Always fetch permissions (both eventScoped and guest collaborators need gating)
  const { loading, canView } = useEventPermissions(eventId, eventScoped, true);

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!canView(section)) {
    return <EventAccessDenied eventId={eventId} section={SECTION_LABELS[section] || section} />;
  }

  return <>{children}</>;
}
