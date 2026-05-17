"use client";

import { useState, useEffect, use, useRef } from "react";
import { toast } from "sonner";
import { useEvent } from "@/contexts/event-context";
import { useUserSessionContext } from "@/contexts/user-session-context";
import { useEventPermissions } from "@/hooks/use-event-permissions";
import { EventSectionGuard } from "@/components/events/event-section-guard";
import { Skeleton } from "@/components/ui/skeleton";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  Cancel01Icon,
  PlusSignIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Edit02Icon,
  Delete01Icon,
  Image01Icon,
  Message01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Hotel01Icon,
  Bus01Icon,
  SparklesIcon,
  HelpCircleIcon,
  PaintBoardIcon,
  SmartPhone01Icon,
  Copy01Icon,
  QrCode01Icon,
  SentIcon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { useFileUpload } from "@/hooks/use-file-upload";
import { appConfirm } from "@/lib/confirm";

const IcoX = hgIcon(Cancel01Icon);
const IcoPlus = hgIcon(PlusSignIcon);
const IcoChevDown = hgIcon(ArrowDown01Icon);
const IcoChevUp = hgIcon(ArrowUp01Icon);
const IcoEdit = hgIcon(Edit02Icon);
const IcoTrash = hgIcon(Delete01Icon);
const IcoImage = hgIcon(Image01Icon);
const IcoMessage = hgIcon(Message01Icon);
const IcoCheckCircle = hgIcon(CheckmarkCircle02Icon);
const IcoClock = hgIcon(Clock01Icon);
const IcoHotel = hgIcon(Hotel01Icon);
const IcoBus = hgIcon(Bus01Icon);
const IcoSparkles = hgIcon(SparklesIcon);
const IcoHelp = hgIcon(HelpCircleIcon);
const IcoPalette = hgIcon(PaintBoardIcon);
const IcoPhone = hgIcon(SmartPhone01Icon);
const IcoCopy = hgIcon(Copy01Icon);
const IcoQr = hgIcon(QrCode01Icon);
const IcoSend = hgIcon(SentIcon);
const IcoUpload = hgIcon(Upload01Icon);

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
  menuOptions: string[];
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

type ThemeKey = "ivory" | "sage" | "dusty" | "night";

const THEME_PALETTES: Record<ThemeKey, { label: string; gradient: string }> = {
  ivory: { label: "Ivory", gradient: "linear-gradient(135deg, #FBF7EF, #E8D9C5)" },
  sage: { label: "Sage", gradient: "linear-gradient(135deg, #DFE8DD, #AEC1A4)" },
  dusty: { label: "Dusty", gradient: "linear-gradient(135deg, #F5DCD9, #D88E8A)" },
  night: { label: "Night", gradient: "linear-gradient(135deg, #2A3242, #6A7A91)" },
};

