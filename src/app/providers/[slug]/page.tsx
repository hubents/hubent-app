"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import {
  RiStoreLine,
  RiInstagramLine,
  RiPhoneLine,
  RiGlobalLine,
  RiMapPinLine,
  RiArrowLeftLine,
  RiShieldCheckLine,
  RiMailLine,
  RiDownloadLine,
  RiShareLine,
  RiArrowRightSLine,
  RiPriceTag3Line,
  RiTimeLine,
  RiErrorWarningLine,
  RiLockLine,
} from "@remixicon/react";
import { InstagramEmbed } from "react-social-media-embed";
import { getOrgTypeLabel } from "@/config/provider-constants";
import { isInstagramPostUrl } from "@/lib/instagram-post-url";

interface Review {
  id: number;
  rating: number;
  title: string | null;
  content: string | null;
  isVerified: boolean;
  createdAt: string;
  reviewerOrgName: string | null;
}

interface ProviderProfile {
  name: string;
  slug: string;
  logo: string | null;
  orgType: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  instagramHandle: string | null;
  providerCategory: string | null;
  serviceRadius: number | null;
  serviceAreas: string[] | null;
  description: string | null;
  tagline: string | null;
  coverImage: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  publicEmail: string | null;
  priceRange: string | null;
  instagramPosts: string[] | null;
  brochureUrl: string | null;
  verificationStatus: "verified" | "unverified" | "rejected";
  claimedAt: string | null;
  pendingClaimToken: string | null;
  portfolio: { id: number; imageUrl: string; caption: string | null }[];
  reviews: {
    items: Review[];
    averageRating: number | null;
    totalReviews: number;
  };
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24">
          <path
            d="M12 2l3 7 7 .5-5.5 4.5 2 7L12 17l-6.5 4 2-7L2 9.5 9 9z"
            fill={i <= Math.round(rating) ? "#F4B942" : "#E8E4DB"}
          />
        </svg>
      ))}
    </span>
  );
}

