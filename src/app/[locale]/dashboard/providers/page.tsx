"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useCallback } from "react";
import { EventScopedGuard } from "@/components/layout/event-scoped-guard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  Store01Icon,
  Search01Icon,
  InstagramIcon,
  Location01Icon,
  CheckmarkCircle01Icon,
  LinkSquare01Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { PROVIDER_CATEGORIES, PLANNER_CATEGORIES, getOrgTypeLabel } from "@/config/provider-constants";

const IcoStore    = hgIcon(Store01Icon);
const IcoSearch   = hgIcon(Search01Icon);
const IcoInsta    = hgIcon(InstagramIcon);
const IcoLocation = hgIcon(Location01Icon);
const IcoVerified = hgIcon(CheckmarkCircle01Icon);
const IcoLink     = hgIcon(LinkSquare01Icon);

interface PartnersDirectoryOrg {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  orgType: string | null;
  instagramHandle: string | null;
  providerCategory: string | null;
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
  const [category, setCategory] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [total, setTotal] = useState(0);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (typeFilter) params.set("type", typeFilter);
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
  }, [search, category, typeFilter]);

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
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
        <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
          <SelectTrigger style={{ width: 180, borderRadius: 8, fontSize: 13, border: "1px solid var(--line-1)" }}>
            <SelectValue placeholder={t("typePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("typeAll")}</SelectItem>
            <SelectItem value="provider">{t("typeProvider")}</SelectItem>
            <SelectItem value="planner">{t("typePlanner")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
          <SelectTrigger style={{ width: 200, borderRadius: 8, fontSize: 13, border: "1px solid var(--line-1)" }}>
            <SelectValue placeholder={t("categoryPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCategories")}</SelectItem>
            {ALL_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            {search || category || typeFilter
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
                    {org.providerCategory && (
                      <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99, background: "var(--bg-subtle)", color: "var(--ink-2)", border: "1px solid var(--line-1)" }}>
                        {org.providerCategory}
                      </span>
                    )}
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