// =============================================================================
// Page
// =============================================================================
export default function EventRsvpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);
  const { activeEvent, setActiveEvent } = useEvent();
  const { eventScoped } = useUserSessionContext();
  const { canEdit } = useEventPermissions(eventId, eventScoped);
  const ed = canEdit("rsvp");

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"editor" | "preview">("editor");
  const [theme, setTheme] = useState<ThemeKey>("ivory");

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
    menuOptions: ["Carne", "Pescado", "Vegetariano"],
  });
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [nearbyPlans, setNearbyPlans] = useState<NearbyPlan[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [transportOptions, setTransportOptions] = useState<TransportOption[]>([]);
  const [rsvpStats, setRsvpStats] = useState({
    total: 0,
    confirmed: 0,
    pending: 0,
    declined: 0,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialSettingsRef = useRef<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drawers
  const [hotelDrawerOpen, setHotelDrawerOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [busDrawerOpen, setBusDrawerOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<TransportOption | null>(null);
  const [planDrawerOpen, setPlanDrawerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<NearbyPlan | null>(null);
  const [itineraryDrawerOpen, setItineraryDrawerOpen] = useState(false);
  const [editingItinerary, setEditingItinerary] = useState<ItineraryItem | null>(null);
  const [faqDrawerOpen, setFaqDrawerOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);

  const { upload: uploadImage, uploading: uploadingImage } = useFileUpload({
    folder: `events/${eventId}/cover`,
    allowedTypes: ["image/*"],
    onSuccess: async (result) => {
      setCoverImage(result.url);
      try {
        const res = await fetch(`/api/events/${eventId}/rsvp`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coverImage: result.url }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Error al guardar la portada");
        }
        toast.success("Portada actualizada");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al guardar";
        toast.error(msg);
      }
    },
    onError: (msg) => {
      // When the storage backend isn't configured (typical in dev/staging
      // without R2 secrets), point the user at the URL-paste fallback.
      if (msg.includes("almacenamiento") || msg.includes("CONFIG")) {
        toast.error(
          "El almacenamiento de imágenes no está configurado. Pega una URL en el campo de abajo.",
        );
      } else {
        toast.error(msg);
      }
    },
  });

  // Fetch initial data
  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const eventRes = await fetch(`/api/events/${eventId}`);
        const eventData = await eventRes.json();
        if (!cancelled && eventData.success) {
          setActiveEvent(eventData.data);
          setCoverImage(eventData.data.coverImage || null);
        }

        const rsvpRes = await fetch(`/api/events/${eventId}/rsvp`);
        const rsvpData = await rsvpRes.json();
        if (!cancelled && rsvpData.success) {
          if (rsvpData.data.settings) {
            const s = rsvpData.data.settings;
            const next: RsvpSettings = {
              enabled: s.enabled ?? true,
              deadline: s.deadline || null,
              allowPlusOne: s.allowPlusOne ?? false,
              maxCompanionsPerGuest: s.maxCompanionsPerGuest ?? 1,
              askDietaryRestrictions: s.askDietaryRestrictions ?? true,
              customMessage: s.customMessage || "",
              showItinerary: s.showItinerary ?? true,
              showHotels: s.showHotels ?? true,
              showNearbyPlans: s.showNearbyPlans ?? true,
              showLocation: s.showLocation ?? true,
              showFaqs: s.showFaqs ?? true,
              showTransport: s.showTransport ?? false,
              menuOptions:
                Array.isArray(s.menuOptions) && s.menuOptions.length > 0
                  ? s.menuOptions
                  : ["Carne", "Pescado", "Vegetariano"],
            };
            setSettings(next);
            initialSettingsRef.current = JSON.stringify(next);
          }
          setItinerary(rsvpData.data.itinerary || []);
          setHotels(rsvpData.data.hotels || []);
          setNearbyPlans(rsvpData.data.nearbyPlans || []);
          setFaqs(rsvpData.data.faqs || []);
          if (rsvpData.data.stats) {
            setRsvpStats({
              total: rsvpData.data.stats.totalGuests || 0,
              confirmed: rsvpData.data.stats.confirmed || 0,
              pending: rsvpData.data.stats.pending || 0,
              declined: rsvpData.data.stats.declined || 0,
            });
          }
        }

        const transportRes = await fetch(`/api/events/${eventId}/rsvp/transport`);
        const transportData = await transportRes.json();
        if (!cancelled && transportData.success) {
          setTransportOptions(transportData.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch RSVP data:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // Detect setting changes
  useEffect(() => {
    if (!loading && initialSettingsRef.current) {
      setHasChanges(JSON.stringify(settings) !== initialSettingsRef.current);
    }
  }, [settings, loading]);

  const rsvpUrl =
    typeof window !== "undefined" ? `${window.location.origin}/rsvp/${eventId}` : "";
  const publicLink = rsvpUrl.replace(/^https?:\/\//, "");

  const handleCopyLink = async () => {
    if (typeof navigator === "undefined") return;
    try {
      await navigator.clipboard.writeText(rsvpUrl);
      toast.success("Link copiado");
    } catch {
      toast.error("No se pudo copiar el link");
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings, coverImage }),
      });
      if (res.ok) {
        toast.success("Cambios guardados");
        setHasChanges(false);
        initialSettingsRef.current = JSON.stringify(settings);
      } else {
        toast.error("Error al guardar los cambios");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Error de conexión al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Always reset the input so re-selecting the same file fires `onChange`
    // (browsers de-dupe by value otherwise).
    e.target.value = "";
    if (file) await uploadImage(file);
  };

  // Save a cover image URL directly (no upload — used when the user pastes
  // an external image link, or to clear the current cover).
  const saveCoverUrl = async (url: string | null) => {
    setCoverImage(url);
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: url }),
      });
      if (!res.ok) throw new Error("Error al guardar la portada");
      toast.success(url ? "Portada actualizada" : "Portada eliminada");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al guardar";
      toast.error(msg);
    }
  };

  // Itinerary CRUD
  const saveItinerary = async (item: Partial<ItineraryItem>) => {
    if (editingItinerary) {
      const merged = { ...editingItinerary, ...item };
      const res = await fetch(`/api/events/${eventId}/rsvp/itinerary`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      });
      const data = await res.json();
      if (data.success) {
        setItinerary((prev) => prev.map((i) => (i.id === merged.id ? merged : i)));
      }
    } else {
      const res = await fetch(`/api/events/${eventId}/rsvp/itinerary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, orderIndex: itinerary.length }),
      });
      const data = await res.json();
      if (data.success) setItinerary((prev) => [...prev, data.data]);
    }
    setItineraryDrawerOpen(false);
    setEditingItinerary(null);
  };
  const deleteItinerary = async (id: number) => {
    await fetch(`/api/events/${eventId}/rsvp/itinerary?id=${id}`, { method: "DELETE" });
    setItinerary((prev) => prev.filter((i) => i.id !== id));
  };

  // Hotels CRUD
  const saveHotel = async (item: Partial<Hotel>) => {
    if (editingHotel) {
      const merged = { ...editingHotel, ...item };
      const res = await fetch(`/api/events/${eventId}/rsvp/hotels`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      });
      const data = await res.json();
      if (data.success) {
        setHotels((prev) => prev.map((h) => (h.id === merged.id ? merged : h)));
      }
    } else {
      const res = await fetch(`/api/events/${eventId}/rsvp/hotels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, orderIndex: hotels.length }),
      });
      const data = await res.json();
      if (data.success) setHotels((prev) => [...prev, data.data]);
    }
    setHotelDrawerOpen(false);
    setEditingHotel(null);
  };
  const deleteHotel = async (id: number) => {
    await fetch(`/api/events/${eventId}/rsvp/hotels?id=${id}`, { method: "DELETE" });
    setHotels((prev) => prev.filter((h) => h.id !== id));
  };

  // Plans CRUD
  const savePlan = async (item: Partial<NearbyPlan>) => {
    if (editingPlan) {
      const merged = { ...editingPlan, ...item };
      const res = await fetch(`/api/events/${eventId}/rsvp/nearby-plans`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      });
      const data = await res.json();
      if (data.success) {
        setNearbyPlans((prev) => prev.map((p) => (p.id === merged.id ? merged : p)));
      }
    } else {
      const res = await fetch(`/api/events/${eventId}/rsvp/nearby-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, orderIndex: nearbyPlans.length }),
      });
      const data = await res.json();
      if (data.success) setNearbyPlans((prev) => [...prev, data.data]);
    }
    setPlanDrawerOpen(false);
    setEditingPlan(null);
  };
  const deletePlan = async (id: number) => {
    await fetch(`/api/events/${eventId}/rsvp/nearby-plans?id=${id}`, { method: "DELETE" });
    setNearbyPlans((prev) => prev.filter((p) => p.id !== id));
  };

  // Bus / Transport CRUD
  const saveBus = async (item: Partial<TransportOption>) => {
    if (editingBus) {
      const merged = { ...editingBus, ...item };
      const res = await fetch(`/api/events/${eventId}/rsvp/transport`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      });
      const data = await res.json();
      if (data.success) {
        setTransportOptions((prev) => prev.map((t) => (t.id === merged.id ? merged : t)));
      }
    } else {
      const res = await fetch(`/api/events/${eventId}/rsvp/transport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...item,
          isActive: true,
          orderIndex: transportOptions.length,
        }),
      });
      const data = await res.json();
      if (data.success) setTransportOptions((prev) => [...prev, data.data]);
    }
    setBusDrawerOpen(false);
    setEditingBus(null);
  };
  const deleteBus = async (id: number) => {
    await fetch(`/api/events/${eventId}/rsvp/transport?id=${id}`, { method: "DELETE" });
    setTransportOptions((prev) => prev.filter((t) => t.id !== id));
  };

  // FAQ CRUD
  const saveFaq = async (item: Partial<Faq>) => {
    if (editingFaq) {
      const merged = { ...editingFaq, ...item };
      const res = await fetch(`/api/events/${eventId}/rsvp/faqs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      });
      const data = await res.json();
      if (data.success) {
        setFaqs((prev) => prev.map((f) => (f.id === merged.id ? merged : f)));
      }
    } else {
      const res = await fetch(`/api/events/${eventId}/rsvp/faqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, orderIndex: faqs.length }),
      });
      const data = await res.json();
      if (data.success) setFaqs((prev) => [...prev, data.data]);
    }
    setFaqDrawerOpen(false);
    setEditingFaq(null);
  };
  const deleteFaq = async (id: number) => {
    await fetch(`/api/events/${eventId}/rsvp/faqs?id=${id}`, { method: "DELETE" });
    setFaqs((prev) => prev.filter((f) => f.id !== id));
  };

  if (loading) {
    return (
      <EventSectionGuard eventId={eventId} section="rsvp">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
      </EventSectionGuard>
    );
  }

  return (
    <EventSectionGuard eventId={eventId} section="rsvp">
      <div className="flex flex-col gap-3.5">
        {!ed && <ReadOnlyBanner />}

        {/* Top bar — tabs + public link + actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div
            className="inline-flex gap-1 rounded-[8px]"
            style={{ background: "var(--bg-subtle)", padding: 3 }}
          >
            {(["editor", "preview"] as const).map((k) => {
              const active = tab === k;
              return (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className="inline-flex items-center rounded-[6px] cursor-pointer border-none transition-colors"
                  style={{
                    padding: "6px 14px",
                    background: active ? "#FFFFFF" : "transparent",
                    color: active ? "var(--ink-1)" : "var(--ink-3)",
                    fontWeight: active ? 600 : 500,
                    fontSize: 12.5,
                    boxShadow: active ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  }}
                >
                  {k === "editor" ? "Editor" : "Vista previa"}
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <div
              className="inline-flex items-center gap-1.5 rounded-[8px]"
              style={{
                background: "var(--bg-subtle)",
                border: "1px solid var(--line-1)",
                padding: "7px 12px",
                fontSize: 12,
                color: "var(--ink-2)",
              }}
            >
              <IcoSend className="h-3 w-3" />
              <span style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}>
                {publicLink}
              </span>
            </div>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium text-[var(--ink-1)] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
              style={{ background: "#FFFFFF", border: "1px solid var(--line-strong)" }}
            >
              <IcoCopy className="h-3 w-3" />
              Copiar
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium text-[var(--ink-1)] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
              style={{ background: "#FFFFFF", border: "1px solid var(--line-strong)" }}
            >
              <IcoQr className="h-3 w-3" />
              QR
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={saving || !ed}
              className="inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-1.5 text-[12.5px] font-semibold cursor-pointer transition-colors border-none"
              style={{
                background: "var(--color-primary)",
                color: "#FFFFFF",
                opacity: saving || !ed ? 0.5 : 1,
              }}
            >
              <IcoSend className="h-3 w-3" />
              {saving ? "Guardando..." : hasChanges ? "Publicar*" : "Publicar"}
            </button>
          </div>
        </div>

        {tab === "editor" ? (
          <div
            className="grid gap-3.5"
            style={{
              gridTemplateColumns: "minmax(0, 1fr) 380px",
              alignItems: "flex-start",
            }}
          >
            {/* Editor column */}
            <div className="flex flex-col gap-3.5">
              {/* KPI strip */}
              <div className="grid grid-cols-4 gap-2.5">
                <RsvpKpi label="Total" value={rsvpStats.total} tone="ink" />
                <RsvpKpi label="Confirmados" value={rsvpStats.confirmed} tone="success" />
                <RsvpKpi label="Pendientes" value={rsvpStats.pending} tone="warn" />
                <RsvpKpi label="Rechazados" value={rsvpStats.declined} tone="danger" />
              </div>

              {/* Portada */}
              <RsvpBlock title="Portada" icon={<IcoImage className="h-3.5 w-3.5" />}>
                <div className="grid gap-3" style={{ gridTemplateColumns: "120px 1fr" }}>
                  <div
                    style={{
                      height: 80,
                      borderRadius: 8,
                      backgroundImage: coverImage ? `url(${coverImage})` : "none",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      background: coverImage
                        ? `url(${coverImage})`
                        : "var(--bg-subtle)",
                      backgroundRepeat: "no-repeat",
                      border: "1px solid var(--line-1)",
                    }}
                  />
                  <div className="flex flex-col gap-2 justify-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!ed || uploadingImage}
                        className="inline-flex items-center gap-1.5 rounded-[8px] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid var(--line-strong)",
                          padding: "5px 10px",
                          fontSize: 12,
                          fontWeight: 500,
                          color: "var(--ink-1)",
                          opacity: !ed || uploadingImage ? 0.5 : 1,
                        }}
                      >
                        <IcoUpload className="h-3 w-3" />
                        {uploadingImage ? "Subiendo..." : "Subir imagen"}
                      </button>
                      {coverImage && ed && (
                        <button
                          onClick={() => saveCoverUrl(null)}
                          className="inline-flex items-center rounded-[8px] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
                          style={{
                            background: "#FFFFFF",
                            border: "1px solid var(--line-1)",
                            padding: "5px 10px",
                            fontSize: 12,
                            fontWeight: 500,
                            color: "var(--ink-2)",
                          }}
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      placeholder="…o pega una URL: https://images.unsplash.com/…"
                      defaultValue={coverImage || ""}
                      disabled={!ed}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== (coverImage || "")) saveCoverUrl(v);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className="drawer-form-field"
                      style={{
                        width: "100%",
                        padding: "5px 8px",
                        border: "1px solid var(--line-1)",
                        borderRadius: 6,
                        fontSize: 11.5,
                        background: "#FFFFFF",
                        color: "var(--ink-1)",
                        outline: "none",
                      }}
                    />
                    <div className="text-[11px] text-[var(--ink-3)]">
                      JPG / PNG · proporción 3:2 recomendada
                    </div>
                  </div>
                </div>
              </RsvpBlock>

              {/* Bienvenida */}
              <RsvpBlock title="Bienvenida" icon={<IcoMessage className="h-3.5 w-3.5" />}>
                <FormField label="Mensaje principal">
                  <textarea
                    rows={2}
                    readOnly={!ed}
                    value={settings.customMessage}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, customMessage: e.target.value }))
                    }
                  />
                </FormField>
                <div className="grid grid-cols-3 gap-2.5 mt-2.5">
                  <FormField label="Fecha">
                    <input
                      type="date"
                      defaultValue={
                        activeEvent?.date
                          ? new Date(activeEvent.date).toISOString().split("T")[0]
                          : ""
                      }
                      disabled
                    />
                  </FormField>
                  <FormField label="Hora">
                    <input
                      type="time"
                      defaultValue={
                        activeEvent?.date
                          ? new Date(activeEvent.date).toTimeString().slice(0, 5)
                          : ""
                      }
                      disabled
                    />
                  </FormField>
                  <FormField label="Lugar">
                    <input defaultValue={activeEvent?.location || ""} disabled />
                  </FormField>
                </div>
              </RsvpBlock>

              {/* Configuración asistencia */}
              <RsvpBlock
                title="Configuración de asistencia"
                icon={<IcoCheckCircle className="h-3.5 w-3.5" />}
              >
                <div className="grid grid-cols-2 gap-2.5">
                  <FormField label="Fecha límite RSVP">
                    <input
                      type="date"
                      value={settings.deadline || ""}
                      disabled={!ed}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, deadline: e.target.value || null }))
                      }
                    />
                  </FormField>
                  <FormField label="Máximo acompañantes">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={
                        settings.allowPlusOne ? settings.maxCompanionsPerGuest : 0
                      }
                      disabled={!ed || !settings.allowPlusOne}
                      title={
                        settings.allowPlusOne
                          ? undefined
                          : "Activa primero «Permitir acompañante adicional»"
                      }
                      style={{
                        opacity: settings.allowPlusOne ? 1 : 0.5,
                        cursor: settings.allowPlusOne ? "auto" : "not-allowed",
                      }}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          maxCompanionsPerGuest: Math.max(
                            0,
                            Math.min(10, parseInt(e.target.value || "0", 10)),
                          ),
                        }))
                      }
                    />
                  </FormField>
                </div>
                <label className="flex items-center gap-2 mt-3 cursor-pointer text-[12.5px] text-[var(--ink-1)]">
                  <input
                    type="checkbox"
                    checked={settings.askDietaryRestrictions}
                    disabled={!ed}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        askDietaryRestrictions: e.target.checked,
                      }))
                    }
                  />
                  Preguntar restricciones alimentarias
                </label>
                <label className="flex items-center gap-2 mt-2 cursor-pointer text-[12.5px] text-[var(--ink-1)]">
                  <input
                    type="checkbox"
                    checked={settings.allowPlusOne}
                    disabled={!ed}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, allowPlusOne: e.target.checked }))
                    }
                  />
                  Permitir acompañante adicional
                </label>

                {/* Opciones de menú — inline subsection (matches prototype) */}
                <div
                  className="text-[11.5px] font-semibold uppercase mt-3"
                  style={{
                    letterSpacing: "0.06em",
                    color: "var(--ink-3)",
                  }}
                >
                  Opciones de menú
                </div>
                <div className="text-[11.5px] text-[var(--ink-3)] mt-1 mb-2.5">
                  Aparecen en el formulario público y en la columna
                  &quot;Menú&quot; del listado de invitados.
                </div>
                <MenuOptionsEditor
                  options={settings.menuOptions}
                  disabled={!ed}
                  onChange={(next) =>
                    setSettings((s) => ({ ...s, menuOptions: next }))
                  }
                />
              </RsvpBlock>

              {/* Horarios */}
              <RsvpSection
                title="Horarios del día"
                icon={<IcoClock className="h-3.5 w-3.5" />}
                count={itinerary.length}
                enabled={settings.showItinerary}
                onToggle={
                  ed
                    ? () =>
                        setSettings((s) => ({ ...s, showItinerary: !s.showItinerary }))
                    : undefined
                }
                emptyText="Sin horarios. Añade el primero."
                onAdd={
                  ed
                    ? () => {
                        setEditingItinerary(null);
                        setItineraryDrawerOpen(true);
                      }
                    : undefined
                }
                items={itinerary.map((it) => ({
                  id: it.id,
                  primary: it.title,
                  cells: [
                    fmtTime(it.startTime) || "",
                    it.title,
                    it.location || "",
                    it.description || "",
                  ],
                  raw: it,
                }))}
                columnWidths={[70, 160, 140, null]}
                onEditItem={
                  ed
                    ? (raw) => {
                        setEditingItinerary(raw as ItineraryItem);
                        setItineraryDrawerOpen(true);
                      }
                    : undefined
                }
                onDeleteItem={ed ? (id) => deleteItinerary(id) : undefined}
              />

              {/* Hoteles */}
              <RsvpSection
                title="Hoteles recomendados"
                icon={<IcoHotel className="h-3.5 w-3.5" />}
                count={hotels.length}
                enabled={settings.showHotels}
                onToggle={
                  ed
                    ? () => setSettings((s) => ({ ...s, showHotels: !s.showHotels }))
                    : undefined
                }
                emptyText="Sin hoteles. Añade el primero."
                onAdd={
                  ed
                    ? () => {
                        setEditingHotel(null);
                        setHotelDrawerOpen(true);
                      }
                    : undefined
                }
                items={hotels.map((h) => ({
                  id: h.id,
                  primary: h.name,
                  cells: [
                    h.name,
                    h.distance || "",
                    h.priceRange || "",
                    h.website
                      ? h.website.replace(/^https?:\/\//, "")
                      : h.address || "",
                  ],
                  raw: h,
                }))}
                columnWidths={[null, 130, 110, 160]}
                onEditItem={
                  ed
                    ? (raw) => {
                        setEditingHotel(raw as Hotel);
                        setHotelDrawerOpen(true);
                      }
                    : undefined
                }
                onDeleteItem={ed ? (id) => deleteHotel(id) : undefined}
              />

              {/* Buses — Sí/No explicit ("¿Habrá autobuses?") */}
              <RsvpSection
                title="¿Habrá autobuses?"
                icon={<IcoBus className="h-3.5 w-3.5" />}
                count={transportOptions.length}
                enabled={settings.showTransport}
                yesNoMode
                noMessage="No se ofrecerán autobuses para este evento. Los invitados verán solo la opción de llegar por su cuenta."
                onToggle={
                  ed
                    ? () =>
                        setSettings((s) => ({ ...s, showTransport: !s.showTransport }))
                    : undefined
                }
                emptyText="Sin autobuses. Añade el primero."
                onAdd={
                  ed
                    ? () => {
                        setEditingBus(null);
                        setBusDrawerOpen(true);
                      }
                    : undefined
                }
                items={transportOptions.map((t) => ({
                  id: t.id,
                  primary: t.name,
                  cells: [
                    fmtTime(t.departureTime) || "",
                    t.name,
                    t.departureLocation || "",
                    t.capacity != null ? `${t.capacity} plazas` : "",
                  ],
                  raw: t,
                }))}
                columnWidths={[80, null, null, 110]}
                onEditItem={
                  ed
                    ? (raw) => {
                        setEditingBus(raw as TransportOption);
                        setBusDrawerOpen(true);
                      }
                    : undefined
                }
                onDeleteItem={ed ? (id) => deleteBus(id) : undefined}
              />

              {/* Planes */}
              <RsvpSection
                title="Planes y actividades"
                icon={<IcoSparkles className="h-3.5 w-3.5" />}
                count={nearbyPlans.length}
                enabled={settings.showNearbyPlans}
                onToggle={
                  ed
                    ? () =>
                        setSettings((s) => ({
                          ...s,
                          showNearbyPlans: !s.showNearbyPlans,
                        }))
                    : undefined
                }
                emptyText="Sin planes. Añade el primero."
                onAdd={
                  ed
                    ? () => {
                        setEditingPlan(null);
                        setPlanDrawerOpen(true);
                      }
                    : undefined
                }
                items={nearbyPlans.map((p) => ({
                  id: p.id,
                  primary: p.name,
                  cells: [
                    p.name,
                    p.category || "",
                    p.address || "",
                    p.website
                      ? p.website.replace(/^https?:\/\//, "")
                      : "",
                  ],
                  raw: p,
                }))}
                columnWidths={[null, 130, 160, 140]}
                onEditItem={
                  ed
                    ? (raw) => {
                        setEditingPlan(raw as NearbyPlan);
                        setPlanDrawerOpen(true);
                      }
                    : undefined
                }
                onDeleteItem={ed ? (id) => deletePlan(id) : undefined}
              />

              {/* FAQ */}
              <RsvpSection
                title="Preguntas frecuentes"
                icon={<IcoHelp className="h-3.5 w-3.5" />}
                count={faqs.length}
                enabled={settings.showFaqs}
                onToggle={
                  ed
                    ? () => setSettings((s) => ({ ...s, showFaqs: !s.showFaqs }))
                    : undefined
                }
                emptyText="Sin preguntas. Añade la primera."
                onAdd={
                  ed
                    ? () => {
                        setEditingFaq(null);
                        setFaqDrawerOpen(true);
                      }
                    : undefined
                }
                items={faqs.map((f) => ({
                  id: f.id,
                  primary: f.question,
                  cells: [f.question, f.answer],
                  raw: f,
                }))}
                columnWidths={[260, null]}
                onEditItem={
                  ed
                    ? (raw) => {
                        setEditingFaq(raw as Faq);
                        setFaqDrawerOpen(true);
                      }
                    : undefined
                }
                onDeleteItem={ed ? (id) => deleteFaq(id) : undefined}
              />

              {/* Tema · paleta */}
              <RsvpBlock title="Tema · paleta" icon={<IcoPalette className="h-3.5 w-3.5" />}>
                <div className="flex gap-2.5 flex-wrap">
                  {(Object.entries(THEME_PALETTES) as [ThemeKey, { label: string; gradient: string }][]).map(
                    ([k, t]) => {
                      const selected = theme === k;
                      return (
                        <button
                          key={k}
                          disabled={!ed}
                          onClick={() => ed && setTheme(k)}
                          className="flex flex-col items-center gap-1.5 cursor-pointer"
                          style={{
                            padding: 6,
                            borderRadius: 8,
                            background: selected ? "var(--bg-subtle)" : "transparent",
                            border: selected
                              ? "2px solid var(--ink-1)"
                              : "2px solid transparent",
                            cursor: ed ? "pointer" : "default",
                          }}
                        >
                          <div
                            style={{
                              width: 64,
                              height: 42,
                              borderRadius: 6,
                              background: t.gradient,
                            }}
                          />
                          <div className="text-[11px] text-[var(--ink-2)]">{t.label}</div>
                        </button>
                      );
                    },
                  )}
                </div>
              </RsvpBlock>
            </div>

            {/* Right column — mobile preview */}
            <div style={{ position: "sticky", top: 12 }}>
              <div
                className="text-[11px] font-semibold uppercase text-[var(--ink-3)] mb-2 flex items-center gap-1.5"
                style={{ letterSpacing: "0.08em" }}
              >
                <IcoPhone className="h-3 w-3" />
                Vista previa en vivo
              </div>
              <MobilePreview
                eventName={activeEvent?.name || "Evento"}
                eventDate={activeEvent?.date}
                location={activeEvent?.location}
                coverImage={coverImage}
                customMessage={settings.customMessage}
                theme={theme}
                settings={settings}
                itinerary={itinerary}
                hotels={hotels}
                nearbyPlans={nearbyPlans}
                faqs={faqs}
                transportOptions={transportOptions}
              />
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-6">
            <MobilePreview
              eventName={activeEvent?.name || "Evento"}
              eventDate={activeEvent?.date}
              location={activeEvent?.location}
              coverImage={coverImage}
              customMessage={settings.customMessage}
              theme={theme}
              size="lg"
              settings={settings}
              itinerary={itinerary}
              hotels={hotels}
              nearbyPlans={nearbyPlans}
              faqs={faqs}
              transportOptions={transportOptions}
            />
          </div>
        )}
      </div>

      {/* Drawers */}
      <ItineraryDrawer
        open={itineraryDrawerOpen}
        onClose={() => {
          setItineraryDrawerOpen(false);
          setEditingItinerary(null);
        }}
        editing={editingItinerary}
        onSave={saveItinerary}
      />
      <HotelDrawer
        open={hotelDrawerOpen}
        onClose={() => {
          setHotelDrawerOpen(false);
          setEditingHotel(null);
        }}
        editing={editingHotel}
        onSave={saveHotel}
      />
      <BusDrawer
        open={busDrawerOpen}
        onClose={() => {
          setBusDrawerOpen(false);
          setEditingBus(null);
        }}
        editing={editingBus}
        onSave={saveBus}
      />
      <PlanDrawer
        open={planDrawerOpen}
        onClose={() => {
          setPlanDrawerOpen(false);
          setEditingPlan(null);
        }}
        editing={editingPlan}
        onSave={savePlan}
      />
      <FaqDrawer
        open={faqDrawerOpen}
        onClose={() => {
          setFaqDrawerOpen(false);
          setEditingFaq(null);
        }}
        editing={editingFaq}
        onSave={saveFaq}
      />
    </EventSectionGuard>
  );
}

