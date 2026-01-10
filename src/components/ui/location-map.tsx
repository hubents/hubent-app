"use client";

import { useState, useEffect } from "react";
import { RiMapPinLine, RiExternalLinkLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";

interface LocationMapProps {
  address: string;
  className?: string;
}

interface Coordinates {
  lat: number;
  lon: number;
}

export function LocationMap({ address, className }: LocationMapProps) {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }

    async function geocode() {
      try {
        const encodedAddress = encodeURIComponent(address);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
          {
            headers: {
              "User-Agent": "HubEnts Event Planner",
            },
          }
        );
        const data = await res.json();
        
        if (data && data.length > 0) {
          setCoordinates({
            lat: parseFloat(data[0].lat),
            lon: parseFloat(data[0].lon),
          });
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Geocoding error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    geocode();
  }, [address]);

  const openInMaps = () => {
    if (coordinates) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lon}`,
        "_blank"
      );
    } else {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
        "_blank"
      );
    }
  };

  if (!address) {
    return (
      <div className={`rounded-lg bg-muted flex items-center justify-center ${className}`}>
        <div className="text-center text-muted-foreground">
          <RiMapPinLine className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Sin ubicación definida</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`rounded-lg bg-muted animate-pulse ${className}`} />
    );
  }

  if (error || !coordinates) {
    return (
      <div className={`rounded-lg bg-muted flex flex-col items-center justify-center gap-3 ${className}`}>
        <RiMapPinLine className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center px-4">{address}</p>
        <Button variant="outline" size="sm" onClick={openInMaps} className="gap-2">
          <RiExternalLinkLine className="h-4 w-4" />
          Ver en Google Maps
        </Button>
      </div>
    );
  }

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${coordinates.lon - 0.01},${coordinates.lat - 0.01},${coordinates.lon + 0.01},${coordinates.lat + 0.01}&layer=mapnik&marker=${coordinates.lat},${coordinates.lon}`;

  return (
    <div className={`rounded-lg overflow-hidden relative ${className}`}>
      <iframe
        src={mapUrl}
        className="w-full h-full border-0"
        loading="lazy"
        title="Ubicación del evento"
      />
      <div className="absolute bottom-2 right-2">
        <Button variant="secondary" size="sm" onClick={openInMaps} className="gap-2 shadow-lg">
          <RiExternalLinkLine className="h-4 w-4" />
          Abrir en Maps
        </Button>
      </div>
    </div>
  );
}
