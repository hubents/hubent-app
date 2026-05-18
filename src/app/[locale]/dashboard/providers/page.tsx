"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useCallback, useRef } from "react";
import { EventScopedGuard } from "@/components/layout/event-scoped-guard";
import { Skeleton } from "@/components/ui/skeleton";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  Store01Icon,
  Search01Icon,
  InstagramIcon,
  Location01Icon,
  CheckmarkCircle01Icon,
  LinkSquare01Icon,
  FilterIcon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { PROVIDER_CATEGORIES, PLANNER_CATEGORIES, getOrgTypeLabel } from "@/config/provider-constants";
import { LocationPicker, type LocationFilter } from "@/components/partners/location-picker";

const IcoStore    = hgIcon(Store01Icon);
const IcoSearch   = hgIcon(Search01Icon);
const IcoInsta    = hgIcon(InstagramIcon);
const IcoLocation = hgIcon(Location01Icon);
const IcoVerified = hgIcon(CheckmarkCircle01Icon);
const IcoLink     = hgIcon(LinkSquare01Icon);
const IcoFilter   = hgIcon(FilterIcon);
const IcoChevDown = hgIcon(ArrowDown01Icon);

interface PartnersDirectoryOrg {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  orgType: string | null;
  instagramHandle: string | null;
  providerCategory: string | null;
  categories: string[] | null;
  tagline: string | null;
  city: string | null;
  region: string | null;
  serviceRadius: number | null;
  serviceAreas: string[] | null;
  phone: string | null;
  website: string | null;
}

const ALL_CATEGORIES = [...new Set([...PROVIDER_CATEGORIES, ...PLANNER_CATEGORIES])].sort();

function getOrgColors(orgType: string | null): { bg: string; fg: string } {
  return orgType === "provider"
    ? { bg: "#EDE7F6", fg: "#6B3FA0" }
    : { bg: "#E3F2FF", fg: "#1565C0" };
}

export default function ProvidersDirectoryPage() {
  return <EventScopedGuard><ProvidersDirectoryContent /></EventScopedGuard>;
}