// =============================================================================
// Helper components — match the prototype's WsRsvp helpers
// =============================================================================

function ReadOnlyBanner() {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-[8px] text-[12px] text-[var(--ink-2)]"
      style={{
        padding: "8px 12px",
        background: "var(--bg-subtle)",
        border: "1px solid var(--line-1)",
        width: "fit-content",
      }}
    >
      Modo solo lectura — no puedes hacer cambios en este módulo
    </div>
  );
}

function RsvpKpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ink" | "success" | "warn" | "danger";
}) {
  const tones: Record<string, string> = {
    ink: "var(--ink-1)",
    success: "#4F7A5E",
    warn: "#B88325",
    danger: "#B55450",
  };
  return (
    <div
      className="rounded-[12px]"
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--line-1)",
        padding: "10px 12px",
      }}
    >
      <div
        className="text-[10.5px] font-semibold uppercase text-[var(--ink-3)]"
        style={{ letterSpacing: "0.06em" }}
      >
        {label}
      </div>
      <div
        className="text-[22px] font-semibold mt-0.5"
        style={{ color: tones[tone], letterSpacing: "-0.02em" }}
      >
        {value}
      </div>
    </div>
  );
}

function RsvpBlock({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[12px] rsvp-block"
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--line-1)",
        padding: 14,
      }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        {icon && <span style={{ color: "var(--ink-3)" }}>{icon}</span>}
        <div className="text-[13px] font-semibold text-[var(--ink-1)]">{title}</div>
      </div>
      {children}
    </div>
  );
}

