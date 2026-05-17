"use client";

import { useEffect, useState } from "react";
import { avColor } from "@/lib/ui-utils";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  Cancel01Icon,
  ShieldUserIcon,
  CallIcon,
  Mail01Icon,
  ExternalDriveIcon,
  Calendar03Icon,
  Location01Icon,
  InstagramIcon,
  Upload01Icon,
  ArrowRight01Icon,
  StarIcon,
} from "@hugeicons/core-free-icons";

const IcoX = hgIcon(Cancel01Icon);
const IcoShield = hgIcon(ShieldUserIcon);
const IcoPhone = hgIcon(CallIcon);
const IcoMail = hgIcon(Mail01Icon);
const IcoExternal = hgIcon(ExternalDriveIcon);
const IcoCalendar = hgIcon(Calendar03Icon);
const IcoMap = hgIcon(Location01Icon);
const IcoInstagram = hgIcon(InstagramIcon);
const IcoUpload = hgIcon(Upload01Icon);
const IcoChevRight = hgIcon(ArrowRight01Icon);
const IcoStar = hgIcon(StarIcon);


// Cover gradient palette per avatar color — mirrors the prototype's
// `coverPalette` map (suppliers.jsx:593) so the fallback gradient feels
// derived from the partner identity.
const COVER_PALETTE: Record<string, [string, string]> = {
  "#E89C6B": ["#D4A574", "#B8875C"],
  "#B8A078": ["#A89068", "#8A7252"],
  "#6B8CE8": ["#4B6EA8", "#6B88B8"],
  "#A8845C": ["#8B6C48", "#6B5238"],
  "#7FA890": ["#5A8B72", "#3F6E58"],
  "#C97A7A": ["#A55C5C", "#824444"],
  "#9B7EB8": ["#7E5FA0", "#5C4380"],
};

// StarsDisplay — replicates suppliers.jsx:455-478 (half-star gradient).
function StarsDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span style={{ display: "inline-flex", gap: 1, alignItems: "center" }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const filled = i < full;
        const isHalf = i === full && half;
        const gid = `pld-star-${size}-${rating}-${i}`;
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

// PartnerInfoRow — HubSpot-style contact row (suppliers.jsx:480-512).
function PartnerInfoRow({
  icon,
  label,
  value,
  href,
  truncate,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  href?: string;
  truncate?: boolean;
}) {
  if (!value) return null;
  const valueStyle: React.CSSProperties = {
    fontSize: 13.5,
    fontWeight: 500,
    color: "var(--ink-1)",
    lineHeight: 1.35,
    overflow: truncate ? "hidden" : "visible",
    textOverflow: truncate ? "ellipsis" : "clip",
    whiteSpace: truncate ? "nowrap" : "normal",
    textDecoration: "none",
    display: "block",
  };
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "white",
          border: "1px solid var(--line-1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ink-2)",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: ".06em",
            marginBottom: 3,
          }}
        >
          {label}
        </div>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" style={valueStyle}>
            {value}
          </a>
        ) : (
          <div style={valueStyle}>{value}</div>
        )}
      </div>
    </div>
  );
}

interface OrgPortfolioItem {
  id: number;
  organizationId: number;
  url: string;
  thumbnail: string | null;
  title: string | null;
  description: string | null;
  eventType: string | null;
  sortOrder: number | null;
}

interface ReviewItem {
  id: number;
  rating: number;
  title: string | null;
  content: string | null;
  isVerified: boolean | null;
  createdAt: string | null;
  reviewerOrgName: string | null;
}

interface PartnerProfile {
  name: string;
  slug: string;
  logo: string | null;
  coverImage: string | null;
  description: string | null;
  tagline: string | null;
  providerCategory: string | null;
  city: string | null;
  region: string | null;
  phone: string | null;
  publicEmail: string | null;
  website: string | null;
  instagramHandle: string | null;
  instagramPosts: string[] | null;
  brochureUrl: string | null;
  verificationStatus: string | null;
  portfolio: OrgPortfolioItem[];
  reviews: {
    items: ReviewItem[];
    averageRating: number | null;
    totalReviews: number;
  };
}

