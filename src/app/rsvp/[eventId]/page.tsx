"use client";

import { useState, useEffect, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiCalendarLine,
  RiMapPinLine,
  RiTimeLine,
  RiCheckLine,
  RiCloseLine,
  RiQuestionLine,
  RiHotelLine,
  RiUserLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface EventData {
  id: number;
  name: string;
  type: string;
  date: string | null;
  endDate: string | null;
  location: string | null;
  description: string | null;
}

interface RsvpFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  attending: "yes" | "no" | "maybe" | "";
  plusOne: boolean;
  plusOneName: string;
  menuPreference: string;
  dietaryRestrictions: string;
  message: string;
}

export default function PublicRsvpPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const eventIdNum = parseInt(eventId, 10);

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<RsvpFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    attending: "",
    plusOne: false,
    plusOneName: "",
    menuPreference: "",
    dietaryRestrictions: "",
    message: "",
  });

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/rsvp/event/${eventIdNum}`);
        const data = await res.json();
        if (data.success) {
          setEvent(data.data);
        } else {
          setError("Evento no encontrado");
        }
      } catch (err) {
        setError("Error al cargar el evento");
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [eventIdNum]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.email || !formData.attending) {
      setError("Por favor completa los campos requeridos");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/rsvp/event/${eventIdNum}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || "Error al enviar la confirmación");
      }
    } catch (err) {
      setError("Error al enviar la confirmación");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 space-y-4">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
            <Skeleton className="h-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="p-8">
            <RiCloseLine className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Evento no disponible</h1>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="p-8">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <RiCheckLine className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">¡Gracias por confirmar!</h1>
            <p className="text-muted-foreground mb-6">
              {formData.attending === "yes"
                ? "¡Nos vemos pronto! Te enviaremos más detalles por email."
                : formData.attending === "no"
                ? "Lamentamos que no puedas asistir. ¡Esperamos verte en otra ocasión!"
                : "Gracias por tu respuesta. Te mantendremos informado."}
            </p>
            {event && (
              <div className="p-4 bg-muted rounded-lg text-left">
                <h3 className="font-semibold">{event.name}</h3>
                {event.date && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                    <RiCalendarLine className="h-4 w-4" />
                    {new Date(event.date).toLocaleDateString("es-ES", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
                {event.location && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <RiMapPinLine className="h-4 w-4" />
                    {event.location}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Hero Section */}
      <div className="relative h-64 md:h-80 bg-primary/10 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80" />
        <div className="relative z-10 text-center px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{event?.name}</h1>
          {event?.date && (
            <p className="text-lg text-muted-foreground flex items-center justify-center gap-2">
              <RiCalendarLine className="h-5 w-5" />
              {new Date(event.date).toLocaleDateString("es-ES", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 -mt-16 relative z-20">
        {/* Event Info Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              {event?.date && (
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <RiCalendarLine className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Fecha</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.date).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}
              {event?.location && (
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <RiMapPinLine className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Ubicación</p>
                    <p className="text-sm text-muted-foreground">{event.location}</p>
                  </div>
                </div>
              )}
            </div>
            {event?.description && (
              <p className="mt-4 text-muted-foreground">{event.description}</p>
            )}
          </CardContent>
        </Card>

        {/* RSVP Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Confirma tu asistencia</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Attendance Selection */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "yes", label: "Asistiré", icon: RiCheckLine, color: "border-green-500 bg-green-50 text-green-700" },
                  { value: "no", label: "No podré", icon: RiCloseLine, color: "border-red-500 bg-red-50 text-red-700" },
                  { value: "maybe", label: "Tal vez", icon: RiQuestionLine, color: "border-yellow-500 bg-yellow-50 text-yellow-700" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, attending: option.value as "yes" | "no" | "maybe" })}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2",
                      formData.attending === option.value
                        ? option.color
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <option.icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                ))}
              </div>

              {/* Personal Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    placeholder="Tu nombre"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Apellido</Label>
                  <Input
                    placeholder="Tu apellido"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    placeholder="+54 9 11 1234-5678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              {formData.attending === "yes" && (
                <>
                  {/* Plus One */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="plusOne"
                        checked={formData.plusOne}
                        onChange={(e) => setFormData({ ...formData, plusOne: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="plusOne" className="cursor-pointer">
                        Llevaré acompañante
                      </Label>
                    </div>
                    {formData.plusOne && (
                      <Input
                        placeholder="Nombre del acompañante"
                        value={formData.plusOneName}
                        onChange={(e) => setFormData({ ...formData, plusOneName: e.target.value })}
                      />
                    )}
                  </div>

                  {/* Menu Preference */}
                  <div className="space-y-2">
                    <Label>Preferencia de menú</Label>
                    <Select
                      value={formData.menuPreference}
                      onValueChange={(value) => setFormData({ ...formData, menuPreference: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="vegetariano">Vegetariano</SelectItem>
                        <SelectItem value="vegano">Vegano</SelectItem>
                        <SelectItem value="celiaco">Celíaco</SelectItem>
                        <SelectItem value="kosher">Kosher</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dietary Restrictions */}
                  <div className="space-y-2">
                    <Label>Alergias o restricciones alimentarias</Label>
                    <Input
                      placeholder="Ej: Alergia a mariscos, intolerancia a lactosa..."
                      value={formData.dietaryRestrictions}
                      onChange={(e) => setFormData({ ...formData, dietaryRestrictions: e.target.value })}
                    />
                  </div>
                </>
              )}

              {/* Message */}
              <div className="space-y-2">
                <Label>Mensaje para los anfitriones (opcional)</Label>
                <Textarea
                  placeholder="Escribe un mensaje..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={submitting || !formData.attending}
              >
                {submitting ? "Enviando..." : "Confirmar asistencia"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Powered by <span className="font-semibold">hubents</span>
        </p>
      </div>
    </div>
  );
}