interface SectionItem {
  id: number;
  primary: string;
  secondary?: string;
  /**
   * When set, the row renders as a grid of cells (matching the prototype's
   * column-based layout) instead of the default `primary + secondary` stack.
   * `cells.length` must match the parent section's `columnWidths.length`.
   */
  cells?: string[];
  raw: unknown;
}

function RsvpSection({
  title,
  icon,
  count,
  enabled,
  onToggle,
  items,
  emptyText,
  onAdd,
  onEditItem,
  onDeleteItem,
  yesNoMode,
  noMessage,
  columnWidths,
}: {
  title: string;
  icon?: React.ReactNode;
  count: number;
  enabled: boolean;
  onToggle?: () => void;
  items: SectionItem[];
  emptyText: string;
  onAdd?: () => void;
  onEditItem?: (raw: unknown) => void;
  onDeleteItem?: (id: number) => void;
  /**
   * When set, the section renders a more explicit "Sí / No" segmented
   * control instead of the generic "Incluir / Oculto" toggle, and shows
   * `noMessage` when the answer is "No". Used by sections where it's
   * meaningful to explicitly say it won't happen (e.g. autobuses).
   */
  yesNoMode?: boolean;
  noMessage?: string;
  /**
   * Optional column widths for cell-based rows (matches prototype layout).
   * `null` = `1fr`, `number` = fixed px. Length must match `item.cells`.
   */
  columnWidths?: Array<number | null>;
}) {
  const actionsCol = onEditItem || onDeleteItem ? "62px" : "0px";
  const gridTemplate = columnWidths
    ? columnWidths.map((w) => (w == null ? "1fr" : `${w}px`)).join(" ") +
      " " +
      actionsCol
    : "";
  const [open, setOpen] = useState(true);
  return (
    <div
      className="rounded-[12px] overflow-hidden"
      style={{ background: "#FFFFFF", border: "1px solid var(--line-1)" }}
    >
      <div
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left cursor-pointer"
        style={{
          padding: "12px 14px",
          borderBottom: open ? "1px solid var(--line-1)" : "none",
        }}
      >
        {icon && <span style={{ color: "var(--ink-3)" }}>{icon}</span>}
        <div className="text-[13px] font-semibold text-[var(--ink-1)]">{title}</div>
        <span
          className="inline-flex items-center rounded-[999px] text-[11px] px-2 py-0.5"
          style={{ background: "var(--bg-subtle)", color: "var(--ink-3)" }}
        >
          {count}
        </span>
        {yesNoMode ? (
          <div
            className="ml-auto inline-flex gap-1 rounded-[999px]"
            style={{ background: "var(--bg-subtle)", padding: 2 }}
            onClick={(e) => e.stopPropagation()}
          >
            {([
              { v: true, label: "Sí", bg: "#4F7A5E", fg: "#FFFFFF" },
              { v: false, label: "No", bg: "var(--ink-1)", fg: "#FFFFFF" },
            ] as const).map((opt) => {
              const active = enabled === opt.v;
              return (
                <button
                  key={String(opt.v)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (active || !onToggle) return;
                    onToggle();
                  }}
                  className="inline-flex items-center justify-center cursor-pointer border-none transition-colors"
                  style={{
                    padding: "3px 12px",
                    borderRadius: 999,
                    background: active ? opt.bg : "transparent",
                    color: active ? opt.fg : "var(--ink-3)",
                    fontSize: 11.5,
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        ) : (
          <label
            className="ml-auto inline-flex items-center gap-1.5 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[11px] text-[var(--ink-3)]">
              {enabled ? "Incluir" : "Oculto"}
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                onToggle?.();
              }}
              style={{
                position: "relative",
                display: "inline-block",
                width: 30,
                height: 16,
                background: enabled ? "#4F7A5E" : "var(--line-strong)",
                borderRadius: 999,
                cursor: onToggle ? "pointer" : "default",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: enabled ? 16 : 2,
                  width: 12,
                  height: 12,
                  background: "#fff",
                  borderRadius: "50%",
                  transition: "left .15s",
                }}
              />
            </span>
          </label>
        )}
        {open ? (
          <IcoChevUp className="h-3.5 w-3.5 text-[var(--ink-3)] ml-1.5" />
        ) : (
          <IcoChevDown className="h-3.5 w-3.5 text-[var(--ink-3)] ml-1.5" />
        )}
      </div>

      {open && (
        <div style={{ padding: "10px 14px 14px" }}>
          {yesNoMode && !enabled ? (
            <div
              className="text-[12.5px] text-[var(--ink-2)] py-3 px-3 rounded-[8px]"
              style={{ background: "var(--bg-subtle)", border: "1px dashed var(--line-1)" }}
            >
              {noMessage || "Esta sección no se incluirá en la invitación pública."}
            </div>
          ) : items.length === 0 ? (
            <div className="text-[12px] text-[var(--ink-3)] py-2">{emptyText}</div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {items.map((it) => {
                const useCells = !!(columnWidths && it.cells);
                return (
                  <div
                    key={it.id}
                    onClick={() => onEditItem?.(it.raw)}
                    className="rounded-[8px]"
                    style={{
                      padding: useCells ? "14px 12px" : "10px 12px",
                      border: "1px solid var(--line-1)",
                      background: "#FFFFFF",
                      cursor: onEditItem ? "pointer" : "default",
                      display: useCells ? "grid" : "flex",
                      gridTemplateColumns: useCells ? gridTemplate : undefined,
                      alignItems: "center",
                      gap: useCells ? 12 : 12,
                    }}
                  >
                    {useCells ? (
                      <>
                        {it.cells!.map((cell, i) => (
                          <div
                            key={i}
                            className="text-[12.5px] truncate"
                            style={{
                              color:
                                i === 0 ? "var(--ink-1)" : "var(--ink-2)",
                              fontWeight: i === 0 ? 500 : 400,
                            }}
                          >
                            {cell || "—"}
                          </div>
                        ))}
                        <div className="flex items-center justify-end gap-1">
                          {onEditItem && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditItem(it.raw);
                              }}
                              className="bg-transparent border-none cursor-pointer p-1 text-[var(--ink-3)] hover:text-[var(--ink-1)]"
                              aria-label="Editar"
                            >
                              <IcoEdit className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {onDeleteItem && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (await appConfirm({ title: "Eliminar elemento", variant: "destructive", confirmLabel: "Eliminar" }))
                                  onDeleteItem(it.id);
                              }}
                              className="bg-transparent border-none cursor-pointer p-1 text-[var(--ink-3)] hover:text-[var(--color-danger)]"
                              aria-label="Eliminar"
                            >
                              <IcoTrash className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-medium text-[var(--ink-1)] truncate">
                            {it.primary}
                          </div>
                          {it.secondary && (
                            <div className="text-[11px] text-[var(--ink-3)] truncate mt-0.5">
                              {it.secondary}
                            </div>
                          )}
                        </div>
                        {onEditItem && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditItem(it.raw);
                            }}
                            className="bg-transparent border-none cursor-pointer p-1 text-[var(--ink-3)] hover:text-[var(--ink-1)]"
                            aria-label="Editar"
                          >
                            <IcoEdit className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {onDeleteItem && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (await appConfirm({ title: "Eliminar elemento", variant: "destructive", confirmLabel: "Eliminar" }))
                                onDeleteItem(it.id);
                            }}
                            className="bg-transparent border-none cursor-pointer p-1 text-[var(--ink-3)] hover:text-[var(--color-danger)]"
                            aria-label="Eliminar"
                          >
                            <IcoTrash className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {onAdd && !(yesNoMode && !enabled) && (
            <div className="mt-2.5">
              <button
                onClick={onAdd}
                className="inline-flex items-center gap-1.5 rounded-[8px] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--line-strong)",
                  padding: "5px 10px",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--ink-1)",
                }}
              >
                <IcoPlus className="h-3 w-3" />
                Añadir
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 drawer-form-field">
      <label className="text-[12px] font-medium text-[var(--ink-2)]">{label}</label>
      {children}
    </div>
  );
}

// =============================================================================
// MenuOptionsEditor — editable list of menu choices for the event.
// Shared with the public RSVP form (guest's menu select) and the dashboard
// guests list (per-guest "Menú" dropdown).
// =============================================================================
function MenuOptionsEditor({
  options,
  disabled,
  onChange,
}: {
  options: string[];
  disabled?: boolean;
  onChange: (next: string[]) => void;
}) {
  const update = (i: number, v: string) =>
    onChange(options.map((o, j) => (j === i ? v : o)));
  const remove = (i: number) =>
    onChange(options.filter((_, j) => j !== i));
  const add = () => onChange([...options, "Nueva opción"]);

  return (
    <div className="flex flex-col gap-2 drawer-form-field">
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={opt}
            disabled={disabled}
            onChange={(e) => update(i, e.target.value)}
            placeholder="Ej. Vegetariano"
            style={{
              flex: 1,
              padding: "6px 10px",
              border: "1px solid var(--line-1)",
              borderRadius: 6,
              fontSize: 12.5,
              background: "#FFFFFF",
              color: "var(--ink-1)",
              outline: "none",
            }}
          />
          {!disabled && options.length > 1 && (
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Quitar opción"
              className="cursor-pointer"
              style={{
                background: "none",
                border: "none",
                padding: 6,
                color: "var(--ink-3)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <IcoX className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-[8px] cursor-pointer transition-colors hover:bg-[var(--bg-hover)] w-fit mt-1"
          style={{
            background: "#FFFFFF",
            border: "1px solid var(--line-strong)",
            padding: "5px 10px",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--ink-1)",
          }}
        >
          <IcoPlus className="h-3 w-3" />
          Añadir opción
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Mobile preview — simplified phone frame matching the prototype's accent
// =============================================================================

function MobilePreview({
  eventName,
  eventDate,
  location,
  coverImage,
  customMessage,
  theme,
  size = "md",
  settings,
  itinerary,
  hotels,
  nearbyPlans,
  faqs,
  transportOptions,
}: {
  eventName: string;
  eventDate?: string | null;
  location?: string | null;
  coverImage?: string | null;
  customMessage?: string;
  theme: ThemeKey;
  size?: "md" | "lg";
  settings: RsvpSettings;
  itinerary: ItineraryItem[];
  hotels: Hotel[];
  nearbyPlans: NearbyPlan[];
  faqs: Faq[];
  transportOptions: TransportOption[];
}) {
  const w = size === "lg" ? 380 : 340;
  const innerH = size === "lg" ? 700 : 620;
  const themeBg = THEME_PALETTES[theme].gradient;
  const themeAccent: Record<ThemeKey, string> = {
    ivory: "#B88A3A",
    sage: "#4F7A5E",
    dusty: "#C15B4C",
    night: "#5B6F98",
  };
  const accent = themeAccent[theme];
  const eventTimeStr = eventDate
    ? new Date(eventDate).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const dateLabel = eventDate
    ? new Date(eventDate).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Fecha por confirmar";

  // Always apply a darkening gradient so the white hero text is readable
  // regardless of theme or whether a cover image is set.
  const heroBg = coverImage
    ? `linear-gradient(rgba(0,0,0,0.20), rgba(0,0,0,0.55)), url(${coverImage}) center/cover`
    : `linear-gradient(rgba(0,0,0,0.18), rgba(0,0,0,0.50)), ${themeBg}`;

  const welcomeText =
    customMessage && customMessage.trim().length > 0
      ? customMessage
      : "Acompáñanos en este día tan especial. Confirma tu asistencia abajo.";

  const sortedItinerary = [...itinerary].sort(
    (a, b) =>
      a.orderIndex - b.orderIndex ||
      (a.startTime || "").localeCompare(b.startTime || ""),
  );
  const sortedHotels = [...hotels].sort((a, b) => a.orderIndex - b.orderIndex);
  const sortedPlans = [...nearbyPlans].sort((a, b) => a.orderIndex - b.orderIndex);
  const sortedFaqs = [...faqs].sort((a, b) => a.orderIndex - b.orderIndex);
  const activeBuses = transportOptions
    .filter((t) => t.isActive)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const showItinerary = settings.showItinerary && sortedItinerary.length > 0;
  const showHotels = settings.showHotels && sortedHotels.length > 0;
  const showBuses = settings.showTransport && activeBuses.length > 0;
  const showPlans = settings.showNearbyPlans && sortedPlans.length > 0;
  const showFaqs = settings.showFaqs && sortedFaqs.length > 0;

  return (
    <div
      style={{
        width: w,
        margin: "0 auto",
        border: "10px solid #1E1C1A",
        borderRadius: 38,
        background: "#1E1C1A",
        boxShadow:
          "0 18px 40px -16px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.10)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Notch */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 110,
          height: 22,
          background: "#1E1C1A",
          borderRadius: "0 0 14px 14px",
          zIndex: 2,
        }}
      />

      <div
        style={{
          height: innerH,
          overflowX: "hidden",
          overflowY: "auto",
          background: "#FBFAF7",
          borderRadius: 28,
        }}
      >
        {/* Hero */}
        <div style={{ height: 180, background: heroBg, position: "relative" }}>
          <div
            style={{
              position: "absolute",
              bottom: 14,
              left: 0,
              right: 0,
              color: "#FFFFFF",
              textAlign: "center",
              padding: "0 14px",
            }}
          >
            <div
              style={{
                fontSize: 9.5,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                opacity: 0.85,
              }}
            >
              Te invitamos
            </div>
            <div
              style={{
                fontFamily:
                  '"Playfair Display", "Cormorant Garamond", "Georgia", serif',
                fontSize: 28,
                fontWeight: 600,
                margin: "6px 0 4px",
                letterSpacing: "-0.01em",
                lineHeight: 1.1,
                textShadow: "0 1px 4px rgba(0,0,0,0.25)",
              }}
            >
              {eventName}
            </div>
            <div style={{ fontSize: 11, opacity: 0.95, letterSpacing: "0.02em" }}>
              {dateLabel}
              {eventTimeStr ? ` · ${eventTimeStr}` : ""}
              {location ? ` · ${location}` : ""}
            </div>
          </div>
        </div>

        {/* Welcome + RSVP CTA */}
        <div style={{ padding: "18px 20px", background: "#FBFAF7" }}>
          <div
            style={{
              fontSize: 12.5,
              color: "var(--ink-2)",
              lineHeight: 1.55,
              textAlign: "center",
              fontStyle: customMessage ? "normal" : "italic",
              opacity: customMessage ? 1 : 0.78,
            }}
          >
            {welcomeText}
          </div>
          {/* Ornamental flourish — small line + dot */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              margin: "14px 0 4px",
            }}
          >
            <span
              style={{
                width: 32,
                height: 1,
                background: accent,
                opacity: 0.4,
              }}
            />
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: accent,
                opacity: 0.6,
              }}
            />
            <span
              style={{
                width: 32,
                height: 1,
                background: accent,
                opacity: 0.4,
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 8,
              marginTop: 12,
            }}
          >
            <button
              disabled
              style={{
                padding: "10px 20px",
                background: accent,
                color: "#FFFFFF",
                border: "none",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                cursor: "default",
                letterSpacing: "0.02em",
              }}
            >
              Asistiré
            </button>
            <button
              disabled
              style={{
                padding: "10px 20px",
                background: "#FFFFFF",
                color: "var(--ink-2)",
                border: "1px solid var(--line-strong)",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                cursor: "default",
                letterSpacing: "0.02em",
              }}
            >
              No podré
            </button>
          </div>
          {settings.deadline && (
            <div
              style={{
                fontSize: 10.5,
                color: "var(--ink-3)",
                textAlign: "center",
                marginTop: 8,
              }}
            >
              Confirma antes del{" "}
              {new Date(settings.deadline).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
              })}
            </div>
          )}
        </div>

        {/* Horarios */}
        {showItinerary && (
          <PreviewSection title="Horarios" accent={accent}>
            {sortedItinerary.map((it) => (
              <div
                key={it.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "52px 1fr",
                  gap: 10,
                  padding: "8px 0",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: accent,
                  }}
                >
                  {fmtTime(it.startTime) || "—"}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "var(--ink-1)",
                      lineHeight: 1.3,
                    }}
                  >
                    {it.title}
                  </div>
                  {it.description && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--ink-3)",
                        marginTop: 2,
                        lineHeight: 1.4,
                      }}
                    >
                      {it.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </PreviewSection>
        )}

        {/* Dónde dormir */}
        {showHotels && (
          <PreviewSection title="Dónde dormir" accent={accent}>
            {sortedHotels.map((h) => (
              <div key={h.id} style={{ padding: "12px 0" }}>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "var(--ink-1)",
                  }}
                >
                  {h.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ink-3)",
                    marginTop: 2,
                  }}
                >
                  {[h.distance, h.priceRange].filter(Boolean).join(" · ") ||
                    h.address ||
                    ""}
                </div>
                {h.website && (
                  <div
                    style={{
                      fontSize: 11,
                      color: accent,
                      marginTop: 3,
                      textDecoration: "underline",
                      wordBreak: "break-all",
                    }}
                  >
                    {h.website.replace(/^https?:\/\//, "")}
                  </div>
                )}
              </div>
            ))}
          </PreviewSection>
        )}

        {/* Transporte */}
        {showBuses && (
          <PreviewSection title="Transporte" accent={accent}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginTop: 4,
              }}
            >
              {activeBuses.map((b) => (
                <div
                  key={b.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "6px 10px",
                    background: "var(--bg-subtle)",
                    borderRadius: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: accent,
                      minWidth: 40,
                    }}
                  >
                    {fmtTime(b.departureTime) || "—"}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--ink-2)",
                      lineHeight: 1.3,
                    }}
                  >
                    {b.departureLocation
                      ? `${b.name} · sale de ${b.departureLocation}`
                      : b.name}
                  </div>
                </div>
              ))}
            </div>
          </PreviewSection>
        )}

        {/* Actividades */}
        {showPlans && (
          <PreviewSection title="Actividades" accent={accent}>
            {sortedPlans.map((p) => (
              <div key={p.id} style={{ padding: "10px 0" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "var(--ink-1)",
                    }}
                  >
                    {p.name}
                  </div>
                  {p.category && (
                    <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                      {p.category}
                    </div>
                  )}
                </div>
                {p.address && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--ink-3)",
                      marginTop: 4,
                    }}
                  >
                    {p.address}
                  </div>
                )}
                {p.website && (
                  <div
                    style={{
                      fontSize: 11,
                      color: accent,
                      marginTop: 4,
                      textDecoration: "underline",
                      wordBreak: "break-all",
                    }}
                  >
                    {p.website.replace(/^https?:\/\//, "")}
                  </div>
                )}
              </div>
            ))}
          </PreviewSection>
        )}

        {/* FAQ */}
        {showFaqs && (
          <PreviewSection title="Preguntas frecuentes" accent={accent}>
            {sortedFaqs.map((f) => (
              <div key={f.id} style={{ padding: "8px 0" }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--ink-1)",
                  }}
                >
                  {f.question}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ink-3)",
                    marginTop: 2,
                    lineHeight: 1.5,
                  }}
                >
                  {f.answer}
                </div>
              </div>
            ))}
          </PreviewSection>
        )}

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

