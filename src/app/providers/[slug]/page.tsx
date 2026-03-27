"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiStoreLine,
  RiInstagramLine,
  RiPhoneLine,
  RiGlobalLine,
  RiMapPinLine,
  RiArrowLeftLine,
  RiShieldCheckLine,
  RiMailLine,
  RiTiktokLine,
  RiFacebookCircleLine,
  RiLinkedinBoxLine,
  RiStarFill,
  RiTimeLine,
  RiPriceTag3Line,
} from "@remixicon/react";

interface ProviderProfile {
  name: string;
  slug: string;
  logo: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  instagramHandle: string | null;
  providerCategory: string | null;
  serviceRadius: number | null;
  serviceAreas: string[] | null;
  verificationStatus: string;
  description: string | null;
  tagline: string | null;
  coverImage: string | null;
  publicEmail: string | null;
  tiktokHandle: string | null;
  facebookUrl: string | null;
  linkedinUrl: string | null;
  priceRange: string | null;
  services: string[] | null;
  categories: string[] | null;
  foundedYear: number | null;
  city: string | null;
  region: string | null;
  country: string | null;
  languagesSpoken: string[] | null;
  minBudget: string | null;
  maxBudget: string | null;
  responseTime: string | null;
  totalReviews: number | null;
  averageRating: string | null;
  isFeatured: boolean;
}

interface PortfolioItem {
  id: number;
  url: string;
  title: string | null;
  type: string | null;
}

export default function ProviderPublicProfilePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/providers/${slug}`);
        const data = await res.json();
        if (data.success) {
          setProvider(data.data);
          // Try to load portfolio (public endpoint)
          try {
            const pRes = await fetch(`/api/providers/${slug}/portfolio`);
            const pData = await pRes.json();
            if (pData.success) setPortfolio(pData.data);
          } catch { /* ignore */ }
        } else {
          setNotFound(true);
        }
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <div className="max-w-3xl mx-auto pt-12 space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-32 rounded-full mx-auto -mt-16" />
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (notFound || !provider) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <RiStoreLine className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Proveedor no encontrado</h1>
          <p className="text-muted-foreground mb-4">
            Este perfil no existe o no está disponible.
          </p>
          <Button asChild variant="outline">
            <Link href="/">
              <RiArrowLeftLine className="h-4 w-4 mr-2" />
              Volver al inicio
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  const isVerified = provider.verificationStatus === "verified";
  const location = [provider.city, provider.region, provider.country].filter(Boolean).join(", ");
  const hasSocials = provider.instagramHandle || provider.tiktokHandle || provider.facebookUrl || provider.linkedinUrl;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Top bar */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/isotipo-dark.png" alt="HubEnts" width={28} height={28} />
            <span className="font-bold">hubents</span>
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href="/auth/register?type=provider">Soy Proveedor</Link>
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Cover + Avatar + Name */}
        <div className="relative">
          {provider.coverImage ? (
            <div className="h-48 rounded-xl overflow-hidden">
              <img src={provider.coverImage} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="h-48 rounded-xl bg-gradient-to-r from-purple-400 to-blue-400" />
          )}

          <div className="flex flex-col items-center -mt-16 relative z-[1]">
            {provider.logo ? (
              <Image
                src={provider.logo}
                alt={provider.name}
                width={120}
                height={120}
                className="rounded-full border-4 border-white shadow-lg"
              />
            ) : (
              <div className="h-28 w-28 rounded-full bg-purple-100 flex items-center justify-center border-4 border-white shadow-lg">
                <RiStoreLine className="h-12 w-12 text-purple-600" />
              </div>
            )}

            <h1 className="text-3xl font-bold mt-3">{provider.name}</h1>

            {provider.tagline && (
              <p className="text-muted-foreground text-center mt-1 max-w-lg">{provider.tagline}</p>
            )}

            <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
              {isVerified && (
                <Badge variant="default" className="gap-1">
                  <RiShieldCheckLine className="h-3 w-3" />
                  Verificado
                </Badge>
              )}
              {provider.providerCategory && (
                <Badge variant="outline">{provider.providerCategory}</Badge>
              )}
              {provider.priceRange && (
                <Badge variant="secondary" className="gap-1">
                  <RiPriceTag3Line className="h-3 w-3" />
                  {provider.priceRange}
                </Badge>
              )}
              {location && (
                <Badge variant="secondary" className="gap-1">
                  <RiMapPinLine className="h-3 w-3" />
                  {location}
                </Badge>
              )}
            </div>

            {/* Rating */}
            {(provider.totalReviews || 0) > 0 && (
              <div className="flex items-center gap-1 mt-2 text-sm">
                <RiStarFill className="h-4 w-4 text-yellow-500" />
                <span className="font-semibold">{provider.averageRating}</span>
                <span className="text-muted-foreground">({provider.totalReviews} reseñas)</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {provider.description && (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm leading-relaxed whitespace-pre-line">{provider.description}</p>
              {provider.foundedYear && (
                <p className="text-xs text-muted-foreground mt-3">
                  Establecidos en {provider.foundedYear}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Services */}
        {provider.services && provider.services.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Servicios</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {provider.services.map((s) => (
                  <Badge key={s} variant="secondary">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact & Social */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contacto</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {provider.publicEmail && (
                <a href={`mailto:${provider.publicEmail}`} className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
                  <RiMailLine className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{provider.publicEmail}</span>
                </a>
              )}
              {provider.phone && (
                <a href={`tel:${provider.phone}`} className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
                  <RiPhoneLine className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{provider.phone}</span>
                </a>
              )}
              {provider.website && (
                <a
                  href={provider.website.startsWith("http") ? provider.website : `https://${provider.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                >
                  <RiGlobalLine className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{provider.website}</span>
                </a>
              )}
              {provider.responseTime && (
                <div className="flex items-center gap-3 text-sm">
                  <RiTimeLine className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Responde en {provider.responseTime}</span>
                </div>
              )}
              {provider.serviceRadius && (
                <div className="flex items-center gap-3 text-sm">
                  <RiMapPinLine className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Radio: {provider.serviceRadius} km</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Social */}
          {hasSocials && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Redes Sociales</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {provider.instagramHandle && (
                  <a href={`https://instagram.com/${provider.instagramHandle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
                    <RiInstagramLine className="h-4 w-4 text-pink-500 shrink-0" />
                    <span>@{provider.instagramHandle}</span>
                  </a>
                )}
                {provider.tiktokHandle && (
                  <a href={`https://tiktok.com/@${provider.tiktokHandle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
                    <RiTiktokLine className="h-4 w-4 shrink-0" />
                    <span>@{provider.tiktokHandle}</span>
                  </a>
                )}
                {provider.facebookUrl && (
                  <a href={provider.facebookUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
                    <RiFacebookCircleLine className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>Facebook</span>
                  </a>
                )}
                {provider.linkedinUrl && (
                  <a href={provider.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
                    <RiLinkedinBoxLine className="h-4 w-4 text-blue-700 shrink-0" />
                    <span>LinkedIn</span>
                  </a>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Portfolio */}
        {portfolio.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Portfolio</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {portfolio.map((item) => (
                  <div key={item.id} className="rounded-lg overflow-hidden border aspect-square">
                    <img
                      src={item.url}
                      alt={item.title || "Portfolio"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-4 text-sm text-muted-foreground">
          <p>Perfil en HubEnts &middot; Plataforma de gestión de eventos</p>
        </div>
      </div>
    </div>
  );
}