interface PartnerLandingDrawerProps {
  open: boolean;
  slug: string | null;
  // Fallback partner data passed from the list — used while the full profile
  // is being fetched, so the drawer doesn't show empty state.
  preview?: {
    name: string;
    logo: string | null;
    coverImage: string | null;
    providerCategory: string | null;
    city: string | null;
    region: string | null;
    averageRating: string | null;
    totalReviews: number | null;
    verificationStatus: string | null;
    description?: string | null;
    tagline?: string | null;
    phone?: string | null;
    website?: string | null;
    instagramHandle?: string | null;
  } | null;
  onClose: () => void;
}


// StarPicker — interactive 5-star selector for the review form.
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= (hover || value);
        return (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            <svg width={28} height={28} viewBox="0 0 24 24">
              <path
                d="M12 2l3 7 7 .5-5.5 4.5 2 7L12 17l-6.5 4 2-7L2 9.5 9 9z"
                fill={filled ? "#F4B942" : "#E8E4DB"}
              />
            </svg>
          </button>
        );
      })}
    </span>
  );
}

export function PartnerLandingDrawer({
  open,
  slug,
  preview,
  onClose,
}: PartnerLandingDrawerProps) {
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [writeReviewOpen, setWriteReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewContent, setReviewContent] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    if (!open || !slug) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    // Best-effort enrichment: fetch full profile (publicEmail / instagramPosts
    // / brochureUrl). Wrapped so any 500 from the endpoint is silently
    // ignored — the drawer falls back to `preview` data from the listing.
    fetch(`/api/providers/${slug}`)
      .then(async (r) => {
        if (!r.ok) return null;
        try {
          return await r.json();
        } catch {
          return null;
        }
      })
      .then((d) => {
        if (cancelled || !d) return;
        if (d?.success && d.data) {
          setProfile(d.data as PartnerProfile);
        }
      })
      .catch(() => {
        // Network or parse error — keep preview data.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, slug]);

  // Reset review form whenever drawer opens/closes.
  useEffect(() => {
    if (!open) {
      setWriteReviewOpen(false);
      setReviewRating(0);
      setReviewTitle("");
      setReviewContent("");
      setReviewSuccess(false);
    }
  }, [open]);

  const handleSubmitReview = async () => {
    if (!slug || reviewRating === 0) return;
    setReviewSubmitting(true);
    try {
      const res = await fetch(`/api/providers/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: reviewRating,
          title: reviewTitle || undefined,
          content: reviewContent || undefined,
        }),
      });
      if (res.ok) {
        setReviewSuccess(true);
        // Refetch to get updated reviews list.
        const updated = await fetch(`/api/providers/${slug}`);
        if (updated.ok) {
          const d = await updated.json();
          if (d?.success && d.data) setProfile(d.data as PartnerProfile);
        }
        setTimeout(() => {
          setWriteReviewOpen(false);
          setReviewSuccess(false);
          setReviewRating(0);
          setReviewTitle("");
          setReviewContent("");
        }, 1800);
      }
    } catch {
      // silently fail
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Lock body scroll while overlay is open (matches the prototype's
  // full-screen takeover behavior — there's no scrolling underneath).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  // Merge preview + profile so the layout has data immediately when opened.
  // Reviews and portfolio only come from the full profile fetch.
  const reviewsData = profile?.reviews ?? null;
  const portfolioData: OrgPortfolioItem[] = profile?.portfolio ?? [];
  const ratingNum = reviewsData?.averageRating ?? (preview?.averageRating ? parseFloat(preview.averageRating) : 0);
  const totalReviews = reviewsData?.totalReviews ?? preview?.totalReviews ?? 0;

  const partner = {
    name: profile?.name ?? preview?.name ?? "Partner",
    logo: profile?.logo ?? preview?.logo ?? null,
    coverImage: profile?.coverImage ?? preview?.coverImage ?? null,
    description: profile?.description ?? preview?.description ?? null,
    tagline: profile?.tagline ?? preview?.tagline ?? null,
    providerCategory: profile?.providerCategory ?? preview?.providerCategory ?? null,
    city: profile?.city ?? preview?.city ?? null,
    region: profile?.region ?? preview?.region ?? null,
    phone: profile?.phone ?? preview?.phone ?? null,
    publicEmail: profile?.publicEmail ?? null,
    website: profile?.website ?? preview?.website ?? null,
    instagramHandle: profile?.instagramHandle ?? preview?.instagramHandle ?? null,
    instagramPosts: profile?.instagramPosts ?? null,
    brochureUrl: profile?.brochureUrl ?? null,
    verificationStatus: profile?.verificationStatus ?? preview?.verificationStatus ?? null,
  };

  const verified = partner.verificationStatus === "verified";
  const cityLabel = [partner.city, partner.region].filter(Boolean).join(", ");
  const longDesc = partner.description || partner.tagline || "";
  const color = avColor(partner.name);
  const [c1, c2] = COVER_PALETTE[color] || ["#8B7252", "#6B5238"];
  // Defensive: instagramPosts is declared as string[] but JSON columns can
  // round-trip as a string from some clients. Coerce to a real array.
  const gallery: string[] = Array.isArray(partner.instagramPosts)
    ? partner.instagramPosts
    : typeof partner.instagramPosts === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(partner.instagramPosts as unknown as string);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#F0EEE8",
        zIndex: 100,
        overflowY: "auto",
      }}
    >
      {/* Top nav — simulating external browser page */}
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "24px 20px 10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/isotipo-dark.png"
            alt=""
            width={22}
            height={22}
            style={{ width: 22, height: 22, objectFit: "contain" }}
          />
          <span style={{ fontSize: 17, fontWeight: 600, color: "var(--ink-1)" }}>hubents</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            title="Reclama este perfil si es tu negocio"
            style={{
              background: "white",
              border: "1px solid var(--line-strong)",
              borderRadius: 999,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--ink-1)",
            }}
          >
            <IcoShield className="h-3 w-3" />
            Reclamar perfil
          </button>
          <button
            onClick={onClose}
            style={{
              background: "white",
              border: "1px solid var(--line-strong)",
              borderRadius: 999,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--ink-1)",
            }}
          >
            <IcoX className="h-3 w-3" />
            Cerrar vista previa
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto 60px", padding: "20px" }}>
        {/* Single consolidated card */}
        <div
          style={{
            background: "white",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            border: "1px solid var(--line-1)",
          }}
        >
          {/* Cover — real event photo or gradient fallback */}
          <div
            style={{
              height: 240,
              position: "relative",
              background: `linear-gradient(135deg, ${c1}, ${c2})`,
              overflow: "hidden",
            }}
          >
            {partner.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={partner.coverImage}
                alt=""
                loading="lazy"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            )}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.18) 100%)",
                pointerEvents: "none",
              }}
            />
          </div>

          {/* Avatar overlapping cover */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: -44,
              marginBottom: 14,
            }}
          >
            <div style={{ position: "relative" }}>
              {partner.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={partner.logo}
                  alt={partner.name}
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: "50%",
                    border: "5px solid white",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: "50%",
                    background: color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: 600,
                    fontSize: 30,
                    border: "5px solid white",
                  }}
                >
                  {partner.name[0]?.toUpperCase()}
                </div>
              )}
              {verified && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 4,
                    right: 4,
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "#4B7BE8",
                    border: "3px solid white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12l5 5 9-9"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Name + pills + desc + CTAs + rating */}
          <div style={{ padding: "0 40px 22px", textAlign: "center" }}>
            <div
              style={{
                fontSize: 26,
                fontWeight: 600,
                marginBottom: 10,
                letterSpacing: "-0.01em",
                color: "var(--ink-1)",
              }}
            >
              {partner.name}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 6,
                marginBottom: 14,
                flexWrap: "wrap",
              }}
            >
              {partner.providerCategory && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#ECE8DF",
                    color: "#5A5345",
                    padding: "5px 11px",
                    borderRadius: 999,
                    fontSize: 11.5,
                    fontWeight: 500,
                  }}
                >
                  <IcoCalendar className="h-2.5 w-2.5" />
                  {partner.providerCategory}
                </span>
              )}
              {cityLabel && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#F0EEE8",
                    color: "#6B6557",
                    padding: "5px 11px",
                    borderRadius: 999,
                    fontSize: 11.5,
                    fontWeight: 500,
                  }}
                >
                  <IcoMap className="h-2.5 w-2.5" />
                  {cityLabel}
                </span>
              )}
            </div>
            {longDesc && (
              <div
                style={{
                  fontSize: 14,
                  color: "var(--ink-3)",
                  lineHeight: 1.5,
                  maxWidth: 520,
                  margin: "0 auto 18px",
                }}
              >
                {longDesc}
              </div>
            )}

            {/* CTAs */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <button
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.share) {
                    navigator.share({
                      title: partner.name,
                      url: window.location.href,
                    }).catch(() => {});
                  } else if (typeof navigator !== "undefined") {
                    navigator.clipboard?.writeText(window.location.href).catch(() => {});
                  }
                }}
                style={{
                  background: "white",
                  border: "1px solid var(--line-strong)",
                  padding: "9px 18px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <IcoUpload className="h-3 w-3" />
                Compartir
              </button>
              <a
                href={partner.brochureUrl || "#"}
                target={partner.brochureUrl ? "_blank" : undefined}
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (!partner.brochureUrl) e.preventDefault();
                }}
                style={{
                  background: "var(--color-brand)",
                  color: "var(--color-brand-ink)",
                  border: "1px solid var(--color-brand)",
                  padding: "9px 18px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: partner.brochureUrl ? "pointer" : "not-allowed",
                  textDecoration: "none",
                  opacity: partner.brochureUrl ? 1 : 0.6,
                }}
              >
                Descargar PDF
              </a>
            </div>

            {/* Rating */}
            {totalReviews > 0 && ratingNum > 0 ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <StarsDisplay rating={ratingNum} size={18} />
                <span
                  style={{
                    fontSize: 14,
                    color: "var(--ink-2)",
                    fontWeight: 600,
                  }}
                >
                  {ratingNum.toFixed(1)}
                </span>
                <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
                  · {totalReviews} reseñas
                </span>
              </div>
            ) : null}
          </div>

          {/* Datos del partner — contacto (estilo HubSpot) */}
          {(partner.phone || partner.publicEmail || partner.website) && (
            <div
              style={{
                padding: "18px 28px",
                borderTop: "1px solid var(--line-1)",
                background: "#FBFAF7",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--ink-3)",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  marginBottom: 12,
                }}
              >
                Información de contacto
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "14px 24px",
                }}
              >
                <PartnerInfoRow
                  icon={<IcoPhone className="h-3.5 w-3.5" />}
                  label="Teléfono"
                  value={partner.phone}
                  href={partner.phone ? `tel:${partner.phone.replace(/\s/g, "")}` : undefined}
                />
                <PartnerInfoRow
                  icon={<IcoMail className="h-3.5 w-3.5" />}
                  label="Email"
                  value={partner.publicEmail}
                  href={partner.publicEmail ? `mailto:${partner.publicEmail}` : undefined}
                  truncate
                />
                <PartnerInfoRow
                  icon={<IcoExternal className="h-3.5 w-3.5" />}
                  label="Sitio web"
                  value={partner.website}
                  href={partner.website || undefined}
                  truncate
                />
              </div>
            </div>
          )}

          {/* Portfolio — Trabajos destacados (solo si hay items) */}
          {portfolioData.length > 0 && (
            <div style={{ padding: "18px 28px", borderTop: "1px solid var(--line-1)" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Trabajos destacados</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 10,
                }}
              >
                {portfolioData.slice(0, 6).map((item) => (
                  <div key={item.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div
                      style={{
                        aspectRatio: "1",
                        borderRadius: "var(--r-sm)",
                        overflow: "hidden",
                        background: "#ECE8DF",
                        cursor: "pointer",
                      }}
                      onClick={() => setLightboxSrc(item.url)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.thumbnail ?? item.url}
                        alt={item.title ?? ""}
                        loading="lazy"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    </div>
                    {item.title && (
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "var(--ink-3)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={item.title}
                      >
                        {item.title}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lightbox */}
          {lightboxSrc && (
            <div
              onClick={() => setLightboxSrc(null)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 200,
                background: "rgba(0,0,0,0.85)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxSrc}
                alt=""
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxWidth: "90vw",
                  maxHeight: "90vh",
                  objectFit: "contain",
                  borderRadius: "var(--r-md)",
                  display: "block",
                }}
              />
              <button
                onClick={() => setLightboxSrc(null)}
                aria-label="Cerrar"
                style={{
                  position: "absolute",
                  top: 20,
                  right: 20,
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: "50%",
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "white",
                }}
              >
                <IcoX className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Write-review modal */}
          {writeReviewOpen && (
            <div
              onClick={() => setWriteReviewOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 300,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "white",
                  borderRadius: 16,
                  padding: 28,
                  width: "100%",
                  maxWidth: 460,
                  boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
                }}
              >
                {reviewSuccess ? (
                  <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: "50%",
                      background: "#D9ECD1", color: "#1F6A3A",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: "0 auto 12px",
                    }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12l5 5 9-9" stroke="currentColor" strokeWidth="2.5"
                          strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>¡Reseña enviada!</div>
                    <div style={{ fontSize: 13, color: "var(--ink-3)" }}>Gracias por tu valoración.</div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>Escribir una reseña</div>
                        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{partner.name}</div>
                      </div>
                      <button
                        onClick={() => setWriteReviewOpen(false)}
                        style={{
                          background: "var(--bg-subtle)", border: "none",
                          borderRadius: "50%", width: 30, height: 30,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", color: "var(--ink-2)",
                        }}
                      >
                        <IcoX className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Stars */}
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-3)", marginBottom: 8 }}>
                        Valoración <span style={{ color: "#E53" }}>*</span>
                      </div>
                      <StarPicker value={reviewRating} onChange={setReviewRating} />
                      {reviewRating > 0 && (
                        <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 5 }}>
                          {["", "Muy mala", "Mala", "Regular", "Buena", "Excelente"][reviewRating]}
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-3)", marginBottom: 6 }}>
                        Título (opcional)
                      </div>
                      <input
                        value={reviewTitle}
                        onChange={(e) => setReviewTitle(e.target.value)}
                        placeholder="Resume tu experiencia..."
                        maxLength={80}
                        style={{
                          width: "100%",
                          border: "1px solid var(--line-1)",
                          borderRadius: 8,
                          padding: "8px 11px",
                          fontSize: 13.5,
                          outline: "none",
                          boxSizing: "border-box",
                          color: "var(--ink-1)",
                        }}
                      />
                    </div>

                    {/* Content */}
                    <div style={{ marginBottom: 22 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-3)", marginBottom: 6 }}>
                        Comentario (opcional)
                      </div>
                      <textarea
                        value={reviewContent}
                        onChange={(e) => setReviewContent(e.target.value)}
                        placeholder="¿Cómo fue tu experiencia trabajando con este proveedor?"
                        rows={4}
                        maxLength={600}
                        style={{
                          width: "100%",
                          border: "1px solid var(--line-1)",
                          borderRadius: 8,
                          padding: "8px 11px",
                          fontSize: 13.5,
                          outline: "none",
                          resize: "vertical",
                          boxSizing: "border-box",
                          fontFamily: "inherit",
                          color: "var(--ink-1)",
                          lineHeight: 1.5,
                        }}
                      />
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      <button
                        onClick={() => setWriteReviewOpen(false)}
                        style={{
                          background: "white",
                          border: "1px solid var(--line-strong)",
                          borderRadius: 8,
                          padding: "8px 16px",
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: "pointer",
                          color: "var(--ink-1)",
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSubmitReview}
                        disabled={reviewRating === 0 || reviewSubmitting}
                        style={{
                          background: reviewRating === 0 ? "var(--ink-4)" : "var(--ink-1)",
                          color: "white",
                          border: "none",
                          borderRadius: 8,
                          padding: "8px 20px",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: reviewRating === 0 ? "not-allowed" : "pointer",
                          opacity: reviewRating === 0 || reviewSubmitting ? 0.55 : 1,
                        }}
                      >
                        {reviewSubmitting ? "Enviando..." : "Publicar reseña"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Instagram dentro de la misma tarjeta */}
          <div style={{ padding: "18px 28px", borderTop: "1px solid var(--line-1)" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <IcoInstagram className="h-4 w-4" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Instagram</span>
                {partner.instagramHandle && (
                  <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                    @{partner.instagramHandle}
                  </span>
                )}
              </div>
              {partner.instagramHandle && (
                <a
                  href={`https://instagram.com/${partner.instagramHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginLeft: "auto",
                    background: "none",
                    border: "none",
                    fontSize: 12.5,
                    color: "var(--ink-2)",
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 2,
                    textDecoration: "none",
                  }}
                >
                  Ver más <IcoChevRight className="h-3 w-3" />
                </a>
              )}
            </div>
            {gallery.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                }}
              >
                {gallery.slice(0, 6).map((src, idx) => (
                  <div
                    key={idx}
                    style={{
                      aspectRatio: "4/5",
                      borderRadius: 10,
                      overflow: "hidden",
                      background: "#ECE8DF",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "30px 20px",
                  color: "var(--ink-3)",
                  fontSize: 12.5,
                  background: "#FBFAF7",
                  borderRadius: 10,
                }}
              >
                Sin publicaciones todavía
              </div>
            )}
          </div>

          {/* Reseñas dentro de la misma tarjeta */}
          <div
            style={{
              padding: "18px 28px 24px",
              borderTop: "1px solid var(--line-1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <IcoStar className="h-3.5 w-3.5" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Reseñas</span>
              </div>
              <button
                onClick={() => setWriteReviewOpen(true)}
                style={{
                  marginLeft: "auto",
                  background: "var(--ink-1)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 13px",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <IcoStar className="h-3 w-3" />
                Escribir reseña
              </button>
              {totalReviews > 0 && ratingNum > 0 && (
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: "var(--ink-1)", lineHeight: 1 }}>
                    {ratingNum.toFixed(1)}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <StarsDisplay rating={ratingNum} size={13} />
                    <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                      {totalReviews} {totalReviews === 1 ? "reseña" : "reseñas"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {totalReviews === 0 || !reviewsData ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "30px 20px",
                  color: "var(--ink-3)",
                  fontSize: 12.5,
                  background: "#FBFAF7",
                  borderRadius: 10,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <path
                    d="M12 2l3 7 7 .5-5.5 4.5 2 7L12 17l-6.5 4 2-7L2 9.5 9 9z"
                    fill="#E8E4DB"
                  />
                </svg>
                <span>Aún sin reseñas</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {reviewsData.items.slice(0, 3).map((rv) => {
                  const dateStr = rv.createdAt
                    ? new Date(rv.createdAt).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : null;
                  return (
                    <div
                      key={rv.id}
                      style={{
                        border: "1px solid var(--line-1)",
                        borderRadius: 10,
                        padding: 16,
                        background: "white",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                        <div>
                          <StarsDisplay rating={rv.rating} size={13} />
                          {rv.title && (
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-1)", marginTop: 4 }}>
                              {rv.title}
                            </div>
                          )}
                        </div>
                        {rv.isVerified && (
                          <span
                            style={{
                              background: "#D9ECD1",
                              color: "#1F6A3A",
                              fontSize: 10.5,
                              padding: "2px 7px",
                              borderRadius: 999,
                              fontWeight: 500,
                              flexShrink: 0,
                              marginLeft: 8,
                            }}
                          >
                            ✓ Verificado
                          </span>
                        )}
                      </div>
                      {rv.content && (
                        <div
                          style={{
                            fontSize: 13,
                            color: "var(--ink-2)",
                            lineHeight: 1.5,
                            marginBottom: 10,
                          }}
                        >
                          {rv.content}
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-2)" }}>
                          {rv.reviewerOrgName ?? "Cliente verificado"}
                        </span>
                        {dateStr && (
                          <span style={{ fontSize: 11.5, color: "var(--ink-4)" }}>{dateStr}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            marginTop: 30,
            fontSize: 12,
            color: "var(--ink-3)",
          }}
        >
          Potenciado por{" "}
          <strong style={{ color: "var(--ink-1)" }}>hubents</strong> · Crea tu propio
          perfil de partner
        </div>

        {loading && !profile && (
          <div
            style={{
              textAlign: "center",
              marginTop: 12,
              fontSize: 12,
              color: "var(--ink-4)",
            }}
          >
            Cargando perfil...
          </div>
        )}
      </div>
    </div>
  );
}