function PreviewSection({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "16px 20px 14px",
        borderTop: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: accent,
          }}
        >
          {title}
        </span>
        <span
          style={{
            flex: 1,
            height: 1,
            background: accent,
            opacity: 0.18,
          }}
        />
      </div>
      {children}
    </div>
  );
}

// "08:30:00" / "08:30" → "08:30"; ISO datetime → "HH:MM" (UTC, no TZ shift).
// We always write itinerary times as "1970-01-01T<HH:MM>:00.000Z" so reading
// them back via UTC keeps the exact value the user entered.
function fmtTime(value: string | null | undefined): string {
  if (!value) return "";
  if (/^\d{2}:\d{2}$/.test(value)) return value;
  if (/^\d{2}:\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// Extract "HH:MM" from any of: null/undefined, "HH:MM", "HH:MM:SS", ISO datetime.
function isoToHHMM(value: string | null | undefined): string {
  return fmtTime(value);
}

// =============================================================================
// Drawers — Itinerary / Hotel / Bus / Plan / Faq
// =============================================================================

function DrawerShell({
  open,
  onClose,
  title,
  subtitle,
  children,
  onSave,
  isEditing,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onSave: () => void;
  isEditing: boolean;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(30,25,20,0.28)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 100,
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 96vw)",
          background: "#FFFFFF",
          boxShadow: "-20px 0 40px -10px rgba(0,0,0,.18)",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          borderLeft: "1px solid var(--line-1)",
        }}
      >
        <div
          className="flex items-center"
          style={{ padding: "16px 20px", borderBottom: "1px solid var(--line-1)" }}
        >
          <div>
            <div
              className="text-[16px] font-semibold text-[var(--ink-1)]"
              style={{ letterSpacing: "-0.01em" }}
            >
              {title}
            </div>
            {subtitle && (
              <div className="text-[12px] text-[var(--ink-3)] mt-0.5">{subtitle}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-auto bg-transparent border-none cursor-pointer p-1.5 text-[var(--ink-3)]"
          >
            <IcoX className="h-4 w-4" />
          </button>
        </div>
        <div
          className="flex-1 overflow-auto"
          style={{ padding: "20px 22px" }}
        >
          {children}
        </div>
        <div
          className="flex gap-2 justify-end"
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--line-1)",
          }}
        >
          <button
            onClick={onClose}
            className="inline-flex items-center rounded-[8px] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
            style={{
              background: "#FFFFFF",
              border: "1px solid var(--line-strong)",
              padding: "8px 14px",
              fontSize: 12.5,
              fontWeight: 500,
              color: "var(--ink-1)",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            className="inline-flex items-center rounded-[8px] cursor-pointer transition-colors border-none"
            style={{
              background: "var(--ink-1)",
              color: "#FFFFFF",
              padding: "8px 14px",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            {isEditing ? "Guardar" : "Añadir"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ItineraryDrawer({
  open,
  onClose,
  editing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  editing: ItineraryItem | null;
  onSave: (item: Partial<ItineraryItem>) => void;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    location: "",
  });
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        title: editing?.title || "",
        description: editing?.description || "",
        startTime: isoToHHMM(editing?.startTime),
        endTime: isoToHHMM(editing?.endTime),
        location: editing?.location || "",
      });
    }
  }, [open, editing]);
  return (
    <DrawerShell
      open={open}
      onClose={onClose}
      title={editing ? "Editar horario" : "Añadir horario"}
      subtitle="Define el momento del día y dónde."
      onSave={() =>
        onSave({
          title: form.title,
          description: form.description || null,
          // The DB column is `timestamp`. Pack the user-entered "HH:MM" into a
          // fixed-date UTC ISO string so it round-trips losslessly without
          // timezone shifts. fmtTime() extracts back to "HH:MM".
          startTime: form.startTime ? `1970-01-01T${form.startTime}:00.000Z` : null,
          endTime: form.endTime ? `1970-01-01T${form.endTime}:00.000Z` : null,
          location: form.location || null,
        })
      }
      isEditing={!!editing}
    >
      <div className="grid gap-3 drawer-form-field">
        <FormField label="Título *">
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Ej. Ceremonia"
          />
        </FormField>
        <div className="grid grid-cols-2 gap-2.5">
          <FormField label="Hora inicio">
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
            />
          </FormField>
          <FormField label="Hora fin">
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
            />
          </FormField>
        </div>
        <FormField label="Lugar">
          <input
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            placeholder="Ej. Iglesia San Miguel"
          />
        </FormField>
        <FormField label="Descripción">
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Detalles adicionales..."
            style={{ resize: "vertical" }}
          />
        </FormField>
      </div>
    </DrawerShell>
  );
}

