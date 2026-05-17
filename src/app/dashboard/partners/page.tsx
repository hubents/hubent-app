"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { EventScopedGuard } from "@/components/layout/event-scoped-guard";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { hgIcon } from "@/components/ui/hg-icon";
import { PartnerLandingDrawer } from "@/components/partners/partner-landing-drawer";
import {
  Search01Icon,
  FilterIcon,
  ArrowDown01Icon,
  Location01Icon,
  PlusSignIcon,
  Cancel01Icon,
  Tick01Icon,
  Calendar03Icon,
  ArrowRight01Icon,
  GridViewIcon,
  Menu01Icon,
  Camera01Icon,
  ExternalDriveIcon,
  SentIcon,
} from "@hugeicons/core-free-icons";
import { PROVIDER_CATEGORIES } from "@/config/provider-constants";
import { avColor } from "@/lib/ui-utils";

const IcoSearch = hgIcon(Search01Icon);
const IcoFilter = hgIcon(FilterIcon);
const IcoChevDown = hgIcon(ArrowDown01Icon);
const IcoMap = hgIcon(Location01Icon);
const IcoPlus = hgIcon(PlusSignIcon);
const IcoX = hgIcon(Cancel01Icon);
const IcoCheck = hgIcon(Tick01Icon);
const IcoCalendar = hgIcon(Calendar03Icon);
const IcoChevRight = hgIcon(ArrowRight01Icon);
const IcoGrid = hgIcon(GridViewIcon);
const IcoList = hgIcon(Menu01Icon);
const IcoCamera = hgIcon(Camera01Icon);
const IcoExternal = hgIcon(ExternalDriveIcon);
const IcoSend = hgIcon(SentIcon);

const PARTNERS_VIEW_STORAGE = "partners-view";

interface PartnersListing {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  orgType: string | null;
  tagline: string | null;
  description: string | null;
  providerCategory: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  priceRange: string | null;
  averageRating: string | null;
  totalReviews: number | null;
  verificationStatus: string | null;
  isFeatured: boolean;
  coverImage: string | null;
  instagramHandle: string | null;
  services: string[] | null;
  categories: string[] | null;
  profileCompleteness: number | null;
  phone: string | null;
  website: string | null;
  isFavorite: boolean;
  isUnclaimed: boolean;
  isMyProvider: boolean;
}

function readStoredViewMode(): "cards" | "list" {
  if (typeof window === "undefined") return "cards";
  const next = localStorage.getItem(PARTNERS_VIEW_STORAGE) as "cards" | "list" | null;
  if (next === "cards" || next === "list") return next;
  return "cards";
}

// Stars component — replicates the prototype's `Stars` (suppliers.jsx:3-25):
// 5 stars with half-star gradient at the boundary.
function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span style={{ display: "inline-flex", gap: 1, alignItems: "center" }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const filled = i < full;
        const isHalf = i === full && half;
        const gid = `pstars-${size}-${rating}-${i}`;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24">
            <defs>
              <linearGradient id={gid} x1="0" x2="1" y1="0" y2="0">
                <stop offset="50%" stopColor="#F4B942" />
                <stop offset="50%" stopColor="#E8E4DB" />
              </linearGradient>
            </defs>
            <path
              d="M12 2l3 7 7 .5-5.5 4.5 2 7L12 17l-6.5 4 2-7L2 9.5 9 9z"
              fill={isHalf ? `url(#${gid})` : filled ? "#F4B942" : "#E8E4DB"}
            />
          </svg>
        );
      })}
    </span>
  );
}

export default function PartnersPage() {
  return (
    <EventScopedGuard>
      <PartnersContent />
    </EventScopedGuard>
  );
}

