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
  RiStoreLine,
  RiInstagramLine,
  RiPhoneLine,
  RiGlobalLine,
  RiMapPinLine,
  RiArrowLeftLine,
  RiShieldCheckLine,
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <div className="max-w-2xl mx-auto pt-12 space-y-6">
          <Skeleton className="h-32 w-32 rounded-full mx-auto" />
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/isotipo-dark.png" alt="HubEnts" width={28} height={28} />
            <span className="font-bold">hubents</span>
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href="/provider/register">Soy Proveedor</Link>
          </Button>
        </div>
      </div>

      {/* Profile */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          {provider.logo ? (
            <Image
              src={provider.logo}
              alt={provider.name}
              width={120}
              height={120}
              className="rounded-full mx-auto mb-4 border-4 border-white shadow-lg"
            />
          ) : (
            <div className="h-28 w-28 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg">
              <RiStoreLine className="h-12 w-12 text-purple-600" />
            </div>
          )}

          <h1 className="text-3xl font-bold">{provider.name}</h1>

          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant="success" className="gap-1">
              <RiShieldCheckLine className="h-3 w-3" />
              Verificado
            </Badge>
            {provider.providerCategory && (
              <Badge variant="outline">{provider.providerCategory}</Badge>
            )}
          </div>
        </div>

        {/* Contact Info */}
        <Card>
          <CardContent className="p-6 space-y-4">
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

            {provider.serviceRadius && (
              <div className="flex items-center gap-3 text-sm">
                <RiMapPinLine className="h-5 w-5 text-muted-foreground shrink-0" />
                <span>Radio de servicio: {provider.serviceRadius} km</span>
              </div>
            )}

            {provider.serviceAreas && provider.serviceAreas.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Zonas de servicio:</p>
                <div className="flex flex-wrap gap-2">
                  {provider.serviceAreas.map((area) => (
                    <Badge key={area} variant="secondary">{area}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Perfil verificado en HubEnts</p>
        </div>
      </div>
    </div>
  );
}
