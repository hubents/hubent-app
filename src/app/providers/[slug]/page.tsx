"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "@remixicon/react";
import { InstagramEmbed } from "react-social-media-embed";
import { getOrgTypeLabel } from "@/config/provider-constants";
import { isInstagramPostUrl } from "@/lib/instagram-post-url";

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
}

export default function ProviderPublicProfilePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/providers/${slug}`);
        const data = await res.json();
        if (data.success) {
          setProvider(data.data);
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
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-orange-50/30">
        <div className="max-w-2xl mx-auto pt-12 px-4 space-y-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-24 w-24 rounded-full mx-auto -mt-16" />
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (notFound || !provider) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-orange-50/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <RiStoreLine className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Perfil no encontrado</h1>
          <p className="text-muted-foreground mb-4">
            Este perfil no existe o aún no ha sido verificado.
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

  const location = [provider.city, provider.region, provider.country].filter(Boolean).join(", ");
  const instagramPosts = (provider.instagramPosts || []).filter((url) => isInstagramPostUrl(url));
  const hasInstagramPosts = instagramPosts.length > 0;
  const hasContactInfo = provider.instagramHandle || provider.publicEmail || provider.phone || provider.website || provider.address;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-orange-50/30">
      {/* Navbar */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/isotipo-dark.png" alt="HubEnts" width={28} height={28} />
            <span className="font-bold text-lg">hubents</span>
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href="/auth/register">Soy Proveedor</Link>
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Hero Card */}
        <Card className="overflow-hidden">
          <div className="relative">
            {/* Cover Image */}
            {provider.coverImage ? (
              <div className="relative h-48 w-full">
                <Image
                  src={provider.coverImage}
                  alt=""
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="h-48 w-full bg-gradient-to-r from-stone-200 to-orange-100" />
            )}

            {/* Logo */}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
              {provider.logo ? (
                <div className="relative">
                  <Image
                    src={provider.logo}
                    alt={provider.name}
                    width={96}
                    height={96}
                    className="rounded-full border-4 border-white shadow-lg object-cover"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1 border-2 border-white">
                    <RiShieldCheckLine className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-orange-100 flex items-center justify-center border-4 border-white shadow-lg">
                    <RiStoreLine className="h-10 w-10 text-orange-600" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1 border-2 border-white">
                    <RiShieldCheckLine className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <CardContent className="pt-16 pb-6 text-center space-y-3">
            <h1 className="text-2xl font-bold">{provider.name}</h1>

            {provider.tagline && (
              <p className="text-muted-foreground text-sm max-w-md mx-auto">{provider.tagline}</p>
            )}

            {/* Badges */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Badge variant={provider.orgType === "provider" ? "default" : "secondary"}>
                {getOrgTypeLabel(provider.orgType)}
              </Badge>
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

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                }}
              >
                <RiShareLine className="h-4 w-4 mr-1" />
                Compartir
              </Button>
              {provider.brochureUrl && (
                <Button size="sm" asChild>
                  <a href={provider.brochureUrl} download target="_blank" rel="noopener noreferrer">
                    <RiDownloadLine className="h-4 w-4 mr-1" />
                    Descargar PDF
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        {provider.description && (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm leading-relaxed whitespace-pre-line">{provider.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Contact Info */}
        {hasContactInfo && <Card>
          <CardContent className="p-6 space-y-3">
            {provider.instagramHandle && (
              <a
                href={`https://instagram.com/${provider.instagramHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
              >
                <RiInstagramLine className="h-5 w-5 text-pink-500 shrink-0" />
                <span>@{provider.instagramHandle}</span>
              </a>
            )}

            {provider.publicEmail && (
              <a
                href={`mailto:${provider.publicEmail}`}
                className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
              >
                <RiMailLine className="h-5 w-5 text-muted-foreground shrink-0" />
                <span>{provider.publicEmail}</span>
              </a>
            )}

            {provider.phone && (
              <a
                href={`tel:${provider.phone}`}
                className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
              >
                <RiPhoneLine className="h-5 w-5 text-muted-foreground shrink-0" />
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
                <RiGlobalLine className="h-5 w-5 text-muted-foreground shrink-0" />
                <span>{provider.website}</span>
              </a>
            )}

            {provider.address && (
              <div className="flex items-center gap-3 text-sm">
                <RiMapPinLine className="h-5 w-5 text-muted-foreground shrink-0" />
                <span>{provider.address}</span>
              </div>
            )}
          </CardContent>
        </Card>}

        {/* Instagram Posts */}
        {hasInstagramPosts && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <RiInstagramLine className="h-5 w-5" />
                  <span className="font-semibold">Instagram</span>
                </div>
                {provider.instagramHandle && (
                  <a
                    href={`https://instagram.com/${provider.instagramHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    Ver más
                    <RiArrowRightSLine className="h-4 w-4" />
                  </a>
                )}
              </div>

              <Carousel opts={{ align: "start", loop: false }} className="w-full">
                <CarouselContent className="-ml-3">
                  {instagramPosts.map((url, idx) => (
                    <CarouselItem key={idx} className="pl-3 basis-full sm:basis-1/2 lg:basis-1/3">
                      <div className="overflow-hidden rounded-lg">
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
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-4 text-sm text-muted-foreground">
          <p>Perfil verificado en <span className="font-medium">HubEnts</span></p>
        </div>
      </div>
    </div>
  );
}
