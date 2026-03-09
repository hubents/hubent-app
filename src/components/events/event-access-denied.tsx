"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiLockLine, RiArrowLeftLine } from "@remixicon/react";

interface EventAccessDeniedProps {
  eventId: number;
  section?: string;
}

export function EventAccessDenied({ eventId, section }: EventAccessDeniedProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <RiLockLine className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Sin acceso a esta sección</h3>
            <p className="text-sm text-muted-foreground mt-1">
              No tenés permisos para acceder a {section ? `la sección "${section}"` : "esta sección"} de este evento.
              Contactá al organizador si necesitás acceso.
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => router.push(`/dashboard/events/${eventId}`)}
          >
            <RiArrowLeftLine className="h-4 w-4" />
            Volver al evento
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
