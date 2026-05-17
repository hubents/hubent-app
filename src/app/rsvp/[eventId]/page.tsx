"use client";

import { useState, useEffect, use } from "react";
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
  RiPhoneLine,
  RiGlobalLine,
  RiArrowDownSLine,
  RiBusLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";
import { LocationMap } from "@/components/ui/location-map";

interface ItineraryItem {
  id: number;
  title: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
}

interface Hotel {
  id: number;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  priceRange: string | null;
  distance: string | null;
}

interface NearbyPlan {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  address: string | null;
  website: string | null;
}

interface Faq {
  id: number;
  question: string;
  answer: string;
}

interface RsvpSettings {
  showItinerary: boolean;
  showHotels: boolean;
  showNearbyPlans: boolean;
  showFaqs: boolean;
  showLocation: boolean;
  showTransport: boolean;
  allowPlusOne: boolean;
  maxCompanionsPerGuest: number;
  askDietaryRestrictions: boolean;
  customMessage: string | null;
  deadline: string | null;
  enabled: boolean;
  menuOptions: string[] | null;
}

interface Companion {
  fullName: string;
  menuPreference: string;
  dietaryRestrictions: string;
}

interface TransportOption {
  id: number;
  name: string;
  description: string | null;
  departureLocation: string | null;
  departureAddress: string | null;
  departureTime: string | null;
  returnTime: string | null;
  capacity: number | null;
  price: string | null;
  bookedSeats: number;
  availableSeats: number | null;
}