function ProvidersDirectoryContent() {
  const t = useTranslations("providers");
  const [orgs, setOrgs] = useState<PartnersDirectoryOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [location, setLocation] = useState<LocationFilter | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!catOpen) return;
    const h = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false);
    };
    const id = setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", h); };
  }, [catOpen]);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categories.length > 0) params.set("categories", categories.join(","));
      if (typeFilter) params.set("type", typeFilter);
      if (location) {
        params.set("locationCity", location.city);
        params.set("locationRegion", location.region);
        params.set("locationCountry", location.country);
        params.set("locationRadius", location.radius.toString());
        params.set("locationLat", location.lat.toString());
        params.set("locationLon", location.lon.toString());
      }
      params.set("limit", "50");

      const res = await fetch(`/api/providers?${params}`);
      const data = await res.json();
      if (data.success) {
        setOrgs(data.data?.data || []);
        setTotal(data.data?.meta?.total ?? data.data?.data?.length ?? 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search, categories, typeFilter, location]);

  useEffect(() => {
    const timer = setTimeout(fetchOrgs, 300);
    return () => clearTimeout(timer);
  }, [fetchOrgs]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 4px", color: "var(--ink-1)", letterSpacing: "-0.01em" }}>
          {t("title")}
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-3)", margin: 0 }}>
          {t("subtitle")}
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div
          style={{
            flex: 1, minWidth: 220,
            display: "flex", alignItems: "center", gap: 8,
            background: "#FFFFFF", border: "1px solid var(--line-1)",
            borderRadius: 8, padding: "8px 12px",
          }}
        >
          <IcoSearch style={{ width: 14, height: 14, color: "var(--ink-3)", flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: 13, color: "var(--ink-1)", fontFamily: "inherit",
            }}
          />
        </div>

        {/* Category multi-select dropdown */}
        <div ref={catRef} style={{ position: "relative" }}>
          <button
            onClick={() => setCatOpen((o) => !o)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 12px", borderRadius: 8, cursor: "pointer",
              fontSize: 12.5, fontWeight: 500, fontFamily: "inherit",
              background: categories.length > 0 ? "var(--ink-1)" : "#FFFFFF",
              color: categories.length > 0 ? "white" : "var(--ink-1)",
              border: categories.length > 0 ? "1px solid var(--ink-1)" : "1px solid var(--line-strong)",
            }}
          >
            <IcoFilter style={{ width: 12, height: 12 }} />
            {categories.length === 0
              ? t("categoryPlaceholder")
              : categories.length === 1
                ? categories[0]
                : `${categories.length} categorías`}
            <IcoChevDown style={{ width: 12, height: 12 }} />
          </button>
          {catOpen && (
            <div
              style={{
                position: "absolute", left: 0, top: "calc(100% + 4px)",
                borderRadius: 8, padding: 4, zIndex: 50,
                background: "white", border: "1px solid var(--line-1)",
                boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                minWidth: 240, maxHeight: 320, overflowY: "auto",
              }}
            >
              {categories.length > 0 && (
                <button
                  onClick={() => setCategories([])}
                  style={{
                    display: "flex", alignItems: "center", width: "100%",
                    textAlign: "left", cursor: "pointer",
                    padding: "7px 10px", background: "transparent", border: "none",
                    borderBottom: "1px solid var(--line-1)", borderRadius: 0,
                    fontSize: 12, color: "var(--ink-3)", marginBottom: 4,
                    fontFamily: "inherit",
                  }}
                >
                  Limpiar selección
                </button>
              )}
              {ALL_CATEGORIES.map((c) => {
                const checked = categories.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => setCategories((prev) =>
                      checked ? prev.filter((x) => x !== c) : [...prev, c]
                    )}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", textAlign: "left", cursor: "pointer",
                      padding: "8px 10px",
                      background: checked ? "var(--bg-subtle)" : "transparent",
                      border: "none", borderRadius: 4,
                      fontSize: 12.5, fontWeight: checked ? 600 : 400,
                      color: "var(--ink-1)", gap: 8, fontFamily: "inherit",
                    }}
                  >
                    <span>{c}</span>
                    <span
                      style={{
                        width: 16, height: 16, borderRadius: "50%",
                        border: checked ? "none" : "1.5px solid var(--line-strong)",
                        background: checked ? "var(--ink-1)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {checked && (
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Location picker button */}
        <button
          onClick={() => setLocationOpen(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 12px", borderRadius: 8, cursor: "pointer",
            fontSize: 12.5, fontWeight: 500, fontFamily: "inherit",
            background: location ? "var(--ink-1)" : "#FFFFFF",
            color: location ? "white" : "var(--ink-1)",
            border: location ? "1px solid var(--ink-1)" : "1px solid var(--line-strong)",
          }}
        >
          <IcoLocation style={{ width: 12, height: 12 }} />
          {location
            ? `${location.label}${location.radius < 500 ? ` · ${location.radius}km` : ""}`
            : (t("location") ?? "Ubicación")}
        </button>

        <LocationPicker
          open={locationOpen}
          onClose={() => setLocationOpen(false)}
          value={location}
          onApply={(loc) => setLocation(loc)}
        />

        {/* Type toggle: Todos / Proveedor / Planner */}
        {(["", "provider", "planner"] as const).map((val) => {
          const label = val === "" ? t("typeAll") : val === "provider" ? t("typeProvider") : t("typePlanner");
          const active = typeFilter === val;
          return (
            <button
              key={val}
              onClick={() => setTypeFilter(val)}
              style={{
                display: "inline-flex", alignItems: "center",
                padding: "7px 12px", borderRadius: 8, cursor: "pointer",
                fontSize: 12.5, fontWeight: 500, fontFamily: "inherit",
                background: active ? "var(--ink-1)" : "#FFFFFF",
                color: active ? "white" : "var(--ink-1)",
                border: active ? "1px solid var(--ink-1)" : "1px solid var(--line-strong)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 180, borderRadius: 12 }} />
          ))}
        </div>
      ) : orgs.length === 0 ? (
        <div
          style={{
            background: "#FFFFFF", border: "1px solid var(--line-1)",
            borderRadius: 12, padding: "48px 24px", textAlign: "center",
          }}
        >
          <IcoStore style={{ width: 40, height: 40, color: "var(--ink-4)", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-1)", margin: "0 0 6px" }}>
            {t("noResults")}
          </p>
          <p style={{ fontSize: 13, color: "var(--ink-3)", margin: 0 }}>
            {search || categories.length > 0 || typeFilter || location
              ? t("tryOtherFilters")
              : t("noOrgs")}
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 12.5, color: "var(--ink-3)", margin: 0 }}>
            {t("resultsFound", { count: total })}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {orgs.map((org) => {
              const location = [org.city, org.region].filter(Boolean).join(", ");
              const colors = getOrgColors(org.orgType);
              const initials = org.name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
              return (
                <div
                  key={org.id}
                  style={{
                    background: "#FFFFFF", border: "1px solid var(--line-1)",
                    borderRadius: 12, padding: 18,
                    display: "flex", flexDirection: "column", gap: 12,
                    transition: "box-shadow .15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                >
                  {/* Top row */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div
                      style={{
                        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                        background: colors.bg, display: "flex", alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {org.logo
                        ? <img src={org.logo} alt={org.name} style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }} />
                        : <span style={{ fontSize: 14, fontWeight: 700, color: colors.fg }}>{initials}</span>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {org.name}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "#17A95C" }}>
                        <IcoVerified style={{ width: 12, height: 12 }} />
                        {t("verified")}
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: colors.bg, color: colors.fg }}>
                      {getOrgTypeLabel(org.orgType)}
                    </span>
                    {(org.categories && org.categories.length > 0
                      ? org.categories
                      : org.providerCategory
                        ? [org.providerCategory]
                        : []
                    ).map((cat) => (
                      <span key={cat} style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99, background: "var(--bg-subtle)", color: "var(--ink-2)", border: "1px solid var(--line-1)" }}>
                        {cat}
                      </span>
                    ))}
                    {location && (
                      <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99, background: "var(--bg-subtle)", color: "var(--ink-2)", border: "1px solid var(--line-1)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <IcoLocation style={{ width: 10, height: 10 }} />
                        {location}
                      </span>
                    )}
                  </div>

                  {/* Tagline */}
                  {org.tagline && (
                    <p style={{ fontSize: 12.5, color: "var(--ink-3)", margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {org.tagline}
                    </p>
                  )}

                  {/* Instagram */}
                  {org.instagramHandle && (
                    <p style={{ fontSize: 12.5, color: "var(--ink-3)", margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
                      <IcoInsta style={{ width: 13, height: 13 }} />
                      @{org.instagramHandle}
                    </p>
                  )}

                  {/* CTA */}
                  <Link
                    href={`/providers/${org.slug}`}
                    target="_blank"
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                      marginTop: "auto", padding: "7px 14px", borderRadius: 8,
                      border: "1px solid var(--line-strong)", background: "#FFFFFF",
                      fontSize: 12.5, fontWeight: 600, color: "var(--ink-1)",
                      textDecoration: "none", transition: "background .12s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
                  >
                    <IcoLink style={{ width: 13, height: 13 }} />
                    {t("viewProfile")}
                  </Link>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
