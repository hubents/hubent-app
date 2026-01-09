"use client";

import { useState, useEffect, use } from "react";
import { useEvent } from "@/contexts/event-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiShareLine,
  RiMailSendLine,
  RiWhatsappLine,
  RiLinkM,
  RiEyeLine,
  RiSettings4Line,
  RiQuestionLine,
  RiMapPinLine,
  RiCalendarLine,
  RiHotelLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";

interface RsvpSettings {
  enabled: boolean;
  deadline: string | null;
  allowPlusOne: boolean;
  askDietaryRestrictions: boolean;
  customMessage: string;
  showItinerary: boolean;
  showAccommodations: boolean;
  showLocation: boolean;
  showFaqs: boolean;
}

export default function EventRsvpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);
  const { activeEvent, setActiveEvent } = useEvent();

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<RsvpSettings>({
    enabled: true,
    deadline: null,
    allowPlusOne: false,
    askDietaryRestrictions: true,
    customMessage: "",
    showItinerary: true,
    showAccommodations: true,
    showLocation: true,
    showFaqs: true,
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        const data = await res.json();
        if (data.success) {
          setActiveEvent(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch event:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [eventId, setActiveEvent]);

  const rsvpUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/rsvp/${eventId}` 
    : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(rsvpUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(
      `¡Estás invitado! Confirma tu asistencia aquí: ${rsvpUrl}`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">RSVP e Invitaciones</h1>
          <p className="text-[var(--muted-foreground)]">
            Configura la página de confirmación y envía invitaciones
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <RiEyeLine className="h-4 w-4" />
            Vista previa
          </Button>
          <Button className="gap-2">
            <RiMailSendLine className="h-4 w-4" />
            Enviar invitaciones
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Share Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiShareLine className="h-5 w-5" />
              Compartir invitación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Enlace de RSVP</Label>
              <div className="flex gap-2">
                <Input value={rsvpUrl} readOnly className="flex-1" />
                <Button variant="outline" onClick={handleCopyLink}>
                  {copied ? "¡Copiado!" : <RiLinkM className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="gap-2" onClick={handleShareWhatsApp}>
                <RiWhatsappLine className="h-4 w-4 text-green-600" />
                WhatsApp
              </Button>
              <Button variant="outline" className="gap-2">
                <RiMailSendLine className="h-4 w-4 text-blue-600" />
                Email
              </Button>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-[var(--muted-foreground)] mb-3">
                Estadísticas de invitaciones
              </p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Enviadas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Abiertas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Respondidas</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiSettings4Line className="h-5 w-5" />
              Configuración de RSVP
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">RSVP Activo</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Permitir confirmaciones
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Permitir acompañante</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Los invitados pueden traer +1
                </p>
              </div>
              <Switch
                checked={settings.allowPlusOne}
                onCheckedChange={(checked) => setSettings({ ...settings, allowPlusOne: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Preferencias alimentarias</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Preguntar por restricciones
                </p>
              </div>
              <Switch
                checked={settings.askDietaryRestrictions}
                onCheckedChange={(checked) => setSettings({ ...settings, askDietaryRestrictions: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha límite de confirmación</Label>
              <Input
                type="date"
                value={settings.deadline || ""}
                onChange={(e) => setSettings({ ...settings, deadline: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Page Sections */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Secciones de la página RSVP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className={cn(
                "p-4 rounded-lg border-2 cursor-pointer transition-colors",
                settings.showItinerary ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)]"
              )}
              onClick={() => setSettings({ ...settings, showItinerary: !settings.showItinerary })}
              >
                <RiCalendarLine className="h-6 w-6 mb-2 text-[var(--primary)]" />
                <p className="font-medium">Itinerario</p>
                <p className="text-sm text-[var(--muted-foreground)]">Cronograma del evento</p>
              </div>

              <div className={cn(
                "p-4 rounded-lg border-2 cursor-pointer transition-colors",
                settings.showAccommodations ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)]"
              )}
              onClick={() => setSettings({ ...settings, showAccommodations: !settings.showAccommodations })}
              >
                <RiHotelLine className="h-6 w-6 mb-2 text-[var(--primary)]" />
                <p className="font-medium">Acomodaciones</p>
                <p className="text-sm text-[var(--muted-foreground)]">Hoteles recomendados</p>
              </div>

              <div className={cn(
                "p-4 rounded-lg border-2 cursor-pointer transition-colors",
                settings.showLocation ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)]"
              )}
              onClick={() => setSettings({ ...settings, showLocation: !settings.showLocation })}
              >
                <RiMapPinLine className="h-6 w-6 mb-2 text-[var(--primary)]" />
                <p className="font-medium">Ubicación</p>
                <p className="text-sm text-[var(--muted-foreground)]">Mapa y direcciones</p>
              </div>

              <div className={cn(
                "p-4 rounded-lg border-2 cursor-pointer transition-colors",
                settings.showFaqs ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)]"
              )}
              onClick={() => setSettings({ ...settings, showFaqs: !settings.showFaqs })}
              >
                <RiQuestionLine className="h-6 w-6 mb-2 text-[var(--primary)]" />
                <p className="font-medium">FAQs</p>
                <p className="text-sm text-[var(--muted-foreground)]">Preguntas frecuentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom Message */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Mensaje personalizado</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Escribe un mensaje personalizado para tus invitados..."
              value={settings.customMessage}
              onChange={(e) => setSettings({ ...settings, customMessage: e.target.value })}
              rows={4}
            />
            <p className="text-sm text-[var(--muted-foreground)] mt-2">
              Este mensaje aparecerá en la página de RSVP y en las invitaciones enviadas.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