interface EventData {
  id: number;
  name: string;
  type: string;
  date: string | null;
  endDate: string | null;
  location: string | null;
  description: string | null;
  coverImage: string | null;
  settings: RsvpSettings;
  itinerary: ItineraryItem[];
  hotels: Hotel[];
  nearbyPlans: NearbyPlan[];
  faqs: Faq[];
  transportOptions: TransportOption[];
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
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [selectedTransport, setSelectedTransport] = useState<number | null>(null);

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
      } catch {
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
        body: JSON.stringify({ ...formData, companions, selectedTransport }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || "Error al enviar la confirmación");
      }
    } catch {
      setError("Error al enviar la confirmación");
    } finally {
      setSubmitting(false);
    }
  };

  // Theme accent — used for section headers and CTA buttons
  const themeAccent = "#B88A3A"; // ivory accent (default theme)
  const cream = "#FBFAF7";

  // Menu options come from rsvp_settings.menu_options (set by the host in the
  // RSVP editor). Falls back to a sensible default if the host hasn't picked.
  const menuOptionsList: string[] =
    Array.isArray(event?.settings?.menuOptions) &&
    (event!.settings!.menuOptions as string[]).length > 0
      ? (event!.settings!.menuOptions as string[])
      : ["Carne", "Pescado", "Vegetariano"];

  // Convert "1970-01-01T17:30:00.000Z" / "17:30:00" / etc → "17:30" without TZ shift
  const fmtTime = (value: string | null | undefined): string => {
    if (!value) return "";
    if (/^\d{2}:\d{2}$/.test(value)) return value;
    if (/^\d{2}:\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: cream }}
      >
        <div className="w-full max-w-lg space-y-3">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: cream }}
      >
        <div className="w-full max-w-lg text-center">
          <RiCloseLine className="h-16 w-16 mx-auto text-rose-500 mb-4" />
          <h1
            className="text-2xl font-semibold mb-2"
            style={{
              fontFamily:
                '"Playfair Display", "Cormorant Garamond", Georgia, serif',
              color: "#1a1a1a",
            }}
          >
            Evento no disponible
          </h1>
          <p style={{ color: "#666" }}>{error}</p>
        </div>
      </div>
    );
  }

  // Check if deadline has passed
  const isDeadlinePassed = event?.settings?.deadline 
    ? new Date(event.settings.deadline) < new Date() 
    : false;

  const isRsvpDisabled = !event?.settings?.enabled || isDeadlinePassed;

  if (isRsvpDisabled && !submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: cream }}
      >
        <div className="w-full max-w-md text-center">
          <RiTimeLine className="h-16 w-16 mx-auto mb-4" style={{ color: themeAccent }} />
          <h1
            className="text-2xl mb-2"
            style={{
              fontFamily:
                '"Playfair Display", "Cormorant Garamond", Georgia, serif',
              fontWeight: 600,
              color: "#1a1a1a",
            }}
          >
            {isDeadlinePassed ? "Plazo de confirmación vencido" : "RSVP no disponible"}
          </h1>
          <p className="mt-2" style={{ color: "#666", fontSize: 14, lineHeight: 1.6 }}>
            {isDeadlinePassed
              ? `El plazo para confirmar asistencia venció el ${new Date(event!.settings!.deadline!).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}.`
              : "Las confirmaciones para este evento no están habilitadas en este momento."}
          </p>
          {event && (
            <div
              className="mt-6 p-5 rounded-2xl text-left"
              style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <h3 className="font-semibold" style={{ color: "#1a1a1a" }}>
                {event.name}
              </h3>
              {event.date && (
                <p
                  className="text-sm flex items-center gap-2 mt-2"
                  style={{ color: "#666" }}
                >
                  <RiCalendarLine className="h-4 w-4" />
                  {new Date(event.date).toLocaleDateString("es-ES", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              )}
            </div>
          )}
          <p className="mt-6 text-sm" style={{ color: "#888" }}>
            Si tienes alguna consulta, contacta a los organizadores del evento.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: cream }}
      >
        <div className="w-full max-w-md text-center">
          <div
            className="h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: `${themeAccent}15` }}
          >
            <RiCheckLine className="h-10 w-10" style={{ color: themeAccent }} />
          </div>
          <h1
            className="text-3xl mb-3"
            style={{
              fontFamily:
                '"Playfair Display", "Cormorant Garamond", Georgia, serif',
              fontWeight: 600,
              color: "#1a1a1a",
            }}
          >
            ¡Gracias por confirmar!
          </h1>
          <p style={{ color: "#666", lineHeight: 1.6, fontSize: 15 }}>
            {formData.attending === "yes"
              ? "¡Nos vemos pronto! Te enviaremos más detalles por email."
              : formData.attending === "no"
                ? "Lamentamos que no puedas asistir. ¡Esperamos verte en otra ocasión!"
                : "Gracias por tu respuesta. Te mantendremos informado."}
          </p>
          {event && (
            <div
              className="mt-6 p-5 rounded-2xl text-left"
              style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }}
            >
              <h3 className="font-semibold" style={{ color: "#1a1a1a" }}>
                {event.name}
              </h3>
              {event.date && (
                <p
                  className="text-sm flex items-center gap-2 mt-2"
                  style={{ color: "#666" }}
                >
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
                <p
                  className="text-sm flex items-center gap-2 mt-1"
                  style={{ color: "#666" }}
                >
                  <RiMapPinLine className="h-4 w-4" />
                  {event.location}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const eventTimeStr = event?.date
    ? new Date(event.date).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const eventDateLabel = event?.date
    ? new Date(event.date).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="flex items-center gap-3 mb-4">
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          color: themeAccent,
        }}
      >
        {title}
      </span>
      <span
        style={{
          flex: 1,
          height: 1,
          background: themeAccent,
          opacity: 0.25,
        }}
      />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: cream }}>
      {/* Hero Section — invitation style */}
      <div
        className="relative flex items-end justify-center overflow-hidden"
        style={{
          height: "min(60vh, 480px)",
          minHeight: 320,
        }}
      >
        {event?.coverImage ? (
          <img
            src={event.coverImage}
            alt={event.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #FBF7EF 0%, #E8D9C5 60%, #C8AC83 100%)",
            }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.55) 90%)",
          }}
        />
        <div
          className="relative z-10 text-center px-6 pb-12"
          style={{ color: "#FFFFFF" }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              opacity: 0.9,
              marginBottom: 12,
            }}
          >
            Te invitamos
          </div>
          <h1
            style={{
              fontFamily:
                '"Playfair Display", "Cormorant Garamond", Georgia, serif',
              fontSize: "clamp(36px, 6vw, 56px)",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              lineHeight: 1.1,
              textShadow: "0 2px 12px rgba(0,0,0,0.35)",
            }}
          >
            {event?.name}
          </h1>
          {(eventDateLabel || event?.location) && (
            <p
              style={{
                fontSize: 14,
                marginTop: 14,
                opacity: 0.95,
                letterSpacing: "0.04em",
              }}
            >
              {eventDateLabel}
              {eventTimeStr ? ` · ${eventTimeStr}` : ""}
              {event?.location ? ` · ${event.location}` : ""}
            </p>
          )}
          {/* Ornamental flourish */}
          <div
            className="flex items-center justify-center gap-2 mt-6"
            style={{ opacity: 0.65 }}
          >
            <span style={{ width: 36, height: 1, background: "#FFFFFF" }} />
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#FFFFFF",
              }}
            />
            <span style={{ width: 36, height: 1, background: "#FFFFFF" }} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-12 pb-16">
        {/* Welcome message */}
        {event?.settings?.customMessage && (
          <div
            className="text-center mb-10"
            style={{
              fontSize: 15,
              color: "#555",
              lineHeight: 1.7,
              fontStyle: "italic",
              maxWidth: 540,
              margin: "0 auto",
            }}
          >
            {event.settings.customMessage}
          </div>
        )}

        {/* RSVP Form */}
        <div
          className="rounded-2xl"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 4px 20px -8px rgba(0,0,0,0.08)",
            padding: 28,
            marginBottom: 32,
          }}
        >
          <SectionHeader title="Confirma tu asistencia" />
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
                  {/* Companions Section */}
                  {event?.settings?.allowPlusOne && (
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Acompañantes</p>
                          <p className="text-sm text-muted-foreground">
                            Puedes agregar hasta {event.settings.maxCompanionsPerGuest || 1} acompañante{(event.settings.maxCompanionsPerGuest || 1) > 1 ? "s" : ""}
                          </p>
                        </div>
                        {companions.length < (event.settings.maxCompanionsPerGuest || 1) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setCompanions([...companions, { fullName: "", menuPreference: "", dietaryRestrictions: "" }])}
                          >
                            + Agregar
                          </Button>
                        )}
                      </div>
                      
                      {companions.map((companion, index) => (
                        <div key={index} className="space-y-3 p-3 bg-background rounded-lg border">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Acompañante {index + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setCompanions(companions.filter((_, i) => i !== index))}
                              className="text-destructive hover:text-destructive"
                            >
                              Eliminar
                            </Button>
                          </div>
                          <Input
                            placeholder="Nombre completo"
                            value={companion.fullName}
                            onChange={(e) => {
                              const updated = [...companions];
                              updated[index].fullName = e.target.value;
                              setCompanions(updated);
                            }}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Select
                              value={companion.menuPreference}
                              onValueChange={(value) => {
                                const updated = [...companions];
                                updated[index].menuPreference = value;
                                setCompanions(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Menú" />
                              </SelectTrigger>
                              <SelectContent>
                                {menuOptionsList.map((m) => (
                                  <SelectItem key={m} value={m}>
                                    {m}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="Restricciones"
                              value={companion.dietaryRestrictions}
                              onChange={(e) => {
                                const updated = [...companions];
                                updated[index].dietaryRestrictions = e.target.value;
                                setCompanions(updated);
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Menu Preference (for main guest) */}
                  {menuOptionsList.length > 0 && (
                    <div className="space-y-2">
                      <Label>Tu preferencia de menú</Label>
                      <Select
                        value={formData.menuPreference}
                        onValueChange={(value) =>
                          setFormData({ ...formData, menuPreference: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {menuOptionsList.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Dietary Restrictions (for main guest) */}
                  <div className="space-y-2">
                    <Label>Tus alergias o restricciones alimentarias</Label>
                    <Input
                      placeholder="Ej: Alergia a mariscos, intolerancia a lactosa..."
                      value={formData.dietaryRestrictions}
                      onChange={(e) => setFormData({ ...formData, dietaryRestrictions: e.target.value })}
                    />
                  </div>

                  {/* Transport Selection */}
                  {event?.settings?.showTransport && event?.transportOptions && event.transportOptions.length > 0 && (
                    <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          <RiBusLine className="h-4 w-4" />
                          Transporte
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ¿Necesitás transporte para el evento?
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-colors",
                            selectedTransport === null ? "border-primary bg-primary/5" : "hover:bg-muted"
                          )}
                          onClick={() => setSelectedTransport(null)}
                        >
                          <p className="font-medium">No necesito transporte</p>
                          <p className="text-sm text-muted-foreground">Voy por mi cuenta</p>
                        </div>
                        {event.transportOptions.map((option) => {
                          const isAvailable = option.availableSeats === null || option.availableSeats > 0;
                          const seatsNeeded = 1 + companions.filter(c => c.fullName).length;
                          const hasEnoughSeats = option.availableSeats === null || option.availableSeats >= seatsNeeded;
                          
                          return (
                            <div
                              key={option.id}
                              className={cn(
                                "p-3 rounded-lg border transition-colors",
                                !isAvailable || !hasEnoughSeats 
                                  ? "opacity-50 cursor-not-allowed" 
                                  : selectedTransport === option.id 
                                    ? "border-primary bg-primary/5 cursor-pointer" 
                                    : "hover:bg-muted cursor-pointer"
                              )}
                              onClick={() => {
                                if (isAvailable && hasEnoughSeats) {
                                  setSelectedTransport(option.id);
                                }
                              }}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">{option.name}</p>
                                  {option.departureLocation && (
                                    <p className="text-sm text-muted-foreground">
                                      Salida: {option.departureLocation}
                                      {option.departureTime && ` - ${option.departureTime}`}
                                    </p>
                                  )}
                                  {option.returnTime && (
                                    <p className="text-sm text-muted-foreground">
                                      Regreso: {option.returnTime}
                                    </p>
                                  )}
                                </div>
                                {option.capacity && (
                                  <span className={cn(
                                    "text-xs px-2 py-1 rounded",
                                    !isAvailable ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                                  )}>
                                    {option.availableSeats !== null 
                                      ? `${option.availableSeats} lugares` 
                                      : "Disponible"}
                                  </span>
                                )}
                              </div>
                              {option.description && (
                                <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                              )}
                              {!hasEnoughSeats && isAvailable && (
                                <p className="text-xs text-amber-600 mt-1">
                                  No hay suficientes lugares para tu grupo ({seatsNeeded} personas)
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
              <button
                type="submit"
                disabled={submitting || !formData.attending}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  background: themeAccent,
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: submitting || !formData.attending ? "not-allowed" : "pointer",
                  opacity: submitting || !formData.attending ? 0.5 : 1,
                  letterSpacing: "0.02em",
                }}
              >
                {submitting ? "Enviando..." : "Confirmar asistencia"}
              </button>
            </form>
          </div>

          {/* Itinerary / Horarios */}
          {event?.itinerary && event.itinerary.length > 0 && (
            <div className="mt-10">
              <SectionHeader title="Horarios" />
              <div className="space-y-1">
                {event.itinerary.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-4 py-3"
                    style={{ gridTemplateColumns: "60px 1fr" }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: themeAccent,
                      }}
                    >
                      {fmtTime(item.startTime) || "—"}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, color: "#1a1a1a", fontSize: 15 }}>
                        {item.title}
                      </p>
                      {item.location && (
                        <p
                          className="flex items-center gap-1 mt-1"
                          style={{ fontSize: 13, color: "#666" }}
                        >
                          <RiMapPinLine className="h-3.5 w-3.5" />
                          {item.location}
                        </p>
                      )}
                      {item.description && (
                        <p className="mt-1" style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location Map */}
          {event?.settings?.showLocation && event?.location && (
            <div className="mt-10">
              <SectionHeader title="Ubicación" />
              <p style={{ fontSize: 14, color: "#555", marginBottom: 12 }}>
                {event.location}
              </p>
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.06)" }}>
                <LocationMap address={event.location} className="h-64" />
              </div>
            </div>
          )}

          {/* Hotels */}
          {event?.hotels && event.hotels.length > 0 && (
            <div className="mt-10">
              <SectionHeader title="Dónde dormir" />
              <div className="space-y-4">
                {event.hotels.map((hotel) => (
                  <div key={hotel.id} className="py-3">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p style={{ fontWeight: 600, color: "#1a1a1a", fontSize: 15 }}>
                          {hotel.name}
                        </p>
                        <p style={{ fontSize: 13, color: "#666", marginTop: 2 }}>
                          {[hotel.distance, hotel.address]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      {hotel.priceRange && (
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: themeAccent,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {hotel.priceRange}
                        </span>
                      )}
                    </div>
                    {hotel.description && (
                      <p style={{ fontSize: 13, color: "#888", marginTop: 6, lineHeight: 1.55 }}>
                        {hotel.description}
                      </p>
                    )}
                    <div className="flex gap-4 mt-3">
                      {hotel.phone && (
                        <a
                          href={`tel:${hotel.phone}`}
                          className="flex items-center gap-1.5"
                          style={{ fontSize: 13, color: themeAccent }}
                        >
                          <RiPhoneLine className="h-4 w-4" /> Llamar
                        </a>
                      )}
                      {hotel.website && (
                        <a
                          href={hotel.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5"
                          style={{ fontSize: 13, color: themeAccent, textDecoration: "underline" }}
                        >
                          <RiGlobalLine className="h-4 w-4" /> Web
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nearby Plans */}
          {event?.nearbyPlans && event.nearbyPlans.length > 0 && (
            <div className="mt-10">
              <SectionHeader title="Actividades" />
              <div className="space-y-4">
                {event.nearbyPlans.map((plan) => (
                  <div key={plan.id} className="py-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <p style={{ fontWeight: 600, color: "#1a1a1a", fontSize: 15 }}>
                        {plan.name}
                      </p>
                      {plan.category && (
                        <span style={{ fontSize: 12, color: "#888" }}>
                          {plan.category}
                        </span>
                      )}
                    </div>
                    {plan.description && (
                      <p style={{ fontSize: 13, color: "#666", marginTop: 4, lineHeight: 1.5 }}>
                        {plan.description}
                      </p>
                    )}
                    {plan.address && (
                      <p
                        className="flex items-center gap-1 mt-2"
                        style={{ fontSize: 12.5, color: "#888" }}
                      >
                        <RiMapPinLine className="h-3 w-3" />
                        {plan.address}
                      </p>
                    )}
                    {plan.website && (
                      <a
                        href={plan.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 mt-2"
                        style={{ fontSize: 13, color: themeAccent, textDecoration: "underline" }}
                      >
                        <RiGlobalLine className="h-4 w-4" /> Ver más
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQs */}
          {event?.faqs && event.faqs.length > 0 && (
            <div className="mt-10">
              <SectionHeader title="Preguntas frecuentes" />
              <div className="space-y-2">
                {event.faqs.map((faq) => (
                  <details key={faq.id} className="group">
                    <summary
                      className="flex items-center justify-between cursor-pointer py-3"
                      style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
                    >
                      <span style={{ fontWeight: 600, color: "#1a1a1a", fontSize: 14 }}>
                        {faq.question}
                      </span>
                      <RiArrowDownSLine
                        className="h-5 w-5 transition-transform group-open:rotate-180"
                        style={{ color: themeAccent }}
                      />
                    </summary>
                    <p style={{ fontSize: 13.5, color: "#666", paddingBottom: 14, lineHeight: 1.6 }}>
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div
            className="text-center mt-12 pt-6"
            style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
          >
            <p style={{ fontSize: 12, color: "#999" }}>
              Powered by <span style={{ fontWeight: 600 }}>hubents</span>
            </p>
          </div>
        </div>
      </div>
    );
}