function HotelDrawer({
  open,
  onClose,
  editing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  editing: Hotel | null;
  onSave: (item: Partial<Hotel>) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    website: "",
    priceRange: "",
    distance: "",
  });
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        name: editing?.name || "",
        description: editing?.description || "",
        address: editing?.address || "",
        phone: editing?.phone || "",
        website: editing?.website || "",
        priceRange: editing?.priceRange || "",
        distance: editing?.distance || "",
      });
    }
  }, [open, editing]);
  return (
    <DrawerShell
      open={open}
      onClose={onClose}
      title={editing ? "Editar hotel" : "Añadir hotel"}
      subtitle="Completa todos los datos del hotel."
      onSave={() =>
        onSave({
          name: form.name,
          description: form.description || null,
          address: form.address || null,
          phone: form.phone || null,
          website: form.website || null,
          priceRange: form.priceRange || null,
          distance: form.distance || null,
        })
      }
      isEditing={!!editing}
    >
      <div className="grid gap-3 drawer-form-field">
        <FormField label="Nombre *">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nombre del hotel"
          />
        </FormField>
        <FormField label="Descripción">
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Descripción breve..."
            style={{ resize: "vertical" }}
          />
        </FormField>
        <FormField label="Dirección">
          <input
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="Dirección completa"
          />
        </FormField>
        <div className="grid grid-cols-2 gap-2.5">
          <FormField label="Teléfono">
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+34 600 000 000"
            />
          </FormField>
          <FormField label="Rango de precios">
            <input
              value={form.priceRange}
              onChange={(e) => setForm((f) => ({ ...f, priceRange: e.target.value }))}
              placeholder="$$ - $$$"
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <FormField label="Sitio web">
            <input
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              placeholder="https://..."
            />
          </FormField>
          <FormField label="Distancia">
            <input
              value={form.distance}
              onChange={(e) => setForm((f) => ({ ...f, distance: e.target.value }))}
              placeholder="A 5 min del evento"
            />
          </FormField>
        </div>
      </div>
    </DrawerShell>
  );
}