export default function ProviderPublicProfilePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setLogoLoadError(false); }, [slug, provider?.logo]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/providers/${slug}`);
        const data = await res.json();
        if (data.success) setProvider(data.data);
        else setNotFound(true);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    if (slug) load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "#f9f6f1" }}>
        <div className="max-w-2xl mx-auto pt-12 px-4 space-y-6">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-24 w-24 rounded-full mx-auto -mt-12" />
          <Skeleton className="h-8 w-56 mx-auto" />
          <Skeleton className="h-4 w-40 mx-auto" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (notFound || !provider) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#f9f6f1" }}>
        <div style={{
          background: "white", borderRadius: 20, padding: "48px 32px",
          maxWidth: 400, width: "100%", textAlign: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}>
          <RiStoreLine style={{ width: 48, height: 48, color: "#c5b9a8", margin: "0 auto 16px" }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>Perfil no encontrado</h1>
          <p style={{ fontSize: 14, color: "#6b6b6b", marginBottom: 24 }}>
            Este perfil no existe o ha sido eliminado.
          </p>
          <Link href="/" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#1a1a1a", color: "white", borderRadius: 10,
            padding: "10px 20px", fontSize: 13, fontWeight: 600, textDecoration: "none",
          }}>
            <RiArrowLeftLine style={{ width: 14, height: 14 }} />
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const isVerified = provider.verificationStatus === "verified";
  const location = [provider.city, provider.region].filter(Boolean).join(", ");
  const countryLabel = provider.country
    ? (() => { try { return new Intl.DisplayNames(["es"], { type: "region" }).of(provider.country) ?? provider.country; } catch { return provider.country; } })()
    : null;
  const instagramPosts = (provider.instagramPosts || []).filter(isInstagramPostUrl);
  const claimedDate = provider.claimedAt
    ? new Date(provider.claimedAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen" style={{ background: "#f9f6f1" }}>
      {/* Navbar */}
      <div style={{ background: "white", borderBottom: "1px solid #ece8e0", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <Image src="/images/isotipo-dark.png" alt="Hubents" width={26} height={26} />
            <span style={{ fontWeight: 700, fontSize: 16, color: "#1a1a1a" }}>hubents</span>
          </Link>
          {!isVerified && provider.pendingClaimToken ? (
            <Link
              href={`/claim/${provider.pendingClaimToken}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "#1a1a1a", color: "white", borderRadius: 8,
                padding: "7px 14px", fontSize: 12.5, fontWeight: 600, textDecoration: "none",
              }}
            >
              Reclamar este perfil
            </Link>
          ) : (
            <Link
              href="/auth/register"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "#1a1a1a", color: "white", borderRadius: 8,
                padding: "7px 14px", fontSize: 12.5, fontWeight: 600, textDecoration: "none",
              }}
            >
              Soy proveedor
            </Link>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 60px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Unverified banner — solo aviso discreto */}
        {!isVerified && (
          <div style={{
            display: "flex", gap: 10, alignItems: "center",
            background: "#fffbeb", border: "1px solid #fde68a",
            borderRadius: 10, padding: "10px 14px",
          }}>
            <RiErrorWarningLine style={{ width: 15, height: 15, color: "#b45309", flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: "#92400e", lineHeight: 1.4 }}>
              Este perfil aún no ha sido verificado por el titular.
            </span>
          </div>
        )}

        {/* Hero card */}
        <div style={{ background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          {/* Cover */}
          <div style={{ position: "relative", height: 200 }}>
            {provider.coverImage ? (
              <Image src={provider.coverImage} alt="" fill className="object-cover" />
            ) : (
              <div style={{ height: "100%", background: "linear-gradient(135deg, #e8e0d4 0%, #f0e8d8 100%)" }} />
            )}
            {/* Verification badge — top-right */}
            <div style={{
              position: "absolute", top: 12, right: 12,
              display: "flex", alignItems: "center", gap: 5,
              background: isVerified ? "#1a1a1a" : "rgba(0,0,0,0.45)",
              borderRadius: 999, padding: "5px 10px",
              backdropFilter: "blur(4px)",
            }}>
              {isVerified
                ? <RiShieldCheckLine style={{ width: 13, height: 13, color: "#4ade80" }} />
                : <RiTimeLine style={{ width: 13, height: 13, color: "#fbbf24" }} />
              }
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "white", letterSpacing: "0.02em" }}>
                {isVerified ? "Verificado en Hubents" : "Pendiente de verificar"}
              </span>
            </div>
          </div>

          {/* Logo + name */}
          <div style={{ padding: "0 24px 24px", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginTop: -40, marginBottom: 14 }}>
              <div style={{ position: "relative" }}>
                {provider.logo && !logoLoadError ? (
                  <div style={{
                    width: 80, height: 80, borderRadius: "50%",
                    border: "4px solid white", background: "white",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.12)", overflow: "hidden", position: "relative",
                  }}>
                    <Image src={provider.logo} alt={provider.name} fill sizes="80px" className="object-contain p-1.5" onError={() => setLogoLoadError(true)} />
                  </div>
                ) : (
                  <div style={{
                    width: 80, height: 80, borderRadius: "50%",
                    border: "4px solid white", background: "#f0e8d8",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
                  }}>
                    <RiStoreLine style={{ width: 32, height: 32, color: "#b5a090" }} />
                  </div>
                )}
              </div>
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", marginBottom: 6, letterSpacing: "-0.02em" }}>
              {provider.name}
            </h1>

            {provider.tagline && (
              <p style={{ fontSize: 14, color: "#6b6b6b", marginBottom: 12, lineHeight: 1.5 }}>
                {provider.tagline}
              </p>
            )}

            {/* Chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 16 }}>
              {provider.providerCategory && (
                <span style={{
                  background: "#f0e8d8", color: "#7a5a3a", borderRadius: 999,
                  padding: "4px 12px", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.03em",
                  textTransform: "uppercase",
                }}>
                  {provider.providerCategory}
                </span>
              )}
              {provider.priceRange && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  background: "#f5f5f5", color: "#555", borderRadius: 999,
                  padding: "4px 12px", fontSize: 12, fontWeight: 500,
                }}>
                  <RiPriceTag3Line style={{ width: 12, height: 12 }} />
                  {provider.priceRange}
                </span>
              )}
              {(location || countryLabel) && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  background: "#f5f5f5", color: "#555", borderRadius: 999,
                  padding: "4px 12px", fontSize: 12, fontWeight: 500,
                }}>
                  <RiMapPinLine style={{ width: 12, height: 12 }} />
                  {[location, countryLabel].filter(Boolean).join(", ")}
                </span>
              )}
            </div>

            {/* CTAs */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button
                onClick={handleShare}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: "#f5f3ef", color: "#1a1a1a", border: "none",
                  borderRadius: 8, padding: "8px 14px", fontSize: 12.5,
                  fontWeight: 500, cursor: "pointer",
                }}
              >
                <RiShareLine style={{ width: 14, height: 14 }} />
                {copied ? "¡Copiado!" : "Compartir"}
              </button>
              {provider.brochureUrl && (
                <a
                  href={provider.brochureUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    background: "#1a1a1a", color: "white", borderRadius: 8,
                    padding: "8px 14px", fontSize: 12.5, fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  <RiDownloadLine style={{ width: 14, height: 14 }} />
                  Descargar dossier
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Verification status detail */}
        {isVerified && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "white", borderRadius: 12,
            padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <RiShieldCheckLine style={{ width: 18, height: 18, color: "#16a34a" }} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1a1a1a" }}>
                Proveedor verificado en Hubents
              </div>
              <div style={{ fontSize: 12, color: "#6b6b6b", marginTop: 1 }}>
                {claimedDate
                  ? `Perfil reclamado y verificado el ${claimedDate}`
                  : "Identidad y titularidad del perfil verificadas"}
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        {provider.description && (
          <div style={{ background: "white", borderRadius: 16, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "#3a3a3a", whiteSpace: "pre-line", margin: 0 }}>
              {provider.description}
            </p>
          </div>
        )}

        {/* Contact info — hidden for unverified profiles */}
        {isVerified ? (
          (provider.instagramHandle || provider.publicEmail || provider.phone || provider.website || provider.address) && (
            <div style={{ background: "white", borderRadius: 16, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9a9a9a", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
                Contacto
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {provider.instagramHandle && (
                  <a href={`https://instagram.com/${provider.instagramHandle}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#1a1a1a" }}>
                    <RiInstagramLine style={{ width: 18, height: 18, color: "#e1306c", flexShrink: 0 }} />
                    <span style={{ fontSize: 14 }}>@{provider.instagramHandle}</span>
                  </a>
                )}
                {provider.publicEmail && (
                  <a href={`mailto:${provider.publicEmail}`}
                    style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#1a1a1a" }}>
                    <RiMailLine style={{ width: 18, height: 18, color: "#6b6b6b", flexShrink: 0 }} />
                    <span style={{ fontSize: 14 }}>{provider.publicEmail}</span>
                  </a>
                )}
                {provider.phone && (
                  <a href={`tel:${provider.phone}`}
                    style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#1a1a1a" }}>
                    <RiPhoneLine style={{ width: 18, height: 18, color: "#6b6b6b", flexShrink: 0 }} />
                    <span style={{ fontSize: 14 }}>{provider.phone}</span>
                  </a>
                )}
                {provider.website && (
                  <a href={provider.website.startsWith("http") ? provider.website : `https://${provider.website}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#1a1a1a" }}>
                    <RiGlobalLine style={{ width: 18, height: 18, color: "#6b6b6b", flexShrink: 0 }} />
                    <span style={{ fontSize: 14 }}>{provider.website}</span>
                  </a>
                )}
                {provider.address && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <RiMapPinLine style={{ width: 18, height: 18, color: "#6b6b6b", flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: "#3a3a3a" }}>{provider.address}</span>
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          <div style={{
            display: "flex", gap: 10, alignItems: "center",
            background: "white", borderRadius: 16, padding: "16px 20px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}>
            <RiLockLine style={{ width: 18, height: 18, color: "#c5b9a8", flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#9a9a9a" }}>
              La información de contacto estará disponible una vez el proveedor verifique su perfil.
            </span>
          </div>
        )}

        {/* Portfolio */}
        {provider.portfolio && provider.portfolio.length > 0 && (
          <div style={{ background: "white", borderRadius: 16, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9a9a9a", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
              Portfolio
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {provider.portfolio.map((item) => (
                <div key={item.id} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden" }}>
                  <Image src={item.imageUrl} alt={item.caption || ""} fill className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {provider.reviews.totalReviews > 0 && (
          <div style={{ background: "white", borderRadius: 16, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9a9a9a", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Valoraciones
              </div>
              {provider.reviews.averageRating && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Stars rating={provider.reviews.averageRating} size={13} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>
                    {provider.reviews.averageRating.toFixed(1)}
                  </span>
                  <span style={{ fontSize: 12, color: "#9a9a9a" }}>· {provider.reviews.totalReviews} reseñas</span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {provider.reviews.items.map((r) => (
                <div key={r.id} style={{ borderTop: "1px solid #f0ece6", paddingTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <Stars rating={r.rating} size={12} />
                    {r.reviewerOrgName && (
                      <span style={{ fontSize: 11.5, color: "#9a9a9a" }}>{r.reviewerOrgName}</span>
                    )}
                  </div>
                  {r.title && <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 3 }}>{r.title}</div>}
                  {r.content && <div style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>{r.content}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instagram Posts */}
        {instagramPosts.length > 0 && (
          <div style={{ background: "white", borderRadius: 16, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <RiInstagramLine style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>Instagram</span>
              </div>
              {provider.instagramHandle && (
                <a href={`https://instagram.com/${provider.instagramHandle}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12.5, color: "#6b6b6b", textDecoration: "none" }}>
                  Ver más <RiArrowRightSLine style={{ width: 14, height: 14 }} />
                </a>
              )}
            </div>
            <Carousel opts={{ align: "start", loop: false }} className="w-full">
              <CarouselContent>
                {instagramPosts.map((url, idx) => (
                  <CarouselItem key={idx} className="basis-full">
                    <div className="mx-auto w-full max-w-[540px] rounded-lg">
                      <InstagramEmbed url={url} width="100%" />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {instagramPosts.length > 1 && (
                <>
                  <CarouselPrevious className="-left-4" />
                  <CarouselNext className="-right-4" />
                </>
              )}
            </Carousel>
          </div>
        )}

        {/* Claim / verify card — solo si no está verificado */}
        {!isVerified && (
          <div style={{
            background: "white", borderRadius: 16,
            border: "1px solid #e8e0d4",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            overflow: "hidden",
          }}>
            {/* Franja de acento */}
            <div style={{ height: 4, background: "linear-gradient(90deg, #1a1a1a 0%, #4a4a4a 100%)" }} />
            <div style={{ padding: "20px 22px", display: "flex", gap: 16, alignItems: "flex-start" }}>
              {/* Icono */}
              <div style={{
                width: 42, height: 42, borderRadius: 10,
                background: "#f4f0ea",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <RiStoreLine style={{ width: 22, height: 22, color: "#1a1a1a" }} />
              </div>
              {/* Texto + botones */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>
                  ¿Es tu empresa?
                </div>
                <div style={{ fontSize: 13, color: "#6b6b6b", lineHeight: 1.5, marginBottom: 14 }}>
                  Reclama y verifica este perfil para gestionarlo, añadir fotos, recibir invitaciones a eventos y aparecer como empresa verificada en Hubents.
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link
                    href={
                      provider.pendingClaimToken
                        ? `/claim/${provider.pendingClaimToken}`
                        : `/auth/register?orgType=provider&prefill=${encodeURIComponent(provider.name)}`
                    }
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      background: "#1a1a1a", color: "white",
                      borderRadius: 8, padding: "9px 16px",
                      fontSize: 13, fontWeight: 600, textDecoration: "none",
                    }}
                  >
                    <RiShieldCheckLine style={{ width: 14, height: 14 }} />
                    Verificar mi empresa
                  </Link>
                  <Link
                    href="/auth/login"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      background: "transparent", color: "#1a1a1a",
                      border: "1px solid #d4cfc8",
                      borderRadius: 8, padding: "9px 16px",
                      fontSize: 13, fontWeight: 500, textDecoration: "none",
                    }}
                  >
                    Ya tengo cuenta
                  </Link>
                </div>
              </div>
            </div>
            {/* Pie de la tarjeta */}
            <div style={{
              borderTop: "1px solid #f0ece6",
              padding: "10px 22px",
              background: "#faf8f5",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <RiLockLine style={{ width: 12, height: 12, color: "#a09585" }} />
              <span style={{ fontSize: 11.5, color: "#a09585" }}>
                Solo el titular de la empresa puede gestionar este perfil.
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", paddingTop: 8 }}>
          {isVerified ? (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#9a9a9a" }}>
              <RiShieldCheckLine style={{ width: 13, height: 13, color: "#16a34a" }} />
              Perfil verificado · <Link href="/" style={{ color: "#9a9a9a", fontWeight: 600 }}>Hubents</Link>
            </div>
          ) : (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#b5a090" }}>
              <RiTimeLine style={{ width: 13, height: 13 }} />
              Perfil pendiente de verificación · <Link href="/" style={{ color: "#b5a090", fontWeight: 600 }}>Hubents</Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
