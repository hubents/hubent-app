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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  RiCheckLine,
  RiLoader4Line,
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiImageAddLine,
  RiCompassLine,
  RiTimeLine,
  RiBusLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useFileUpload } from "@/hooks/use-file-upload";

interface RsvpSettings {
  enabled: boolean;
  deadline: string | null;
  allowPlusOne: boolean;
  maxCompanionsPerGuest: number;
  askDietaryRestrictions: boolean;
  customMessage: string;
  showItinerary: boolean;
  showHotels: boolean;
  showNearbyPlans: boolean;
  showLocation: boolean;
  showFaqs: boolean;
  showTransport: boolean;
}

interface ItineraryItem {
  id: number;
  title: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  orderIndex: number;
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
  imageUrl: string | null;
  orderIndex: number;
}

interface NearbyPlan {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  address: string | null;
  website: string | null;
  imageUrl: string | null;
  orderIndex: number;
}

interface Faq {
  id: number;
  question: string;
  answer: string;
  orderIndex: number;
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
  mapImageUrl: string | null;
  isActive: boolean;
  orderIndex: number;
}

interface Guest {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
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
    maxCompanionsPerGuest: 1,
    askDietaryRestrictions: true,
    customMessage: "",
    showItinerary: true,
    showHotels: true,
    showNearbyPlans: true,
    showLocation: true,
    showFaqs: true,
    showTransport: false,
  });
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [nearbyPlans, setNearbyPlans] = useState<NearbyPlan[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [transportOptions, setTransportOptions] = useState<TransportOption[]>([]);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ItineraryItem | Hotel | NearbyPlan | Faq | TransportOption | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [selectedGuests, setSelectedGuests] = useState<number[]>([]);
  const [inviteMessage, setInviteMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);

  // File upload hook for cover image
  const { upload: uploadImage, uploading: uploadingImage, error: uploadError } = useFileUpload({
    folder: `events/${eventId}/cover`,
    allowedTypes: ["image/*"],
    onSuccess: async (result) => {
      setCoverImage(result.url);
      // Save to event
      await fetch(`/api/events/${eventId}/rsvp`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: result.url }),
      });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadImage(file);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch event
        const eventRes = await fetch(`/api/events/${eventId}`);
        const eventData = await eventRes.json();
        if (eventData.success) {
          setActiveEvent(eventData.data);
          setCoverImage(eventData.data.coverImage || null);
        }

        // Fetch RSVP data
        const rsvpRes = await fetch(`/api/events/${eventId}/rsvp`);
        const rsvpData = await rsvpRes.json();
        if (rsvpData.success) {
          if (rsvpData.data.settings) {
            setSettings({
              enabled: rsvpData.data.settings.enabled ?? true,
              deadline: rsvpData.data.settings.deadline || null,
              allowPlusOne: rsvpData.data.settings.allowPlusOne ?? false,
              maxCompanionsPerGuest: rsvpData.data.settings.maxCompanionsPerGuest ?? 1,
              askDietaryRestrictions: rsvpData.data.settings.askDietaryRestrictions ?? true,
              customMessage: rsvpData.data.settings.customMessage || "",
              showItinerary: rsvpData.data.settings.showItinerary ?? true,
              showHotels: rsvpData.data.settings.showHotels ?? true,
              showNearbyPlans: rsvpData.data.settings.showNearbyPlans ?? true,
              showLocation: rsvpData.data.settings.showLocation ?? true,
              showFaqs: rsvpData.data.settings.showFaqs ?? true,
              showTransport: rsvpData.data.settings.showTransport ?? false,
            });
          }
          setItinerary(rsvpData.data.itinerary || []);
          setHotels(rsvpData.data.hotels || []);
          setNearbyPlans(rsvpData.data.nearbyPlans || []);
          setFaqs(rsvpData.data.faqs || []);
        }

        // Fetch transport options
        const transportRes = await fetch(`/api/events/${eventId}/rsvp/transport`);
        const transportData = await transportRes.json();
        if (transportData.success) {
          setTransportOptions(transportData.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
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

  const fetchGuests = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/guests`);
      const data = await res.json();
      if (data.success) {
        setGuests(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch guests:", error);
    }
  };

  const handleOpenSendDialog = async () => {
    await fetchGuests();
    setShowSendDialog(true);
    setSendResult(null);
  };

  const handleToggleGuest = (guestId: number) => {
    setSelectedGuests((prev) =>
      prev.includes(guestId)
        ? prev.filter((id) => id !== guestId)
        : [...prev, guestId]
    );
  };

  const handleSelectAll = () => {
    const guestsWithEmail = guests.filter((g) => g.email);
    if (selectedGuests.length === guestsWithEmail.length) {
      setSelectedGuests([]);
    } else {
      setSelectedGuests(guestsWithEmail.map((g) => g.id));
    }
  };

  const handleSendInvitations = async () => {
    if (selectedGuests.length === 0) return;
    setSending(true);
    setSendResult(null);

    try {
      const res = await fetch(`/api/events/${eventId}/invitations/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestIds: selectedGuests,
          customMessage: inviteMessage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSendResult(data.data);
        setSelectedGuests([]);
      }
    } catch (error) {
      console.error("Failed to send invitations:", error);
    } finally {
      setSending(false);
    }
  };

  // CRUD functions for itinerary
  const handleAddItinerary = async (item: Partial<ItineraryItem>) => {
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp/itinerary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const data = await res.json();
      if (data.success) {
        setItinerary([...itinerary, data.data]);
        setEditingSection(null);
      }
    } catch (error) {
      console.error("Failed to add itinerary:", error);
    }
  };

  const handleDeleteItinerary = async (id: number) => {
    try {
      await fetch(`/api/events/${eventId}/rsvp/itinerary?id=${id}`, { method: "DELETE" });
      setItinerary(itinerary.filter((i) => i.id !== id));
    } catch (error) {
      console.error("Failed to delete itinerary:", error);
    }
  };

  const handleEditItinerary = async (item: ItineraryItem) => {
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp/itinerary`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const data = await res.json();
      if (data.success) {
        setItinerary(itinerary.map((i) => (i.id === item.id ? item : i)));
        setEditingSection(null);
        setEditingItem(null);
      }
    } catch (error) {
      console.error("Failed to edit itinerary:", error);
    }
  };

  // CRUD functions for hotels
  const handleAddHotel = async (item: Partial<Hotel>) => {
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp/hotels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const data = await res.json();
      if (data.success) {
        setHotels([...hotels, data.data]);
        setEditingSection(null);
      }
    } catch (error) {
      console.error("Failed to add hotel:", error);
    }
  };

  const handleDeleteHotel = async (id: number) => {
    try {
      await fetch(`/api/events/${eventId}/rsvp/hotels?id=${id}`, { method: "DELETE" });
      setHotels(hotels.filter((h) => h.id !== id));
    } catch (error) {
      console.error("Failed to delete hotel:", error);
    }
  };

  const handleEditHotel = async (item: Hotel) => {
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp/hotels`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const data = await res.json();
      if (data.success) {
        setHotels(hotels.map((h) => (h.id === item.id ? item : h)));
        setEditingSection(null);
        setEditingItem(null);
      }
    } catch (error) {
      console.error("Failed to edit hotel:", error);
    }
  };

  // CRUD functions for nearby plans
  const handleAddNearbyPlan = async (item: Partial<NearbyPlan>) => {
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp/nearby-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const data = await res.json();
      if (data.success) {
        setNearbyPlans([...nearbyPlans, data.data]);
        setEditingSection(null);
      }
    } catch (error) {
      console.error("Failed to add nearby plan:", error);
    }
  };

  const handleDeleteNearbyPlan = async (id: number) => {
    try {
      await fetch(`/api/events/${eventId}/rsvp/nearby-plans?id=${id}`, { method: "DELETE" });
      setNearbyPlans(nearbyPlans.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Failed to delete nearby plan:", error);
    }
  };

  const handleEditNearbyPlan = async (item: NearbyPlan) => {
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp/nearby-plans`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const data = await res.json();
      if (data.success) {
        setNearbyPlans(nearbyPlans.map((p) => (p.id === item.id ? item : p)));
        setEditingSection(null);
        setEditingItem(null);
      }
    } catch (error) {
      console.error("Failed to edit nearby plan:", error);
    }
  };

  // CRUD functions for FAQs
  const handleAddFaq = async (item: Partial<Faq>) => {
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp/faqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const data = await res.json();
      if (data.success) {
        setFaqs([...faqs, data.data]);
        setEditingSection(null);
      }
    } catch (error) {
      console.error("Failed to add FAQ:", error);
    }
  };

  const handleDeleteFaq = async (id: number) => {
    try {
      await fetch(`/api/events/${eventId}/rsvp/faqs?id=${id}`, { method: "DELETE" });
      setFaqs(faqs.filter((f) => f.id !== id));
    } catch (error) {
      console.error("Failed to delete FAQ:", error);
    }
  };

  // CRUD functions for transport
  const handleAddTransport = async (item: Partial<TransportOption>) => {
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp/transport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const data = await res.json();
      if (data.success) {
        setTransportOptions([...transportOptions, data.data]);
        setEditingSection(null);
      }
    } catch (error) {
      console.error("Failed to add transport:", error);
    }
  };

  const handleDeleteTransport = async (id: number) => {
    try {
      await fetch(`/api/events/${eventId}/rsvp/transport?id=${id}`, { method: "DELETE" });
      setTransportOptions(transportOptions.filter((t) => t.id !== id));
    } catch (error) {
      console.error("Failed to delete transport:", error);
    }
  };

  const handleEditTransport = async (item: TransportOption) => {
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp/transport`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const data = await res.json();
      if (data.success) {
        setTransportOptions(transportOptions.map((t) => (t.id === item.id ? item : t)));
        setEditingSection(null);
        setEditingItem(null);
      }
    } catch (error) {
      console.error("Failed to edit transport:", error);
    }
  };

  // Save settings
  const handleSaveSettings = async () => {
    try {
      await fetch(`/api/events/${eventId}/rsvp`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings, coverImage }),
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
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
          <Link href={`/rsvp/${eventId}`} target="_blank">
            <Button variant="outline" className="gap-2">
              <RiEyeLine className="h-4 w-4" />
              Vista previa
            </Button>
          </Link>
          <Button className="gap-2" onClick={handleOpenSendDialog}>
            <RiMailSendLine className="h-4 w-4" />
            Enviar invitaciones
          </Button>
        </div>
      </div>

      {/* Send Invitations Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enviar Invitaciones por Email</DialogTitle>
            <DialogDescription>
              Selecciona los invitados a los que deseas enviar la invitación
            </DialogDescription>
          </DialogHeader>

          {sendResult ? (
            <div className="py-6 text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <RiCheckLine className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">¡Invitaciones enviadas!</h3>
              <p className="text-muted-foreground">
                {sendResult.sent} enviadas correctamente
                {sendResult.failed > 0 && `, ${sendResult.failed} fallidas`}
              </p>
              <Button className="mt-4" onClick={() => setShowSendDialog(false)}>
                Cerrar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {guests.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                      {selectedGuests.length === guests.filter((g) => g.email).length
                        ? "Deseleccionar todos"
                        : "Seleccionar todos"}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {selectedGuests.length} seleccionados
                    </span>
                  </div>

                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {guests.map((guest) => (
                      <div
                        key={guest.id}
                        className={cn(
                          "flex items-center gap-3 p-3",
                          !guest.email && "opacity-50"
                        )}
                      >
                        <Checkbox
                          checked={selectedGuests.includes(guest.id)}
                          onCheckedChange={() => handleToggleGuest(guest.id)}
                          disabled={!guest.email}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
                            {guest.firstName} {guest.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {guest.email || "Sin email"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label>Mensaje personalizado (opcional)</Label>
                    <Textarea
                      placeholder="Añade un mensaje especial para los invitados..."
                      value={inviteMessage}
                      onChange={(e) => setInviteMessage(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowSendDialog(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSendInvitations}
                      disabled={sending || selectedGuests.length === 0}
                      className="gap-2"
                    >
                      {sending ? (
                        <>
                          <RiLoader4Line className="h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <RiMailSendLine className="h-4 w-4" />
                          Enviar ({selectedGuests.length})
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    No hay invitados registrados
                  </p>
                  <Link href={`/dashboard/events/${eventId}/guests`}>
                    <Button variant="outline">Añadir invitados</Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                <p className="font-medium">Permitir acompañantes</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Los invitados pueden traer acompañantes
                </p>
              </div>
              <Switch
                checked={settings.allowPlusOne}
                onCheckedChange={(checked) => setSettings({ ...settings, allowPlusOne: checked })}
              />
            </div>

            {settings.allowPlusOne && (
              <div className="space-y-2 pl-4 border-l-2 border-[var(--primary)]/20">
                <Label>Máximo de acompañantes por invitado</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.maxCompanionsPerGuest}
                  onChange={(e) => setSettings({ ...settings, maxCompanionsPerGuest: parseInt(e.target.value) || 1 })}
                  className="w-24"
                />
                <p className="text-xs text-[var(--muted-foreground)]">
                  Cada invitado podrá agregar hasta {settings.maxCompanionsPerGuest} acompañante{settings.maxCompanionsPerGuest > 1 ? "s" : ""}
                </p>
              </div>
            )}

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
                settings.showHotels ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)]"
              )}
              onClick={() => setSettings({ ...settings, showHotels: !settings.showHotels })}
              >
                <RiHotelLine className="h-6 w-6 mb-2 text-[var(--primary)]" />
                <p className="font-medium">Hoteles</p>
                <p className="text-sm text-[var(--muted-foreground)]">Hoteles recomendados</p>
              </div>

              <div className={cn(
                "p-4 rounded-lg border-2 cursor-pointer transition-colors",
                settings.showNearbyPlans ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)]"
              )}
              onClick={() => setSettings({ ...settings, showNearbyPlans: !settings.showNearbyPlans })}
              >
                <RiCompassLine className="h-6 w-6 mb-2 text-[var(--primary)]" />
                <p className="font-medium">Planes cercanos</p>
                <p className="text-sm text-[var(--muted-foreground)]">Actividades y lugares</p>
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

        {/* Cover Image */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiImageAddLine className="h-5 w-5" />
              Imagen del evento
            </CardTitle>
            <div>
              <input
                type="file"
                id="cover-image-upload"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("cover-image-upload")?.click()}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <>
                    <RiLoader4Line className="h-4 w-4 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  "Cambiar foto"
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {uploadError && (
              <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                {uploadError}
              </div>
            )}
            {coverImage ? (
              <div className="relative h-48 rounded-lg overflow-hidden group">
                <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => document.getElementById("cover-image-upload")?.click()}
                  >
                    Cambiar imagen
                  </Button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="cover-image-upload"
                className="h-48 rounded-lg bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors border-2 border-dashed border-muted-foreground/25"
              >
                <div className="text-center text-muted-foreground">
                  <RiImageAddLine className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Haz clic para añadir una imagen</p>
                  <p className="text-xs mt-1">JPG, PNG, GIF hasta 10MB</p>
                  <p className="text-xs mt-1 opacity-75">Tamaño recomendado: 1920x600 px (ratio 3.2:1)</p>
                </div>
              </label>
            )}
          </CardContent>
        </Card>

        {/* Itinerary Section */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiCalendarLine className="h-5 w-5" />
              Itinerario
              <Switch
                checked={settings.showItinerary}
                onCheckedChange={(checked) => setSettings({ ...settings, showItinerary: checked })}
              />
            </CardTitle>
            <Button size="sm" className="gap-1" onClick={() => setEditingSection("itinerary")}>
              <RiAddLine className="h-4 w-4" />
              Añadir
            </Button>
          </CardHeader>
          <CardContent>
            {itinerary.length > 0 ? (
              <div className="space-y-3">
                {itinerary.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <RiTimeLine className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">{item.title}</p>
                      {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                      {item.startTime && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(item.startTime).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                          {item.endTime && ` - ${new Date(item.endTime).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setEditingItem(item);
                        setEditingSection("itinerary-edit");
                      }}>
                        <RiEditLine className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteItinerary(item.id)}>
                        <RiDeleteBinLine className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <RiCalendarLine className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Añade el cronograma del evento</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hotels Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiHotelLine className="h-5 w-5" />
              Hoteles
              <Switch
                checked={settings.showHotels}
                onCheckedChange={(checked) => setSettings({ ...settings, showHotels: checked })}
              />
            </CardTitle>
            <Button size="sm" className="gap-1" onClick={() => setEditingSection("hotel")}>
              <RiAddLine className="h-4 w-4" />
              Añadir
            </Button>
          </CardHeader>
          <CardContent>
            {hotels.length > 0 ? (
              <div className="space-y-3">
                {hotels.map((hotel) => (
                  <div key={hotel.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium">{hotel.name}</p>
                      {hotel.address && <p className="text-sm text-muted-foreground">{hotel.address}</p>}
                      {hotel.priceRange && <p className="text-xs text-muted-foreground">{hotel.priceRange}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setEditingItem(hotel);
                        setEditingSection("hotel-edit");
                      }}>
                        <RiEditLine className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteHotel(hotel.id)}>
                        <RiDeleteBinLine className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <RiHotelLine className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Recomienda hoteles cercanos</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nearby Plans Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiCompassLine className="h-5 w-5" />
              Planes cercanos
              <Switch
                checked={settings.showNearbyPlans}
                onCheckedChange={(checked) => setSettings({ ...settings, showNearbyPlans: checked })}
              />
            </CardTitle>
            <Button size="sm" className="gap-1" onClick={() => setEditingSection("nearbyPlan")}>
              <RiAddLine className="h-4 w-4" />
              Añadir
            </Button>
          </CardHeader>
          <CardContent>
            {nearbyPlans.length > 0 ? (
              <div className="space-y-3">
                {nearbyPlans.map((plan) => (
                  <div key={plan.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium">{plan.name}</p>
                      {plan.category && <span className="text-xs bg-muted px-2 py-0.5 rounded">{plan.category}</span>}
                      {plan.description && <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setEditingItem(plan);
                        setEditingSection("nearbyPlan-edit");
                      }}>
                        <RiEditLine className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteNearbyPlan(plan.id)}>
                        <RiDeleteBinLine className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <RiCompassLine className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Sugiere actividades cercanas</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transport Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiBusLine className="h-5 w-5" />
              Transporte
              <Switch
                checked={settings.showTransport}
                onCheckedChange={(checked) => setSettings({ ...settings, showTransport: checked })}
              />
            </CardTitle>
            <Button size="sm" className="gap-1" onClick={() => setEditingSection("transport")}>
              <RiAddLine className="h-4 w-4" />
              Añadir
            </Button>
          </CardHeader>
          <CardContent>
            {transportOptions.length > 0 ? (
              <div className="space-y-3">
                {transportOptions.map((transport) => (
                  <div key={transport.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium">{transport.name}</p>
                      {transport.departureLocation && (
                        <p className="text-sm text-muted-foreground">
                          Salida: {transport.departureLocation} {transport.departureTime && `- ${transport.departureTime}`}
                        </p>
                      )}
                      {transport.returnTime && (
                        <p className="text-sm text-muted-foreground">Regreso: {transport.returnTime}</p>
                      )}
                      {transport.capacity && (
                        <p className="text-xs text-muted-foreground">Capacidad: {transport.capacity} personas</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setEditingItem(transport);
                        setEditingSection("transport-edit");
                      }}>
                        <RiEditLine className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteTransport(transport.id)}>
                        <RiDeleteBinLine className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <RiBusLine className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Configura opciones de transporte</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* FAQs Section */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiQuestionLine className="h-5 w-5" />
              Preguntas frecuentes
              <Switch
                checked={settings.showFaqs}
                onCheckedChange={(checked) => setSettings({ ...settings, showFaqs: checked })}
              />
            </CardTitle>
            <Button size="sm" className="gap-1" onClick={() => setEditingSection("faq")}>
              <RiAddLine className="h-4 w-4" />
              Añadir FAQ
            </Button>
          </CardHeader>
          <CardContent>
            {faqs.length > 0 ? (
              <div className="space-y-3">
                {faqs.map((faq) => (
                  <div key={faq.id} className="p-3 rounded-lg border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{faq.question}</p>
                        <p className="text-sm text-muted-foreground mt-1">{faq.answer}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteFaq(faq.id)}>
                        <RiDeleteBinLine className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <RiQuestionLine className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Añade preguntas frecuentes para tus invitados</p>
              </div>
            )}
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
            <p className="text-sm text-muted-foreground mt-2">
              Este mensaje aparecerá en la página de RSVP y en las invitaciones enviadas.
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="lg:col-span-2 flex justify-end">
          <Button onClick={handleSaveSettings} className="gap-2">
            <RiCheckLine className="h-4 w-4" />
            Guardar cambios
          </Button>
        </div>
      </div>

      {/* Add Itinerary Dialog */}
      <Dialog open={editingSection === "itinerary"} onOpenChange={(open) => !open && setEditingSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir al itinerario</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const timeValue = formData.get("startTime") as string;
            // Convert time (HH:mm) to a full datetime for today
            const startTime = timeValue ? new Date(`2000-01-01T${timeValue}:00`).toISOString() : null;
            handleAddItinerary({
              title: formData.get("title") as string,
              description: formData.get("description") as string,
              startTime,
              location: formData.get("location") as string,
            });
          }} className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input name="title" required placeholder="Ej: Ceremonia" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea name="description" placeholder="Detalles del momento..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input name="startTime" type="time" />
              </div>
              <div className="space-y-2">
                <Label>Lugar</Label>
                <Input name="location" placeholder="Ubicación" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingSection(null)}>Cancelar</Button>
              <Button type="submit">Añadir</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Itinerary Dialog */}
      <Dialog open={editingSection === "itinerary-edit"} onOpenChange={(open) => {
        if (!open) {
          setEditingSection(null);
          setEditingItem(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar itinerario</DialogTitle>
          </DialogHeader>
          {editingItem && "title" in editingItem && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const timeValue = formData.get("startTime") as string;
              const startTime = timeValue ? new Date(`2000-01-01T${timeValue}:00`).toISOString() : null;
              handleEditItinerary({
                ...(editingItem as ItineraryItem),
                title: formData.get("title") as string,
                description: formData.get("description") as string,
                startTime,
                location: formData.get("location") as string,
              });
            }} className="space-y-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input 
                  name="title" 
                  required 
                  defaultValue={(editingItem as ItineraryItem).title} 
                  placeholder="Ej: Ceremonia" 
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea 
                  name="description" 
                  defaultValue={(editingItem as ItineraryItem).description || ""} 
                  placeholder="Detalles del momento..." 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hora</Label>
                  <Input 
                    name="startTime" 
                    type="time" 
                    defaultValue={(editingItem as ItineraryItem).startTime 
                      ? new Date((editingItem as ItineraryItem).startTime!).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false })
                      : ""
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lugar</Label>
                  <Input 
                    name="location" 
                    defaultValue={(editingItem as ItineraryItem).location || ""} 
                    placeholder="Ubicación" 
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setEditingSection(null);
                  setEditingItem(null);
                }}>Cancelar</Button>
                <Button type="submit">Guardar</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Hotel Dialog */}
      <Dialog open={editingSection === "hotel"} onOpenChange={(open) => !open && setEditingSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir hotel</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleAddHotel({
              name: formData.get("name") as string,
              description: formData.get("description") as string,
              address: formData.get("address") as string,
              phone: formData.get("phone") as string,
              website: formData.get("website") as string,
              priceRange: formData.get("priceRange") as string,
              distance: formData.get("distance") as string,
            });
          }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input name="name" required placeholder="Nombre del hotel" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea name="description" placeholder="Descripción breve..." />
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input name="address" placeholder="Dirección completa" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input name="phone" placeholder="+54 11 1234-5678" />
              </div>
              <div className="space-y-2">
                <Label>Rango de precios</Label>
                <Input name="priceRange" placeholder="$$$ - $$$$" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sitio web</Label>
                <Input name="website" placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Distancia</Label>
                <Input name="distance" placeholder="A 5 min del evento" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingSection(null)}>Cancelar</Button>
              <Button type="submit">Añadir</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Hotel Dialog */}
      <Dialog open={editingSection === "hotel-edit"} onOpenChange={(open) => {
        if (!open) {
          setEditingSection(null);
          setEditingItem(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar hotel</DialogTitle>
          </DialogHeader>
          {editingItem && "priceRange" in editingItem && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleEditHotel({
                ...(editingItem as Hotel),
                name: formData.get("name") as string,
                description: formData.get("description") as string,
                address: formData.get("address") as string,
                phone: formData.get("phone") as string,
                website: formData.get("website") as string,
                priceRange: formData.get("priceRange") as string,
                distance: formData.get("distance") as string,
              });
            }} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input name="name" required defaultValue={(editingItem as Hotel).name} placeholder="Nombre del hotel" />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea name="description" defaultValue={(editingItem as Hotel).description || ""} placeholder="Descripción breve..." />
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input name="address" defaultValue={(editingItem as Hotel).address || ""} placeholder="Dirección completa" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input name="phone" defaultValue={(editingItem as Hotel).phone || ""} placeholder="+54 11 1234-5678" />
                </div>
                <div className="space-y-2">
                  <Label>Rango de precios</Label>
                  <Input name="priceRange" defaultValue={(editingItem as Hotel).priceRange || ""} placeholder="$$$ - $$$$" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sitio web</Label>
                  <Input name="website" defaultValue={(editingItem as Hotel).website || ""} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Distancia</Label>
                  <Input name="distance" defaultValue={(editingItem as Hotel).distance || ""} placeholder="A 5 min del evento" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setEditingSection(null);
                  setEditingItem(null);
                }}>Cancelar</Button>
                <Button type="submit">Guardar</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Nearby Plan Dialog */}
      <Dialog open={editingSection === "nearbyPlan"} onOpenChange={(open) => !open && setEditingSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir plan cercano</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleAddNearbyPlan({
              name: formData.get("name") as string,
              description: formData.get("description") as string,
              category: formData.get("category") as string,
              address: formData.get("address") as string,
              website: formData.get("website") as string,
            });
          }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input name="name" required placeholder="Nombre del lugar" />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Input name="category" placeholder="Restaurante, Bar, Museo..." />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea name="description" placeholder="Por qué lo recomiendas..." />
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input name="address" placeholder="Dirección" />
            </div>
            <div className="space-y-2">
              <Label>Sitio web</Label>
              <Input name="website" placeholder="https://..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingSection(null)}>Cancelar</Button>
              <Button type="submit">Añadir</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Nearby Plan Dialog */}
      <Dialog open={editingSection === "nearbyPlan-edit"} onOpenChange={(open) => {
        if (!open) {
          setEditingSection(null);
          setEditingItem(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar plan cercano</DialogTitle>
          </DialogHeader>
          {editingItem && "category" in editingItem && !("priceRange" in editingItem) && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleEditNearbyPlan({
                ...(editingItem as NearbyPlan),
                name: formData.get("name") as string,
                description: formData.get("description") as string,
                category: formData.get("category") as string,
                address: formData.get("address") as string,
                website: formData.get("website") as string,
              });
            }} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input name="name" required defaultValue={(editingItem as NearbyPlan).name} placeholder="Nombre del lugar" />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Input name="category" defaultValue={(editingItem as NearbyPlan).category || ""} placeholder="Restaurante, Bar, Museo..." />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea name="description" defaultValue={(editingItem as NearbyPlan).description || ""} placeholder="Por qué lo recomiendas..." />
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input name="address" defaultValue={(editingItem as NearbyPlan).address || ""} placeholder="Dirección" />
              </div>
              <div className="space-y-2">
                <Label>Sitio web</Label>
                <Input name="website" defaultValue={(editingItem as NearbyPlan).website || ""} placeholder="https://..." />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setEditingSection(null);
                  setEditingItem(null);
                }}>Cancelar</Button>
                <Button type="submit">Guardar</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add FAQ Dialog */}
      <Dialog open={editingSection === "faq"} onOpenChange={(open) => !open && setEditingSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir pregunta frecuente</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleAddFaq({
              question: formData.get("question") as string,
              answer: formData.get("answer") as string,
            });
          }} className="space-y-4">
            <div className="space-y-2">
              <Label>Pregunta *</Label>
              <Input name="question" required placeholder="¿Cuál es el código de vestimenta?" />
            </div>
            <div className="space-y-2">
              <Label>Respuesta *</Label>
              <Textarea name="answer" required placeholder="Formal / Semi-formal..." rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingSection(null)}>Cancelar</Button>
              <Button type="submit">Añadir</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Transport Dialog */}
      <Dialog open={editingSection === "transport"} onOpenChange={(open) => !open && setEditingSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir opción de transporte</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleAddTransport({
              name: formData.get("name") as string,
              description: formData.get("description") as string,
              departureLocation: formData.get("departureLocation") as string,
              departureAddress: formData.get("departureAddress") as string,
              departureTime: formData.get("departureTime") as string,
              returnTime: formData.get("returnTime") as string,
              capacity: parseInt(formData.get("capacity") as string) || null,
            });
          }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input name="name" required placeholder="Ej: Bus desde Capital Federal" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea name="description" placeholder="Detalles del servicio..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Punto de salida</Label>
                <Input name="departureLocation" placeholder="Ej: Obelisco" />
              </div>
              <div className="space-y-2">
                <Label>Dirección de salida</Label>
                <Input name="departureAddress" placeholder="Av. 9 de Julio..." />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Hora salida</Label>
                <Input name="departureTime" type="time" />
              </div>
              <div className="space-y-2">
                <Label>Hora regreso</Label>
                <Input name="returnTime" type="time" />
              </div>
              <div className="space-y-2">
                <Label>Capacidad</Label>
                <Input name="capacity" type="number" placeholder="50" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingSection(null)}>Cancelar</Button>
              <Button type="submit">Añadir</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Transport Dialog */}
      <Dialog open={editingSection === "transport-edit"} onOpenChange={(open) => {
        if (!open) {
          setEditingSection(null);
          setEditingItem(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar opción de transporte</DialogTitle>
          </DialogHeader>
          {editingItem && "departureLocation" in editingItem && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleEditTransport({
                ...(editingItem as TransportOption),
                name: formData.get("name") as string,
                description: formData.get("description") as string,
                departureLocation: formData.get("departureLocation") as string,
                departureAddress: formData.get("departureAddress") as string,
                departureTime: formData.get("departureTime") as string,
                returnTime: formData.get("returnTime") as string,
                capacity: parseInt(formData.get("capacity") as string) || null,
              });
            }} className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input name="name" required defaultValue={(editingItem as TransportOption).name} placeholder="Ej: Bus desde Capital Federal" />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea name="description" defaultValue={(editingItem as TransportOption).description || ""} placeholder="Detalles del servicio..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Punto de salida</Label>
                  <Input name="departureLocation" defaultValue={(editingItem as TransportOption).departureLocation || ""} placeholder="Ej: Obelisco" />
                </div>
                <div className="space-y-2">
                  <Label>Dirección de salida</Label>
                  <Input name="departureAddress" defaultValue={(editingItem as TransportOption).departureAddress || ""} placeholder="Av. 9 de Julio..." />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Hora salida</Label>
                  <Input name="departureTime" type="time" defaultValue={(editingItem as TransportOption).departureTime || ""} />
                </div>
                <div className="space-y-2">
                  <Label>Hora regreso</Label>
                  <Input name="returnTime" type="time" defaultValue={(editingItem as TransportOption).returnTime || ""} />
                </div>
                <div className="space-y-2">
                  <Label>Capacidad</Label>
                  <Input name="capacity" type="number" defaultValue={(editingItem as TransportOption).capacity || ""} placeholder="50" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setEditingSection(null);
                  setEditingItem(null);
                }}>Cancelar</Button>
                <Button type="submit">Guardar</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