function BusDrawer({
  open,
  onClose,
  editing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  editing: TransportOption | null;
  onSave: (item: Partial<TransportOption>) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    departureLocation: "",
    departureAddress: "",
    departureTime: "",
    returnTime: "",
    capacity: "20",
  });
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        name: editing?.name || "",
        departureLocation: editing?.departureLocation || "",
        departureAddress: editing?.departureAddress || "",
        departureTime: editing?.departureTime || "",
        returnTime: editing?.returnTime || "",
        capacity: editing?.capacity ? String(editing.capacity) : "20",
      });
    }
  }, [open, editing]);
  return (
    <DrawerShell
      open={open}
      onClose={onClose}
      title={editing ? "Editar autobús" : "Añadir autobús"}
      subtitle="Define origen, destino y capacidad."
      onSave={() =>
        onSave({
          name: form.name || "Autobús",
          departureLocation: form.departureLocation || null,
          departureAddress: form.departureAddress || null,
          departureTime: form.departureTime || null,
          returnTime: form.returnTime || null,
          capacity: parseInt(form.capacity, 10) || null,
        })
      }
      isEditing={!!editing}
    >
      <div className="grid gap-3 drawer-form-field">
        <FormField label="Nombre / etiqueta">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ej. Bus al evento"
          />
        </FormField>
        <FormField label="Punto de salida">
          <input
            value={form.departureLocation}
            onChange={(e) =>
              setForm((f) => ({ ...f, departureLocation: e.target.value }))
            }
            placeholder="Plaza del Ayuntamiento"
          />
        </FormField>
        <FormField label="Dirección de salida">
          <input
            value={form.departureAddress}
            onChange={(e) =>
              setForm((f) => ({ ...f, departureAddress: e.target.value }))
            }
            placeholder="Calle Mayor 12, Madrid"
          />
        </FormField>
        <div className="grid grid-cols-2 gap-2.5">
          <FormField label="Hora salida">
            <input
              type="time"
              value={form.departureTime}
              onChange={(e) => setForm((f) => ({ ...f, departureTime: e.target.value }))}
            />
          </FormField>
          <FormField label="Hora regreso">
            <input
              type="time"
              value={form.returnTime}
              onChange={(e) => setForm((f) => ({ ...f, returnTime: e.target.value }))}
            />
          </FormField>
        </div>
        <FormField label="Capacidad">
          <input
            type="number"
            min="1"
            value={form.capacity}
            onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
            placeholder="20"
          />
        </FormField>
      </div>
    </DrawerShell>
  );
}

