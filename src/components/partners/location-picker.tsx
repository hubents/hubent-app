"use client";

import { useState, useEffect, useRef, Suspense, lazy } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const MapWithCircle = lazy(() =>
  import("./map-with-circle").then((m) => ({ default: m.MapWithCircle }))
);
import { hgIcon } from "@/components/ui/hg-icon";
import {
  ArrowLeft01Icon,
  Search01Icon,
  Location01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";

const IcoBack = hgIcon(ArrowLeft01Icon);
const IcoSearch = hgIcon(Search01Icon);
const IcoPin = hgIcon(Location01Icon);
const IcoX = hgIcon(Cancel01Icon);

export interface LocationFilter {
  label: string;
  city: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  radius: number; // km; 500 = sin límite
}

interface LocationResult {
  displayName: string;
  city: string;
  region: string;
  countryCode: string;
  countryName: string;
  lat: number;
  lon: number;
}

interface LocationPickerProps {
  open: boolean;
  onClose: () => void;
  value: LocationFilter | null;
  onApply: (loc: LocationFilter | null) => void;
}

const RADIUS_MAX = 500;

export function LocationPicker({ open, onClose, value, onApply }: LocationPickerProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [selected, setSelected] = useState<LocationResult | null>(null);
  const [radius, setRadius] = useState(50);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (value) {
        setQuery(value.label);
        setSelected({
          displayName: value.label,
          city: value.city,
          region: value.region,
          countryCode: value.country,
          countryName: "",
          lat: value.lat,
          lon: value.lon,
        });
        setRadius(value.radius);
      } else {
        setQuery("");
        setSelected(null);
        setRadius(50);
      }
      setSuggestions([]);
    }
  }, [open, value]);

  useEffect(() => {
    if (query.length < 2 || selected) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/address-lookup?q=${encodeURIComponent(query)}&mode=location`
        );
        const data = await res.json();
        setSuggestions(data);
      } catch {
        // silencioso
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, selected]);

  const handleSelect = (result: LocationResult) => {
    setSelected(result);
    setQuery(result.city ? `${result.city}, ${result.countryCode}` : result.displayName);
    setSuggestions([]);
  };

  const handleClear = () => {
    setQuery("");
    setSelected(null);
    setSuggestions([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleApply = () => {
    if (!selected) {
      onApply(null);
    } else {
      onApply({
        label: selected.city || selected.displayName,
        city: selected.city,
        region: selected.region,
        country: selected.countryCode,
        lat: selected.lat,
        lon: selected.lon,
        radius,
      });
    }
    onClose();
  };

  const radiusLabel = radius >= RADIUS_MAX ? "Sin límite" : `${radius} km`;
  const radiusPct = Math.round(((radius - 10) / (RADIUS_MAX - 10)) * 100);

  const showSuggestions = suggestions.length > 0 && !selected;
  const showMap = !!selected && !showSuggestions;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        style={{
          width: "min(420px, 100vw)",
          maxWidth: "100vw",
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 0,
          overflow: "hidden",
        }}
      >
        <SheetTitle style={{ display: "none" }}>Ubicación</SheetTitle>

        {/* Header */}
        <div
          style={{
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderBottom: "1px solid var(--line-1)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--ink-1)",
              borderRadius: 6,
            }}
          >
            <IcoBack className="h-5 w-5" />
          </button>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-1)" }}>
            Ubicación
          </span>
        </div>

        {/* Search input */}
        <div style={{ padding: "14px 16px 0", flexShrink: 0 }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <IcoSearch
              className="h-4 w-4"
              style={{
                position: "absolute",
                left: 14,
                color: "var(--ink-3)",
                pointerEvents: "none",
              }}
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (selected) setSelected(null);
              }}
              placeholder="¿Dónde?"
              style={{
                width: "100%",
                padding: "10px 40px 10px 40px",
                borderRadius: 24,
                border: "1.5px solid var(--line-1)",
                background: "#F7F7F7",
                fontSize: 14,
                outline: "none",
                color: "var(--ink-1)",
              }}
            />
            {query && (
              <button
                onClick={handleClear}
                style={{
                  position: "absolute",
                  right: 10,
                  padding: 6,
                  background: "#E0E0E0",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  color: "var(--ink-2)",
                  borderRadius: "50%",
                }}
              >
                <IcoX className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Suggestions list */}
        {showSuggestions && (
          <div
            style={{
              margin: "10px 16px 0",
              borderRadius: 10,
              border: "1px solid var(--line-1)",
              background: "white",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSelect(s)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "11px 14px",
                  background: "transparent",
                  border: "none",
                  borderBottom:
                    i < suggestions.length - 1 ? "1px solid var(--line-1)" : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 13.5,
                  color: "var(--ink-1)",
                }}
              >
                <IcoPin
                  className="h-4 w-4"
                  style={{ color: "var(--ink-3)", flexShrink: 0 }}
                />
                <span>
                  {s.city ? `${s.city}` : s.displayName}
                  {s.region && (
                    <span style={{ color: "var(--ink-3)", marginLeft: 4, fontSize: 12 }}>
                      {s.region}
                    </span>
                  )}
                  {s.countryCode && (
                    <span style={{ color: "var(--ink-3)", marginLeft: 4, fontSize: 12 }}>
                      · {s.countryCode}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Map with radius circle */}
        {showMap && selected && (
          <div style={{ flex: 1, minHeight: 0, marginTop: 12 }}>
            <Suspense fallback={<div style={{ width: "100%", height: "100%", background: "#F0F0F0" }} />}>
              <MapWithCircle
                lat={selected.lat}
                lon={selected.lon}
                radiusKm={radius}
                sinLimit={radius >= RADIUS_MAX}
              />
            </Suspense>
          </div>
        )}

        {/* Empty space when no map */}
        {!showMap && !showSuggestions && <div style={{ flex: 1 }} />}

        {/* Radius slider */}
        <div style={{ padding: "16px 20px 8px", flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 500 }}>
              Rango de búsqueda
            </span>
            <span style={{ fontSize: 13, color: "var(--ink-3)" }}>{radiusLabel}</span>
          </div>
          <div style={{ position: "relative", height: 28, display: "flex", alignItems: "center" }}>
            {/* Track background */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: 4,
                borderRadius: 2,
                background: `linear-gradient(to right, var(--ink-1) ${radiusPct}%, #E5E7EB ${radiusPct}%)`,
                pointerEvents: "none",
              }}
            />
            <input
              type="range"
              min={10}
              max={RADIUS_MAX}
              step={10}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              disabled={!selected}
              style={{
                position: "relative",
                width: "100%",
                height: 4,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                WebkitAppearance: "none" as any,
                appearance: "none",
                background: "transparent",
                cursor: selected ? "pointer" : "not-allowed",
                zIndex: 1,
                accentColor: "var(--ink-1)",
              }}
            />
          </div>
        </div>

        {/* Apply / Clear buttons */}
        <div style={{ padding: "8px 16px 20px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={handleApply}
            disabled={!selected}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: 12,
              background: selected ? "var(--ink-1)" : "#E5E7EB",
              color: selected ? "white" : "var(--ink-3)",
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: selected ? "pointer" : "not-allowed",
              transition: "background 0.15s",
            }}
          >
            Aplicar
          </button>
          {value && (
            <button
              onClick={() => { onApply(null); onClose(); }}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 12,
                background: "transparent",
                color: "var(--ink-3)",
                border: "1px solid var(--line-1)",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Quitar ubicación
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