interface PendingClaim {
  id: number;
  contactId: number;
  providerName: string;
  email: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

function PartnersContent() {
  const [providers, setProviders] = useState<PartnersListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"cards" | "list">(readStoredViewMode);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<PartnersListing | null>(null);
  const [profileTarget, setProfileTarget] = useState<PartnersListing | null>(null);
  const [events, setEvents] = useState<{ id: number; name: string }[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [inviting, setInviting] = useState(false);
  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([]);
  const [resendingId, setResendingId] = useState<number | null>(null);

  const [country, setCountry] = useState("");

  const [catOpen, setCatOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);
  const countryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!catOpen) return;
    const h = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
    };
    const id = setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", h); };
  }, [catOpen]);

  useEffect(() => {
    if (!cityOpen) return;
    const h = (e: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false);
    };
    const id = setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", h); };
  }, [cityOpen]);

  // Close country dropdown on outside click
  useEffect(() => {
    if (!countryOpen) return;
    const h = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) setCountryOpen(false);
    };
    const id = setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", h); };
  }, [countryOpen]);

  // Pre-fill country and city from the current org on first load
  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        if (d.data?.orgCountry) setCountry(d.data.orgCountry);
        if (d.data?.orgCity) setCity(d.data.orgCity);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (inviteTarget) {
      fetch("/api/events?limit=50")
        .then((r) => r.json())
        .then((d) => {
          if (d.success)
            setEvents(d.data?.map((e: { id: number; name: string }) => ({ id: e.id, name: e.name })) || []);
        })
        .catch(() => {});
    }
  }, [inviteTarget]);

  const handleInviteToEvent = async () => {
    if (!inviteTarget || !selectedEventId) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/events/${selectedEventId}/partners`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestOrgId: inviteTarget.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${inviteTarget.name} invitado al evento`);
      } else if (data.error?.code === "DUPLICATE") {
        toast.info("Este partner ya está invitado al evento");
      } else {
        toast.error(data.error?.message || "Error al invitar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setInviting(false);
      setInviteTarget(null);
      setSelectedEventId("");
    }
  };

  const fetchPendingClaims = useCallback(async () => {
    try {
      const res = await fetch("/api/claim/mine");
      const data = await res.json();
      if (data.success) setPendingClaims(data.data ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchPendingClaims(); }, [fetchPendingClaims]);

  const handleResendClaim = async (claim: PendingClaim) => {
    setResendingId(claim.id);
    try {
      const res = await fetch("/api/claim/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: claim.contactId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Invitación reenviada a ${claim.email}`);
        fetchPendingClaims();
      } else {
        toast.error(data.error?.message || "No se pudo reenviar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setResendingId(null);
    }
  };

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (city) params.set("city", city);
      if (country) params.set("country", country);
      if (favoritesOnly) params.set("favorites", "true");
      if (verifiedOnly) params.set("verified", "true");
      params.set("page", page.toString());
      params.set("limit", "50");

      const res = await fetch(`/api/providers?${params}`);
      const data = await res.json();
      if (data.success) {
        setProviders(data.data?.data ?? []);
        setTotal(data.data?.meta?.total ?? data.data?.data?.length ?? 0);
      }
    } catch {
      console.error("Error fetching providers");
    } finally {
      setLoading(false);
    }
  }, [search, category, city, country, favoritesOnly, verifiedOnly, page]);

  useEffect(() => {
    setPage(1);
  }, [search, category, city, country, favoritesOnly, verifiedOnly]);

  useEffect(() => {
    const timer = setTimeout(fetchProviders, 300);
    return () => clearTimeout(timer);
  }, [fetchProviders]);

  const toggleViewMode = (mode: "cards" | "list") => {
    setViewMode(mode);
    localStorage.setItem(PARTNERS_VIEW_STORAGE, mode);
  };

  const toggleFavorite = async (provider: PartnersListing) => {
    try {
      const wasFav = provider.isFavorite;
      const res = wasFav
        ? await fetch(`/api/providers/favorites/${provider.id}`, { method: "DELETE" })
        : await fetch("/api/providers/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ providerOrgId: provider.id }),
          });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error?.message || "No se pudo actualizar favorito");
        return;
      }
      setProviders((prev) =>
        prev.map((p) => (p.id === provider.id ? { ...p, isFavorite: !p.isFavorite } : p)),
      );
      if (!wasFav) toast.success(`${provider.name} añadido a Contactos · Proveedor`);
      else toast.success(`${provider.name} eliminado de Contactos`);
    } catch {
      toast.error("No se pudo actualizar favorito");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setCity("");
    setCountry("");
    setFavoritesOnly(false);
    setVerifiedOnly(false);
  };

  const hasFilters = !!(search || category || city || country || favoritesOnly || verifiedOnly);
  const activeCount =
    (category ? 1 : 0) + (city ? 1 : 0) + (country ? 1 : 0) +
    (favoritesOnly ? 1 : 0) + (verifiedOnly ? 1 : 0) + (search ? 1 : 0);

  // Build lookup: normalized provider name → pending claim (for card badges)
  const claimByName = new Map<string, PendingClaim>(
    pendingClaims.map((c) => [c.providerName.toLowerCase().trim(), c])
  );

  // Build dropdown options from loaded providers
  const cities = ["Todas", ...Array.from(new Set(providers.map((p) => p.city).filter((c): c is string => !!c))).sort()];
  const categories = ["Todas", ...PROVIDER_CATEGORIES];

  // Countries: derive from loaded providers + keep current filter value visible
  const countryNames = new Intl.DisplayNames(["es"], { type: "region" });
  const countryLabel = (code: string) => { try { return countryNames.of(code) ?? code; } catch { return code; } };
  const providerCountryCodes = Array.from(new Set(providers.map((p) => p.country).filter((c): c is string => !!c))).sort();
  // Always include the active filter even if no provider currently matches (avoids chip disappearing)
  if (country && !providerCountryCodes.includes(country)) providerCountryCodes.push(country);
  const countries = ["Todos", ...providerCountryCodes];

  return (
    <div className="flex flex-col gap-3.5">
      {/* Brand label kept for screen readers / regression guards.
          Prototype intentionally omits a visible h1 — only the subtitle. */}
      <h1 className="sr-only">Partners Hubents</h1>
      <div style={{ marginTop: -6 }}>
        <p className="text-[13px] text-[var(--ink-3)] leading-[1.4]">
          Encuentra y gestiona proveedores para tus eventos
        </p>
      </div>

      {/* ── Pending claims panel ─────────────────────────────────────── */}
      {pendingClaims.length > 0 && (
        <div style={{
          background: "#fffbeb",
          border: "1px solid #fcd34d",
          borderRadius: 10,
          padding: "14px 16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <IcoSend className="h-3.5 w-3.5" style={{ color: "#b45309" }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#92400e" }}>
              {pendingClaims.length} proveedor{pendingClaims.length > 1 ? "es" : ""} con invitación pendiente
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pendingClaims.map((claim) => {
              const isManual = claim.status === "needs_manual_verification";
              const isExpired = new Date() > new Date(claim.expiresAt);
              return (
                <div key={claim.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 8, background: "white", borderRadius: 7, padding: "8px 12px",
                  border: "1px solid #fde68a",
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 1 }}>
                      {claim.providerName}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#6b7280", display: "flex", alignItems: "center", gap: 4 }}>
                      {claim.email}
                      {isManual && (
                        <span style={{
                          background: "#fef3c7", color: "#92400e", borderRadius: 4,
                          padding: "1px 6px", fontSize: 10.5, fontWeight: 500,
                        }}>
                          Verificación manual
                        </span>
                      )}
                      {isExpired && (
                        <span style={{
                          background: "#fee2e2", color: "#991b1b", borderRadius: 4,
                          padding: "1px 6px", fontSize: 10.5, fontWeight: 500,
                        }}>
                          Expirado
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleResendClaim(claim)}
                    disabled={resendingId === claim.id}
                    style={{
                      flexShrink: 0, display: "flex", alignItems: "center", gap: 5,
                      background: "#f59e0b", color: "white", border: "none", borderRadius: 6,
                      padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      opacity: resendingId === claim.id ? 0.6 : 1,
                    }}
                  >
                    <IcoSend className="h-3 w-3" />
                    {resendingId === claim.id ? "Enviando..." : "Reenviar"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div
        className="rounded-[12px] p-[18px]"
        style={{ background: "#FFFFFF", border: "1px solid var(--line-1)" }}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
          <div
            className="flex items-center gap-2 rounded-[8px]"
            style={{
              background: "#FFFFFF",
              border: "1px solid var(--line-1)",
              padding: "8px 12px",
              width: 260,
            }}
          >
            <IcoSearch className="h-3.5 w-3.5 text-[var(--ink-3)]" />
            <input
              type="text"
              placeholder="Buscar por nombre, categoría, ciudad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-[13px] text-[var(--ink-1)] placeholder:text-[var(--ink-3)]"
            />
          </div>

          {/* Category dropdown — dark when active */}
          <div ref={catRef} className="relative">
            <button
              onClick={() => setCatOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-[8px] cursor-pointer transition-colors"
              style={{
                padding: "7px 12px",
                fontSize: 12.5,
                fontWeight: 500,
                background: category ? "var(--ink-1)" : "#FFFFFF",
                color: category ? "white" : "var(--ink-1)",
                border: category ? "1px solid var(--ink-1)" : "1px solid var(--line-strong)",
              }}
            >
              <IcoFilter className="h-3 w-3" />
              {category || "Categoría"}
              <IcoChevDown className="h-3 w-3" />
            </button>
            {catOpen && (
              <div
                className="absolute left-0 top-[calc(100%+4px)] min-w-[200px] rounded-[8px] p-1 z-50"
                style={{
                  background: "white",
                  border: "1px solid var(--line-1)",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                }}
              >
                {categories.map((c) => {
                  const isAll = c === "Todas";
                  const active = isAll ? !category : category === c;
                  return (
                    <button
                      key={c}
                      onClick={() => {
                        setCategory(isAll ? "" : c);
                        setCatOpen(false);
                      }}
                      className="flex items-center gap-2 w-full text-left cursor-pointer transition-colors"
                      style={{
                        padding: "8px 10px",
                        background: active ? "var(--bg-subtle)" : "transparent",
                        border: "none",
                        borderRadius: 4,
                        fontSize: 12.5,
                        fontWeight: active ? 600 : 400,
                        color: "var(--ink-1)",
                      }}
                    >
                      {active && <IcoCheck className="h-3 w-3" />}
                      <span style={{ marginLeft: active ? 0 : 20 }}>{c}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* City dropdown — dark when active */}
          <div ref={cityRef} className="relative">
            <button
              onClick={() => setCityOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-[8px] cursor-pointer transition-colors"
              style={{
                padding: "7px 12px",
                fontSize: 12.5,
                fontWeight: 500,
                background: city ? "var(--ink-1)" : "#FFFFFF",
                color: city ? "white" : "var(--ink-1)",
                border: city ? "1px solid var(--ink-1)" : "1px solid var(--line-strong)",
              }}
            >
              <IcoMap className="h-3 w-3" />
              {city || "Ciudad"}
              <IcoChevDown className="h-3 w-3" />
            </button>
            {cityOpen && (
              <div
                className="absolute left-0 top-[calc(100%+4px)] min-w-[200px] rounded-[8px] p-1 z-50"
                style={{
                  background: "white",
                  border: "1px solid var(--line-1)",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                }}
              >
                {cities.map((c) => {
                  const isAll = c === "Todas";
                  const active = isAll ? !city : city === c;
                  return (
                    <button
                      key={c}
                      onClick={() => {
                        setCity(isAll ? "" : c);
                        setCityOpen(false);
                      }}
                      className="flex items-center gap-2 w-full text-left cursor-pointer transition-colors"
                      style={{
                        padding: "8px 10px",
                        background: active ? "var(--bg-subtle)" : "transparent",
                        border: "none",
                        borderRadius: 4,
                        fontSize: 12.5,
                        fontWeight: active ? 600 : 400,
                        color: "var(--ink-1)",
                      }}
                    >
                      {active && <IcoCheck className="h-3 w-3" />}
                      <span style={{ marginLeft: active ? 0 : 20 }}>{c}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Country dropdown */}
          <div ref={countryRef} className="relative">
            <button
              onClick={() => setCountryOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-[8px] cursor-pointer transition-colors"
              style={{
                padding: "7px 12px",
                fontSize: 12.5,
                fontWeight: 500,
                background: country ? "var(--ink-1)" : "#FFFFFF",
                color: country ? "white" : "var(--ink-1)",
                border: country ? "1px solid var(--ink-1)" : "1px solid var(--line-strong)",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              {country ? countryLabel(country) : "País"}
              <IcoChevDown className="h-3 w-3" />
            </button>
            {countryOpen && (
              <div
                className="absolute left-0 top-[calc(100%+4px)] min-w-[180px] rounded-[8px] p-1 z-50"
                style={{ background: "white", border: "1px solid var(--line-1)", boxShadow: "0 6px 20px rgba(0,0,0,0.08)" }}
              >
                {countries.map((c) => {
                  const isAll = c === "Todos";
                  const active = isAll ? !country : country === c;
                  return (
                    <button
                      key={c}
                      onClick={() => { setCountry(isAll ? "" : c); setCountryOpen(false); }}
                      className="flex items-center gap-2 w-full text-left cursor-pointer transition-colors"
                      style={{
                        padding: "8px 10px", background: active ? "var(--bg-subtle)" : "transparent",
                        border: "none", borderRadius: 4, fontSize: 12.5,
                        fontWeight: active ? 600 : 400, color: "var(--ink-1)",
                      }}
                    >
                      {active && <IcoCheck className="h-3 w-3" />}
                      <span style={{ marginLeft: active ? 0 : 20 }}>
                        {isAll ? "Todos los países" : countryLabel(c)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mis proveedores toggle (favorites) — red bg when active */}
          <button
            onClick={() => setFavoritesOnly((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-[8px] cursor-pointer transition-colors"
            style={{
              padding: "7px 12px",
              fontSize: 12.5,
              fontWeight: 500,
              background: favoritesOnly ? "#FEF0F0" : "#FFFFFF",
              color: favoritesOnly ? "#C44" : "var(--ink-2)",
              border: `1px solid ${favoritesOnly ? "#E8B8B8" : "var(--line-strong)"}`,
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill={favoritesOnly ? "#C44" : "none"}
              stroke={favoritesOnly ? "#C44" : "currentColor"}
              strokeWidth="1.8"
            >
              <path d="M12 21s-8-5-8-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-8 11-8 11z" />
            </svg>
            Mis proveedores
          </button>

          {/* Verified toggle — blue bg when active */}
          <button
            onClick={() => setVerifiedOnly((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-[8px] cursor-pointer transition-colors"
            style={{
              padding: "7px 12px",
              fontSize: 12.5,
              fontWeight: 500,
              background: verifiedOnly ? "#E8F0FB" : "#FFFFFF",
              color: verifiedOnly ? "#4B7BE8" : "var(--ink-2)",
              border: `1px solid ${verifiedOnly ? "#B8D0F0" : "var(--line-strong)"}`,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={verifiedOnly ? "#4B7BE8" : "none"}
              stroke={verifiedOnly ? "#4B7BE8" : "currentColor"}
              strokeWidth="1.8"
            >
              <path d="M12 2l2.5 2.2 3.3-.3.7 3.3 3 1.5-1.2 3.1 1.2 3.1-3 1.5-.7 3.3-3.3-.3L12 22l-2.5-2.2-3.3.3-.7-3.3-3-1.5 1.2-3.1L2.5 9l3-1.5.7-3.3 3.3.3L12 2z" />
              <path d="M8.5 12l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.8" fill="none" />
            </svg>
            Verificados
          </button>

          {activeCount > 0 && (
            <button
              onClick={clearFilters}
              className="cursor-pointer text-[var(--ink-3)]"
              style={{
                background: "transparent",
                border: "none",
                fontSize: 12,
                textDecoration: "underline",
                padding: "7px 4px",
              }}
            >
              Limpiar filtros
            </button>
          )}

          <div className="ml-auto flex items-center gap-2.5">
            <span className="text-[12px] text-[var(--ink-3)]">
              {providers.length} de {total}
            </span>
            {/* Grid / List toggle */}
            <div
              className="inline-flex"
              style={{
                background: "white",
                border: "1px solid var(--line-strong)",
                borderRadius: 8,
                padding: 2,
              }}
            >
              <button
                onClick={() => toggleViewMode("cards")}
                aria-label="Vista tarjetas"
                className="cursor-pointer inline-flex items-center justify-center"
                style={{
                  background: viewMode === "cards" ? "var(--bg-subtle)" : "transparent",
                  border: "none",
                  borderRadius: 4,
                  padding: "5px 9px",
                  color: viewMode === "cards" ? "var(--ink-1)" : "var(--ink-3)",
                }}
              >
                <IcoGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => toggleViewMode("list")}
                aria-label="Vista lista"
                className="cursor-pointer inline-flex items-center justify-center"
                style={{
                  background: viewMode === "list" ? "var(--bg-subtle)" : "transparent",
                  border: "none",
                  borderRadius: 4,
                  padding: "5px 9px",
                  color: viewMode === "list" ? "var(--ink-1)" : "var(--ink-3)",
                }}
              >
                <IcoList className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={() => setShowCreateDrawer(true)}
              className="inline-flex items-center gap-1.5 rounded-[8px] cursor-pointer transition-colors"
              style={{
                background: "var(--color-primary)",
                color: "#FFFFFF",
                border: "1px solid var(--color-primary)",
                padding: "7px 12px",
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              <IcoPlus className="h-3.5 w-3.5" />
              Crear Proveedor
            </button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-[18px]" />
            ))}
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center" style={{ padding: "60px 20px", color: "var(--ink-3)" }}>
            <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>🔍</div>
            <div className="text-[14px] font-medium" style={{ color: "var(--ink-2)", marginBottom: 4 }}>
              {favoritesOnly
                ? "Sin proveedores favoritos"
                : hasFilters
                  ? "Sin resultados"
                  : "Sin proveedores"}
            </div>
            <div className="text-[12.5px]">
              {hasFilters
                ? "Prueba ajustando los filtros"
                : "Crea el primer proveedor para empezar"}
            </div>
          </div>
        ) : viewMode === "list" ? (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 30 }}></th>
                <th>Proveedor</th>
                <th>Categoría</th>
                <th>Teléfono</th>
                <th>Ubicación</th>
                <th>Valoración</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => {
                const claim = claimByName.get(p.name.toLowerCase().trim());
                return (
                  <ProviderRow
                    key={p.id}
                    provider={p}
                    onToggleFavorite={() => toggleFavorite(p)}
                    onInvite={() => setInviteTarget(p)}
                    onView={() => setProfileTarget(p)}
                    pendingClaim={claim}
                    onResendClaim={claim ? () => handleResendClaim(claim) : undefined}
                    resendingClaim={claim ? resendingId === claim.id : false}
                  />
                );
              })}
            </tbody>
          </table>
        ) : (
          <div
            className="grid gap-3.5"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}
          >
            {providers.map((p) => {
              const claim = claimByName.get(p.name.toLowerCase().trim());
              return (
                <ProviderCard
                  key={p.id}
                  provider={p}
                  onToggleFavorite={() => toggleFavorite(p)}
                  onInvite={() => setInviteTarget(p)}
                  onView={() => setProfileTarget(p)}
                  pendingClaim={claim}
                  onResendClaim={claim ? () => handleResendClaim(claim) : undefined}
                  resendingClaim={claim ? resendingId === claim.id : false}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div className="flex items-center justify-between mt-1">
          <p className="text-[12px] text-[var(--ink-3)]">
            {Math.min((page - 1) * 50 + 1, total)}–{Math.min(page * 50, total)} de {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center rounded-[8px] cursor-pointer disabled:opacity-50"
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--line-strong)",
                padding: "6px 12px",
                fontSize: 12.5,
                fontWeight: 500,
              }}
            >
              Anterior
            </button>
            <span className="text-[12px] text-[var(--ink-3)]">
              Página {page} de {Math.ceil(total / 50)}
            </span>
            <button
              disabled={page >= Math.ceil(total / 50)}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center rounded-[8px] cursor-pointer disabled:opacity-50"
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--line-strong)",
                padding: "6px 12px",
                fontSize: 12.5,
                fontWeight: 500,
              }}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Invite to Event drawer */}
      <Sheet
        open={!!inviteTarget}
        onOpenChange={(o) => {
          if (!o) {
            setInviteTarget(null);
            setSelectedEventId("");
          }
        }}
      >
        <SheetContent
          side="right"
          className="overflow-hidden bg-white border-0 [&>button]:hidden flex flex-col"
          style={{ width: "min(440px, 100vw)", maxWidth: "100vw", padding: 0, gap: 0 }}
        >
          <div className="flex items-start gap-3 px-6 pt-5 pb-3">
            <div className="flex-1 min-w-0">
              <div
                className="text-[18px] font-semibold text-[var(--ink-1)]"
                style={{ letterSpacing: "-0.01em" }}
              >
                Invitar a evento
              </div>
              <div className="text-[12.5px] text-[var(--ink-3)] mt-0.5">
                Invitar a <strong className="text-[var(--ink-1)]">{inviteTarget?.name}</strong> a un evento
              </div>
            </div>
            <button
              onClick={() => setInviteTarget(null)}
              className="bg-transparent border-none cursor-pointer text-[var(--ink-3)] hover:text-[var(--ink-1)]"
              aria-label="Cerrar"
            >
              <IcoX className="h-[18px] w-[18px]" />
            </button>
          </div>

          <div className="px-6 py-4 flex flex-col gap-3">
            <div className="drawer-form-field flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[var(--ink-2)]">Seleccionar evento</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                <option value="">Elegir evento...</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id.toString()}>
                    {ev.name}
                  </option>
                ))}
              </select>
              {events.length === 0 && (
                <p className="text-[11px] text-[var(--ink-3)]">No hay eventos disponibles</p>
              )}
            </div>
          </div>

          <div
            className="px-6 py-3.5 flex gap-2 mt-auto"
            style={{ borderTop: "1px solid var(--line-1)" }}
          >
            <button
              onClick={() => setInviteTarget(null)}
              className="flex-1 inline-flex items-center justify-center rounded-[8px] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
              style={{
                background: "#FFFFFF",
                color: "var(--ink-1)",
                border: "1px solid var(--line-strong)",
                padding: "11px",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleInviteToEvent}
              disabled={inviting || !selectedEventId}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-[8px] cursor-pointer transition-colors border-none"
              style={{
                background: "var(--color-primary)",
                color: "#FFFFFF",
                padding: "11px",
                fontSize: 13,
                fontWeight: 600,
                opacity: inviting || !selectedEventId ? 0.5 : 1,
              }}
            >
              <IcoSend className="h-3.5 w-3.5" />
              {inviting ? "Invitando..." : "Invitar"}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Provider Drawer */}
      <CreateProviderDrawer
        open={showCreateDrawer}
        onOpenChange={setShowCreateDrawer}
        onCreated={() => {
          setShowCreateDrawer(false);
          fetchProviders();
          fetchPendingClaims();
        }}
      />

      {/* Partner Landing — full-screen profile preview (suppliers.jsx:585).
          Lazy-rendered only when needed so a render bug in the drawer
          can't break the partners page itself. */}
      {profileTarget && (
        <PartnerLandingDrawer
          open={true}
          slug={profileTarget.slug}
          preview={{
            name: profileTarget.name,
            logo: profileTarget.logo,
            coverImage: profileTarget.coverImage,
            providerCategory: profileTarget.providerCategory,
            city: profileTarget.city,
            region: profileTarget.region,
            averageRating: profileTarget.averageRating,
            totalReviews: profileTarget.totalReviews,
            verificationStatus: profileTarget.verificationStatus,
            description: profileTarget.description,
            tagline: profileTarget.tagline,
            phone: profileTarget.phone,
            website: profileTarget.website,
            instagramHandle: profileTarget.instagramHandle,
          }}
          onClose={() => setProfileTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Claim status badge ──────────────────────────────────────────────────────
function ClaimBadge({
  claim,
  onResend,
  resending,
}: {
  claim: PendingClaim;
  onResend: () => void;
  resending: boolean;
}) {
  const isExpired = claim.status === "expired" || new Date() > new Date(claim.expiresAt);
  const isManual = claim.status === "needs_manual_verification";

  if (isExpired) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: "#fef2f2", color: "#991b1b", borderRadius: 6,
          padding: "3px 8px", fontSize: 10.5, fontWeight: 500,
        }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Expirado
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onResend(); }}
          disabled={resending}
          style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            background: "transparent", border: "1px solid #fca5a5",
            borderRadius: 6, padding: "3px 7px", fontSize: 10.5,
            fontWeight: 500, color: "#dc2626", cursor: "pointer",
            opacity: resending ? 0.6 : 1,
          }}
        >
          {resending ? "..." : "Reenviar"}
        </button>
      </div>
    );
  }

  if (isManual) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        background: "#fffbeb", color: "#92400e", borderRadius: 6,
        padding: "3px 8px", fontSize: 10.5, fontWeight: 500,
        border: "1px solid #fde68a",
      }}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.11 19.79 19.79 0 01.13 2.38 2 2 0 012.11.22h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.4a16 16 0 006.69 6.69l1.27-.56a2 2 0 012.11.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
        Verificación manual
      </span>
    );
  }

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: "#fffbeb", color: "#b45309", borderRadius: 6,
      padding: "3px 8px", fontSize: 10.5, fontWeight: 500,
      border: "1px solid #fde68a",
    }}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      Invitación enviada
    </span>
  );
}

// ─── Card View ──────────────────────────────────────────────────────────────
function ProviderCard({
  provider,
  onToggleFavorite,
  onInvite,
  onView,
  pendingClaim,
  onResendClaim,
  resendingClaim,
}: {
  provider: PartnersListing;
  onToggleFavorite: () => void;
  onInvite: () => void;
  onView: () => void;
  pendingClaim?: PendingClaim;
  onResendClaim?: () => void;
  resendingClaim?: boolean;
}) {
  const verified = provider.verificationStatus === "verified";
  const rating = parseFloat(provider.averageRating || "0");
  const reviews = provider.totalReviews || 0;
  const cat = provider.providerCategory || (provider.categories?.[0] ?? "—");
  const cityLabel = [provider.city, provider.region].filter(Boolean).join(", ");
  const desc = provider.description || provider.tagline || "";

  return (
    <div
      style={{
        position: "relative",
        background: "white",
        border: "1px solid var(--line-1)",
        borderRadius: 18,
        padding: "16px 16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 280,
      }}
    >
      {/* Favorite heart — top-right circle button */}
      <button
        onClick={onToggleFavorite}
        aria-label="Favorito"
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          background: "white",
          border: "1px solid var(--line-1)",
          borderRadius: "50%",
          width: 34,
          height: 34,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={provider.isFavorite ? "#C44" : "none"}
          stroke={provider.isFavorite ? "#C44" : "var(--ink-2)"}
          strokeWidth="1.6"
        >
          <path d="M12 21s-8-5-8-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-8 11-8 11z" />
        </svg>
      </button>

      {/* Header: avatar + name + category pill */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", paddingRight: 40 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          {provider.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={provider.logo}
              alt={provider.name}
              width={60}
              height={60}
              className="rounded-full object-cover"
              style={{ width: 60, height: 60 }}
            />
          ) : (
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: avColor(provider.name),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 600,
                fontSize: 22,
              }}
            >
              {provider.name[0]?.toUpperCase()}
            </div>
          )}
          {verified && (
            <div
              style={{
                position: "absolute",
                bottom: -4,
                right: -4,
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#4B7BE8">
                <path d="M12 2l2.5 2.2 3.3-.3.7 3.3 3 1.5-1.2 3.1 1.2 3.1-3 1.5-.7 3.3-3.3-.3L12 22l-2.5-2.2-3.3.3-.7-3.3-3-1.5 1.2-3.1L2.5 9l3-1.5.7-3.3 3.3.3L12 2z" />
                <path d="M8.5 12l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.8" fill="none" />
              </svg>
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
          <div
            style={{
              fontSize: 15.5,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              marginBottom: 6,
              lineHeight: 1.25,
              color: "var(--ink-1)",
            }}
            className="truncate"
          >
            {provider.name}
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "#EDE7DC",
              color: "#5C4A2E",
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: ".03em",
              textTransform: "uppercase",
            }}
          >
            {cat}
          </span>
        </div>
      </div>

      {/* Claim status badge */}
      {pendingClaim && (
        <div style={{ marginTop: -4 }}>
          <ClaimBadge
            claim={pendingClaim}
            onResend={onResendClaim ?? (() => {})}
            resending={resendingClaim ?? false}
          />
        </div>
      )}

      {/* Description (2-line clamp) */}
      <div
        style={{
          fontSize: 12.5,
          color: "var(--ink-3)",
          lineHeight: 1.45,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          minHeight: 36,
        }}
      >
        {desc || "Sin descripción"}
      </div>

      {/* Location chip */}
      {cityLabel && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: "#ECE8DF",
              color: "#5A5345",
              padding: "5px 10px",
              borderRadius: 999,
              fontSize: 11.5,
              fontWeight: 500,
            }}
          >
            <IcoMap className="h-2.5 w-2.5" />
            {cityLabel}
          </span>
        </div>
      )}

      {/* Rating row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {reviews > 0 && rating > 0 ? (
          <>
            <Stars rating={rating} size={14} />
            <span style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 500 }}>
              {rating.toFixed(1)}
            </span>
            <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>· {reviews} reseñas</span>
          </>
        ) : (
          <span style={{ fontSize: 11, color: "var(--ink-4)" }}>Sin reseñas</span>
        )}
      </div>

      {/* Dual CTA */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginTop: "auto",
          marginBottom: 4,
        }}
      >
        <button
          onClick={onView}
          className="inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          style={{
            background: "white",
            color: "var(--ink-1)",
            border: "1px solid var(--line-strong)",
            borderRadius: 10,
            padding: "8px 12px",
            fontSize: 12.5,
            fontWeight: 500,
          }}
        >
          <IcoExternal className="h-3 w-3" />
          Ver Perfil
        </button>
        <button
          onClick={onInvite}
          className="inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          style={{
            background: "var(--color-brand)",
            color: "var(--color-brand-ink)",
            border: "1px solid var(--color-brand)",
            borderRadius: 10,
            padding: "8px 12px",
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          <IcoCalendar className="h-3 w-3" />
          Invitar
        </button>
      </div>
    </div>
  );
}

// ─── List View Row ──────────────────────────────────────────────────────────
function ProviderRow({
  provider,
  onToggleFavorite,
  onInvite,
  onView,
  pendingClaim,
  onResendClaim,
  resendingClaim,
}: {
  provider: PartnersListing;
  onToggleFavorite: () => void;
  onInvite: () => void;
  onView: () => void;
  pendingClaim?: PendingClaim;
  onResendClaim?: () => void;
  resendingClaim?: boolean;
}) {
  const verified = provider.verificationStatus === "verified";
  const rating = parseFloat(provider.averageRating || "0");
  const reviews = provider.totalReviews || 0;
  const cat = provider.providerCategory || (provider.categories?.[0] ?? "—");
  const cityLabel = [provider.city, provider.region].filter(Boolean).join(", ");

  return (
    <tr
      style={{ cursor: "pointer" }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-no-row]")) return;
        onView();
      }}
    >
      <td onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onToggleFavorite}
          data-no-row
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 0 }}
          aria-label="Favorito"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill={provider.isFavorite ? "#C44" : "none"}
            stroke={provider.isFavorite ? "#C44" : "var(--ink-3)"}
            strokeWidth="1.6"
          >
            <path d="M12 21s-8-5-8-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-8 11-8 11z" />
          </svg>
        </button>
      </td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            {provider.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={provider.logo}
                alt={provider.name}
                width={32}
                height={32}
                className="rounded-full object-cover"
                style={{ width: 32, height: 32 }}
              />
            ) : (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: avColor(provider.name),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 600,
                  fontSize: 12,
                }}
              >
                {provider.name[0]?.toUpperCase()}
              </div>
            )}
            {verified && (
              <div
                style={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "#4B7BE8",
                  border: "1.5px solid white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IcoCheck className="h-1.5 w-1.5 text-white" />
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-1)" }}>{provider.name}</div>
            {pendingClaim ? (
              <div style={{ marginTop: 3 }}>
                <ClaimBadge
                  claim={pendingClaim}
                  onResend={onResendClaim ?? (() => {})}
                  resending={resendingClaim ?? false}
                />
              </div>
            ) : provider.tagline ? (
              <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{provider.tagline}</div>
            ) : null}
          </div>
        </div>
      </td>
      <td>
        <span
          style={{
            display: "inline-block",
            background: "var(--bg-subtle)",
            color: "var(--ink-2)",
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          {cat}
        </span>
      </td>
      <td style={{ color: "var(--ink-3)" }}>{provider.phone || "—"}</td>
      <td style={{ color: "var(--ink-3)" }}>{cityLabel || "—"}</td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {reviews > 0 && rating > 0 ? (
            <>
              <Stars rating={rating} />
              <span style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 500 }}>{rating.toFixed(1)}</span>
            </>
          ) : (
            <span style={{ fontSize: 11, color: "var(--ink-4)" }}>Sin reseñas</span>
          )}
        </div>
      </td>
      <td onClick={(e) => e.stopPropagation()}>
        <button
          data-no-row
          onClick={onInvite}
          className="icon-btn cursor-pointer"
          style={{
            background: "transparent",
            border: "none",
            padding: 6,
            borderRadius: 6,
            color: "var(--ink-2)",
          }}
          aria-label="Invitar"
        >
          <IcoChevRight className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ─── Create Provider Drawer ─────────────────────────────────────────────────
// Inline generic email detection (mirrors src/lib/email-utils.ts for client use)
const GENERIC_DOMAINS = new Set([
  "gmail.com","gmail.es","hotmail.com","hotmail.es","hotmail.co.uk",
  "outlook.com","outlook.es","yahoo.com","yahoo.es","yahoo.co.uk","yahoo.fr",
  "live.com","live.es","msn.com","icloud.com","me.com","mac.com",
  "protonmail.com","proton.me","gmx.com","gmx.es","gmx.net",
  "ymail.com","aol.com","mail.com","inbox.com","zohomail.com",
]);
function isGenericDomain(email: string) {
  const d = email.trim().toLowerCase().split("@")[1] ?? "";
  return GENERIC_DOMAINS.has(d);
}

function CreateProviderDrawer({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    category: "",
    instagram: "",
    city: "",
    description: "",
  });

  const cats = PROVIDER_CATEGORIES;

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setFormError("");
    setForm((f) => ({ ...f, [k]: v }));
  };

  const emailValid = /^\S+@\S+\.\S+$/.test(form.email);
  const hasEmail = form.email.trim().length > 0 && emailValid;
  const isGeneric = hasEmail && isGenericDomain(form.email);
  const hasInstagram = form.instagram.trim().length > 0;
  const hasPhone = form.phone.trim().length > 0;

  // Whether extra contact fields are visually required
  const contactRequired = isGeneric || !hasEmail;

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.category) {
      setFormError("Nombre y categoría son requeridos");
      return;
    }
    // Client-side mirror of server validation
    if (!hasEmail && (!hasInstagram || !hasPhone)) {
      setFormError("Sin correo, debes añadir tanto el Instagram como el teléfono del proveedor.");
      return;
    }
    if (isGeneric && !hasInstagram && !hasPhone) {
      setFormError("Correo de uso personal detectado. Añade también el Instagram o el teléfono.");
      return;
    }
    setFormError("");
    setLoading(true);
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.status === 409 && data.error?.code === "DUPLICATE_PROVIDER") {
        const ep = data.error.existingProvider;
        toast.error(
          ep?.name
            ? `Este proveedor ya está en la plataforma: ${ep.name}${ep.city ? ` (${ep.city})` : ""}`
            : "Este proveedor ya existe en la plataforma",
          { duration: 5000 }
        );
        return;
      }
      if (!res.ok) {
        const msg = data.error?.message || "Error al crear";
        setFormError(msg);
        return;
      }
      toast.success(
        data.data?.invitationSent
          ? `${form.name} añadido · proveedor notificado por email`
          : `${form.name} añadido a Contactos · Proveedores`,
      );
      setForm({ name: "", email: "", phone: "", category: "", instagram: "", city: "", description: "" });
      setFormError("");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear el proveedor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="overflow-hidden bg-white border-0 [&>button]:hidden flex flex-col"
        style={{
          width: "min(440px, 100vw)",
          maxWidth: "100vw",
          padding: 0,
          gap: 0,
          borderTopLeftRadius: 16,
          borderBottomLeftRadius: 16,
        }}
      >
        <div className="flex items-start gap-3 px-6 pt-5 pb-3">
          <div className="flex-1 min-w-0">
            <div
              className="text-[17px] font-semibold text-[var(--ink-1)]"
              style={{ letterSpacing: "-0.01em" }}
            >
              Nuevo proveedor
            </div>
            <div className="text-[12px] text-[var(--ink-3)] mt-0.5">
              Añade un proveedor a tu red
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="bg-transparent border-none cursor-pointer text-[var(--ink-3)] hover:text-[var(--ink-1)]"
            aria-label="Cerrar"
          >
            <IcoX className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4 flex flex-col gap-3">
          {/* Avatar uploader placeholder */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--bg-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ink-3)",
              }}
            >
              <IcoCamera className="h-5 w-5" />
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-1)" }}>Foto o logo</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
                PNG, JPG · máx. 2MB
              </div>
            </div>
          </div>

          <div
            className="text-[10.5px] uppercase font-semibold text-[var(--ink-3)] mt-1.5"
            style={{ letterSpacing: "0.08em" }}
          >
            Información general
          </div>

          <div className="drawer-form-field flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-[var(--ink-2)]">Nombre del proveedor *</label>
            <input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Ej. Floristería Jazmín"
            />
          </div>

          <div className="drawer-form-field flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-[var(--ink-2)]">Categoría *</label>
            <select value={form.category} onChange={(e) => update("category", e.target.value)}>
              <option value="">Elige una</option>
              {cats.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="drawer-form-field flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-[var(--ink-2)]">Descripción corta</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Breve descripción del servicio..."
              style={{ resize: "vertical" }}
            />
          </div>

          <div
            className="text-[10.5px] uppercase font-semibold text-[var(--ink-3)] mt-1.5"
            style={{ letterSpacing: "0.08em" }}
          >
            Contacto
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="drawer-form-field flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[var(--ink-2)]">
                Teléfono
                {contactRequired && <span style={{ color: "#f59e0b", marginLeft: 2 }}>*</span>}
              </label>
              <input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+34 ..."
                style={contactRequired && !hasPhone ? { borderColor: "#fbbf24" } : {}}
              />
            </div>
            <div className="drawer-form-field flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[var(--ink-2)]">Email profesional</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="hola@empresa.es"
                style={isGeneric ? { borderColor: "#fbbf24" } : {}}
              />
            </div>
          </div>

          {/* Generic email warning */}
          {isGeneric && (
            <div style={{
              background: "#fffbeb",
              border: "1px solid #fcd34d",
              borderRadius: 7,
              padding: "10px 12px",
              fontSize: 12,
              color: "#92400e",
              lineHeight: 1.5,
              display: "flex",
              gap: 7,
              alignItems: "flex-start",
            }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}>⚠️</span>
              <span>
                <strong>Correo de uso personal detectado.</strong> Con Gmail, Hotmail u otros correos personales no podemos verificar automáticamente. Añade el Instagram o el teléfono del proveedor para continuar.
              </span>
            </div>
          )}

          {/* No email warning */}
          {!hasEmail && form.email.length === 0 && (
            <div style={{
              background: "#f0f9ff",
              border: "1px solid #bae6fd",
              borderRadius: 7,
              padding: "10px 12px",
              fontSize: 12,
              color: "#0c4a6e",
              lineHeight: 1.5,
              display: "flex",
              gap: 7,
              alignItems: "flex-start",
            }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}>ℹ️</span>
              <span>Sin correo, necesitas añadir <strong>Instagram y teléfono</strong> para que Hubents pueda contactar con el proveedor.</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <div className="drawer-form-field flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[var(--ink-2)]">Ciudad</label>
              <input
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder="Ej. Madrid"
              />
            </div>
            <div className="drawer-form-field flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[var(--ink-2)]">
                Instagram
                {contactRequired && <span style={{ color: "#f59e0b", marginLeft: 2 }}>*</span>}
              </label>
              <input
                value={form.instagram}
                onChange={(e) => update("instagram", e.target.value)}
                placeholder="@usuario"
                style={contactRequired && !hasInstagram ? { borderColor: "#fbbf24" } : {}}
              />
            </div>
          </div>

          {formError && (
            <div style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 7,
              padding: "9px 12px",
              fontSize: 12,
              color: "#991b1b",
            }}>
              {formError}
            </div>
          )}
        </div>

        <div
          className="px-6 py-3.5 flex justify-end gap-2"
          style={{ borderTop: "1px solid var(--line-1)" }}
        >
          <button
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center rounded-[8px] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
            style={{
              background: "#FFFFFF",
              color: "var(--ink-1)",
              border: "1px solid var(--line-strong)",
              padding: "10px 14px",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center rounded-[8px] cursor-pointer transition-colors border-none"
            style={{
              background: "var(--color-primary)",
              color: "#FFFFFF",
              padding: "10px 14px",
              fontSize: 13,
              fontWeight: 600,
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "Creando..." : "Crear proveedor"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

