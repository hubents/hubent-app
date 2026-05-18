"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Map, Circle, Marker } from "leaflet";

interface MapWithCircleProps {
  lat: number;
  lon: number;
  radiusKm: number;
  sinLimit: boolean;
}

function getZoom(radiusKm: number): number {
  if (radiusKm >= 400) return 5;
  if (radiusKm >= 200) return 6;
  if (radiusKm >= 100) return 7;
  if (radiusKm >= 50) return 8;
  if (radiusKm >= 20) return 10;
  return 11;
}

export function MapWithCircle({ lat, lon, radiusKm, sinLimit }: MapWithCircleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const circleRef = useRef<Circle | null>(null);
  const markerRef = useRef<Marker | null>(null);
  // Store L so the radius-update effect can access it without re-importing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef = useRef<any>(null);

  // Re-initialize map when location changes
  useEffect(() => {
    if (!containerRef.current) return;

    import("leaflet").then((mod) => {
      const L = mod.default;
      LRef.current = L;

      if (!containerRef.current) return;

      // Destroy previous instance (handles location changes + React strict mode)
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        circleRef.current = null;
        markerRef.current = null;
      }

      const zoom = sinLimit ? 5 : getZoom(radiusKm);
      const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false })
        .setView([lat, lon], zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

      // Custom pin marker
      const pinIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#111;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.45)"></div>`,
        className: "",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      markerRef.current = L.marker([lat, lon], { icon: pinIcon }).addTo(map);

      // Draw circle if not sin límite
      if (!sinLimit) {
        circleRef.current = L.circle([lat, lon], {
          radius: radiusKm * 1000,
          color: "#111111",
          fillColor: "#111111",
          fillOpacity: 0.12,
          weight: 1.5,
        }).addTo(map);
      }

      mapRef.current = map;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      circleRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon]); // Only re-init on location change

  // Update circle and zoom when radius changes (no map re-init)
  useEffect(() => {
    if (!mapRef.current || !LRef.current) return;
    const L = LRef.current;

    mapRef.current.setZoom(sinLimit ? 5 : getZoom(radiusKm), { animate: true });

    if (!sinLimit) {
      if (circleRef.current) {
        circleRef.current.setRadius(radiusKm * 1000);
      } else {
        circleRef.current = L.circle([lat, lon], {
          radius: radiusKm * 1000,
          color: "#111111",
          fillColor: "#111111",
          fillOpacity: 0.12,
          weight: 1.5,
        }).addTo(mapRef.current);
      }
    } else {
      circleRef.current?.remove();
      circleRef.current = null;
    }
  }, [radiusKm, sinLimit, lat, lon]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: 0 }}
    />
  );
}