function PlanDrawer({
  open,
  onClose,
  editing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  editing: NearbyPlan | null;
  onSave: (item: Partial<NearbyPlan>) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    address: "",
    website: "",
  });
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        name: editing?.name || "",
        description: editing?.description || "",
        category: editing?.category || "",
        address: editing?.address || "",
        website: editing?.website || "",
      });
    }
  }, [open, editing]);
  return (
    <DrawerShell
      open={open}
      onClose={onClose}
      title={editing ? "Editar plan" : "Añadir plan"}
      subtitle="Completa la actividad y su lugar."
      onSave={() =>
        onSave({
          name: form.name,
          description: form.description || null,
          category: form.category || null,
          address: form.address || null,
          website: form.website || null,
        })
      }
      isEditing={!!editing}
    >
      <div className="grid gap-3 drawer-form-field">
        <FormField label="Nombre *">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nombre del plan"
          />
        </FormField>
        <FormField label="Categoría">
          <input
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            placeholder="Ej. Restaurante"
          />
        </FormField>
        <FormField label="Dirección">
          <input
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="Lugar"
          />
        </FormField>
        <FormField label="Sitio web">
          <input
            value={form.website}
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            placeholder="https://..."
          />
        </FormField>
        <FormField label="Descripción">
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Descripción breve..."
            style={{ resize: "vertical" }}
          />
        </FormField>
      </div>
    </DrawerShell>
  );
}

function FaqDrawer({
  open,
  onClose,
  editing,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  editing: Faq | null;
  onSave: (item: Partial<Faq>) => void;
}) {
  const [form, setForm] = useState({ question: "", answer: "" });
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        question: editing?.question || "",
        answer: editing?.answer || "",
      });
    }
  }, [open, editing]);
  return (
    <DrawerShell
      open={open}
      onClose={onClose}
      title={editing ? "Editar pregunta" : "Añadir pregunta"}
      subtitle="Pregunta frecuente y su respuesta."
      onSave={() =>
        onSave({
          question: form.question,
          answer: form.answer,
        })
      }
      isEditing={!!editing}
    >
      <div className="grid gap-3 drawer-form-field">
        <FormField label="Pregunta *">
          <input
            value={form.question}
            onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
            placeholder="¿Hay dress code?"
          />
        </FormField>
        <FormField label="Respuesta *">
          <textarea
            rows={4}
            value={form.answer}
            onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
            placeholder="Detalles de la respuesta..."
            style={{ resize: "vertical" }}
          />
        </FormField>
      </div>
    </DrawerShell>
  );
}
