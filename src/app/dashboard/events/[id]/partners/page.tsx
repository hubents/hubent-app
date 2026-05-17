"use client";

import { useState, useEffect, use, useRef } from "react";
import { useEvent } from "@/contexts/event-context";
import { Skeleton } from "@/components/ui/skeleton";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  UserGroup03Icon,
  Search01Icon,
  PlusSignIcon,
  Cancel01Icon,
  LinkSquare01Icon,
  CheckmarkCircle01Icon,
  Delete01Icon,
  SentIcon,
  InstagramIcon,
  Location01Icon,
  FilterIcon,
  GridViewIcon,
  ListViewIcon,
} from "@hugeicons/core-free-icons";
import { Btn, Pill } from "@/components/ui/ds";
import Link from "next/link";
import { useUserSessionContext } from "@/contexts/user-session-context";
import { useEventPermissions } from "@/hooks/use-event-permissions";
import { EventSectionGuard } from "@/components/events/event-section-guard";
import { getInitials as initials } from "@/lib/ui-utils";

const IcoPartners = hgIcon(UserGroup03Icon);
const IcoSearch   = hgIcon(Search01Icon);
const IcoPlus     = hgIcon(PlusSignIcon);
const IcoClose    = hgIcon(Cancel01Icon);
const IcoLink     = hgIcon(LinkSquare01Icon);
const IcoVerified = hgIcon(CheckmarkCircle01Icon);
const IcoDelete   = hgIcon(Delete01Icon);
const IcoSend     = hgIcon(SentIcon);
const IcoInsta    = hgIcon(InstagramIcon);
const IcoLocation = hgIcon(Location01Icon);
const IcoFilter   = hgIcon(FilterIcon);
const IcoGrid     = hgIcon(GridViewIcon);
const IcoList     = hgIcon(ListViewIcon);

// ── Types ───────────────────────────────────────────────────────
interface EventPartner {
  id: number;
  guestOrgId: number | null;
  invitationEmail: string | null;
  status: string;
  invitedAt: string;
  acceptedAt: string | null;
  guestName: string | null;
  guestSlug: string | null;
  guestOrgType: string | null;
  guestCategory: string | null;
  guestLogo: string | null;
  guestTagline: string | null;
  guestCity: string | null;
  guestRegion: string | null;
  guestVerified: string | null;
}

interface EventVendor {
  id: number;
  vendorName: string;
  service: string;
  category: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

interface DirectoryProvider {
  id: number;
  name: string;
  slug: string;
  providerCategory: string | null;
  instagramHandle: string | null;
  tagline: string | null;
  city: string | null;
}

// ── Status config ───────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; bg: string; fg: string }> = {
  active:               { label: "Confirmado",   bg: "#D1FAE5", fg: "#065F46" },
  pending:              { label: "Pendiente",     bg: "#FEF3CD", fg: "#92600A" },
  pending_registration: { label: "Sin registrar", bg: "#F3F4F6", fg: "#6B7280" },
  rejected:             { label: "Rechazado",     bg: "#FEE2E2", fg: "#991B1B" },
  revoked:              { label: "Revocado",      bg: "#F3F4F6", fg: "#6B7280" },
};

// ── Category-based color map ────────────────────────────────────
const CAT_COLORS: Array<{ keys: string[]; bg: string; fg: string }> = [
  { keys: ["flor", "decorac"],            bg: "#D1FAE5", fg: "#065F46" },
  { keys: ["fotograf", "video", "cine"],  bg: "#EDE7F6", fg: "#6B3F8A" },
  { keys: ["catering", "banquet", "men"], bg: "#FEE2E2", fg: "#991B1B" },
  { keys: ["música", "musica", "dj", "banda"], bg: "#DBEAFE", fg: "#1E40AF" },
  { keys: ["transport"],                  bg: "#E0F7FA", fg: "#006064" },
  { keys: ["audio", "ilumina", "sonido"], bg: "#E0E7FF", fg: "#3730A3" },
  { keys: ["venue", "finca", "salón", "salon", "espacio", "castillo"], bg: "#FEF3CD", fg: "#92600A" },
  { keys: ["belleza", "maquill", "peluq", "estética", "estetica"], bg: "#FDE8F5", fg: "#9B2C7E" },
  { keys: ["coordinac", "wedding planner"], bg: "#E8EFF7", fg: "#1E40AF" },
  { keys: ["fotografía y vídeo", "foto"], bg: "#EDE7F6", fg: "#6B3F8A" },
];

function categoryColor(cat: string | null): { bg: string; fg: string } {
  if (!cat) return { bg: "#F3F4F6", fg: "#6B7280" };
  const lower = cat.toLowerCase();
  for (const { keys, bg, fg } of CAT_COLORS) {
    if (keys.some((k) => lower.includes(k))) return { bg, fg };
  }
  // Fallback: hash
  let h = 0;
  for (const c of cat) h = c.charCodeAt(0) + ((h << 5) - h);
  const palette = [
    { bg: "#D1FAE5", fg: "#065F46" }, { bg: "#EDE7F6", fg: "#6B3F8A" },
    { bg: "#DBEAFE", fg: "#1E40AF" }, { bg: "#FEF3CD", fg: "#92600A" },
    { bg: "#FDE8F5", fg: "#9B2C7E" }, { bg: "#E0E7FF", fg: "#3730A3" },
  ];
  return palette[Math.abs(h) % palette.length];
}

// ── Stars component ─────────────────────────────────────────────
function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.4;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div style={{ display: "flex", gap: 1 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            style={{
              fontSize: 12,
              color: i < full || (i === full && half) ? "#F59E0B" : "#E5E7EB",
            }}
          >
            ★
          </span>
        ))}
      </div>
      <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────
export default function EventPartnersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);
  const { setActiveEvent } = useEvent();
  const { eventScoped } = useUserSessionContext();
  const { canEdit } = useEventPermissions(eventId, eventScoped);
  const canEditPartners = canEdit("vendors");

  const [partners, setPartners] = useState<EventPartner[]>([]);
  const [vendors, setVendors]   = useState<EventVendor[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/events/${eventId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setActiveEvent(d.data); })
      .catch(() => {});
  }, [eventId, setActiveEvent]);

  const fetchAll = async () => {
    const [pRes, vRes] = await Promise.all([
      fetch(`/api/events/${eventId}/partners`).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/events/${eventId}/vendors`).then((r) => r.json()).catch(() => ({})),
    ]);
    if (pRes.success) setPartners(pRes.data ?? []);
    if (vRes.success) setVendors(vRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [eventId]);

  const handleStatusChange = async (partnerId: number, status: "active" | "rejected" | "pending") => {
    setPartners((prev) => prev.map((p) => p.id === partnerId ? { ...p, status } : p));
    await fetch(`/api/events/${eventId}/partners`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: partnerId, status }),
    }).catch(() => { fetchAll(); });
  };

  const handleRemoveVendor = async (vendorId: number) => {
    setVendors((v) => v.filter((x) => x.id !== vendorId));
    await fetch(`/api/events/${eventId}/vendors?id=${vendorId}`, { method: "DELETE" }).catch(() => {});
  };

  const lc = search.toLowerCase();
  const allItems = [
    ...partners.map((p) => ({ kind: "partner" as const, data: p, key: `p-${p.id}` })),
    ...vendors.map((v) => ({ kind: "vendor" as const, data: v, key: `v-${v.id}` })),
  ];
  const filtered = search
    ? allItems.filter(({ kind, data }) => {
        if (kind === "partner") {
          const p = data as EventPartner;
          return (p.guestName?.toLowerCase().includes(lc) ?? false)
            || (p.guestCategory?.toLowerCase().includes(lc) ?? false)
            || (p.invitationEmail?.toLowerCase().includes(lc) ?? false);
        }
        const v = data as EventVendor;
        return v.vendorName.toLowerCase().includes(lc) || (v.category?.toLowerCase().includes(lc) ?? false);
      })
    : allItems;

  const total = allItems.length;
  const shown = filtered.length;

  return (
    <EventSectionGuard eventId={eventId} section="vendors">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Header */}
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 4px", color: "var(--ink-1)", letterSpacing: "-0.01em" }}>
            Partners del evento
          </h1>
          <p style={{ fontSize: 13, color: "var(--ink-3)", margin: 0 }}>
            Partners que recomiendas a la pareja para este evento
          </p>
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#FFFFFF", border: "1px solid var(--line-1)",
            borderRadius: 8, padding: "7px 12px", minWidth: 220,
          }}>
            <IcoSearch style={{ width: 14, height: 14, color: "var(--ink-3)", flexShrink: 0 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              style={{
                flex: 1, border: "none", outline: "none", background: "transparent",
                fontSize: 13, color: "var(--ink-1)", fontFamily: "inherit",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                <IcoClose style={{ width: 12, height: 12, color: "var(--ink-3)" }} />
              </button>
            )}
          </div>

          {/* Category filter */}
          <button style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 12px", borderRadius: 8,
            background: "#FFFFFF", border: "1px solid var(--line-1)",
            fontSize: 13, color: "var(--ink-2)", fontFamily: "inherit",
            cursor: "pointer", fontWeight: 500,
          }}>
            <IcoFilter style={{ width: 14, height: 14 }} />
            Categoría
            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>▾</span>
          </button>

          {/* Right side */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {/* Count */}
            <span style={{ fontSize: 12.5, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
              {shown} de {total}
            </span>

            {/* View toggle */}
            <div style={{ display: "flex", background: "var(--bg-subtle)", borderRadius: 7, padding: 3, gap: 2 }}>
              {(["grid", "list"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 28, height: 28, borderRadius: 5, border: "none", cursor: "pointer",
                    background: viewMode === mode ? "#FFFFFF" : "transparent",
                    color: viewMode === mode ? "var(--ink-1)" : "var(--ink-3)",
                    boxShadow: viewMode === mode ? "0 1px 3px rgba(0,0,0,.1)" : "none",
                  }}
                >
                  {mode === "grid"
                    ? <IcoGrid style={{ width: 14, height: 14 }} />
                    : <IcoList style={{ width: 14, height: 14 }} />
                  }
                </button>
              ))}
            </div>

            {/* Add button */}
            {canEditPartners && (
              <Btn onClick={() => setDrawerOpen(true)}>
                <IcoPlus className="h-[14px] w-[14px]" />
                Añadir partner
              </Btn>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} style={{ height: 260, borderRadius: 12 }} />)}
          </div>
        ) : total === 0 ? (
          <EmptyState onAdd={canEditPartners ? () => setDrawerOpen(true) : undefined} />
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", fontSize: 13, color: "var(--ink-3)" }}>
            Sin resultados para "{search}"
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {filtered.map(({ kind, data, key }) =>
              kind === "partner" ? (
                <PartnerCard
                  key={key}
                  partner={data as EventPartner}
                  canEdit={canEditPartners}
                  onStatusChange={(status) => handleStatusChange((data as EventPartner).id, status)}
                />
              ) : (
                <VendorCard
                  key={key}
                  vendor={data as EventVendor}
                  canRemove={canEditPartners}
                  onRemove={() => handleRemoveVendor((data as EventVendor).id)}
                />
              )
            )}
          </div>
        )}
      </div>

      <InviteDrawer
        open={drawerOpen}
        eventId={eventId}
        existingPartners={partners}
        onClose={() => setDrawerOpen(false)}
        onInvited={() => { fetchAll(); setDrawerOpen(false); }}
      />
    </EventSectionGuard>
  );
}

// ── Partner card ────────────────────────────────────────────────
function PartnerCard({ partner, canEdit, onStatusChange }: {
  partner: EventPartner;
  canEdit: boolean;
  onStatusChange: (s: "active" | "rejected" | "pending") => void;
}) {
  const st       = STATUS_MAP[partner.status] ?? STATUS_MAP.pending;
  const name     = partner.guestName || partner.invitationEmail || "Partner";
  const colors   = categoryColor(partner.guestCategory);
  const ini      = initials(name);
  const isConfirmed = partner.status === "active";
  const isRejected  = partner.status === "rejected";
  const location    = [partner.guestCity, partner.guestRegion].filter(Boolean).join(", ");

  return (
    <div style={{
      background: isRejected ? "#FFF8F7" : "#FFFFFF",
      border: `1px solid ${isRejected ? "#FECACA" : "var(--line-1)"}`,
      borderRadius: 12, padding: "16px 16px 14px",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      {/* Row: avatar + name + status */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {/* Avatar — circular, category color */}
        <div style={{
          width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
          background: partner.guestLogo ? "transparent" : colors.bg,
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>
          {partner.guestLogo
            ? <img src={partner.guestLogo} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: 15, fontWeight: 700, color: colors.fg }}>{ini}</span>
          }
        </div>

        {/* Name + verified + status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)", lineHeight: 1.3, minWidth: 0 }}>
              {name}
            </span>
            <Pill color={st.fg} bg={st.bg} style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 600 }}>
              {st.label}
            </Pill>
          </div>

          {/* Verified badge */}
          {partner.guestVerified === "verified" && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#2563EB", marginTop: 3 }}>
              <IcoVerified style={{ width: 12, height: 12 }} />
            </div>
          )}

          {/* Category tag */}
          {partner.guestCategory && (
            <div style={{ marginTop: 5 }}>
              <span style={{
                display: "inline-block",
                fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
                textTransform: "uppercase", padding: "2px 8px", borderRadius: 99,
                background: colors.bg, color: colors.fg,
              }}>
                {partner.guestCategory}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {partner.guestTagline && (
        <p style={{
          fontSize: 12.5, color: "var(--ink-3)", margin: 0, lineHeight: 1.55,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {partner.guestTagline}
        </p>
      )}

      {/* Location */}
      {location && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--ink-3)" }}>
          <IcoLocation style={{ width: 12, height: 12, flexShrink: 0 }} />
          {location}
        </div>
      )}

      {/* Stars placeholder — show only when we have rating */}
      <Stars rating={null} />

      {/* Ver perfil completo — full-width outlined button */}
      {partner.guestSlug ? (
        <Link
          href={`/providers/${partner.guestSlug}`}
          target="_blank"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "7px 12px", borderRadius: 8,
            border: "1px solid var(--line-1)", background: "#FFFFFF",
            fontSize: 12.5, fontWeight: 500, color: "var(--ink-2)",
            textDecoration: "none",
          }}
        >
          <IcoLink style={{ width: 13, height: 13 }} />
          Ver perfil completo
        </Link>
      ) : (
        <div style={{ height: 34 }} /> /* spacer so all cards have same height rhythm */
      )}

      {/* Action buttons — siempre con color semántico; sólido si activo, outline si no */}
      {canEdit && (
        <div style={{ display: "flex", gap: 6 }}>
          {/* ✓ Confirmado — siempre verde */}
          <button
            onClick={() => onStatusChange("active")}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              padding: "7px 0", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit", transition: "background .12s, color .12s",
              background: isConfirmed ? "#D1FAE5" : "#FFFFFF",
              color: isConfirmed ? "#065F46" : "#16A34A",
              border: `1px solid ${isConfirmed ? "#6EE7B7" : "#BBF7D0"}`,
            }}
          >
            ✓ Confirmado
          </button>
          {/* ✕ Rechazado — siempre rojo/rosa */}
          <button
            onClick={() => onStatusChange("rejected")}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              padding: "7px 0", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit", transition: "background .12s, color .12s",
              background: isRejected ? "#FEE2E2" : "#FFFFFF",
              color: isRejected ? "#991B1B" : "#E85D4E",
              border: `1px solid #FECACA`,
            }}
          >
            ✕ Rechazado
          </button>
        </div>
      )}
    </div>
  );
}

// ── Vendor card ─────────────────────────────────────────────────
function VendorCard({ vendor, canRemove, onRemove }: {
  vendor: EventVendor;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const [hover, setHover] = useState(false);
  const colors = categoryColor(vendor.category);
  const ini    = initials(vendor.vendorName);

  return (
    <div
      style={{
        background: "#FFFFFF", border: "1px solid var(--line-1)",
        borderRadius: 12, padding: "16px 16px 14px",
        display: "flex", flexDirection: "column", gap: 10,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
          background: colors.bg, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: colors.fg }}>{ini}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)", lineHeight: 1.3 }}>
              {vendor.vendorName}
            </span>
            {canRemove && hover && (
              <button
                onClick={onRemove}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", color: "var(--ink-3)", borderRadius: 5, flexShrink: 0 }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#991B1B"; e.currentTarget.style.background = "#FEE2E2"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ink-3)"; e.currentTarget.style.background = "none"; }}
              >
                <IcoDelete style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>
          {vendor.category && (
            <div style={{ marginTop: 5 }}>
              <span style={{
                display: "inline-block",
                fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
                textTransform: "uppercase", padding: "2px 8px", borderRadius: 99,
                background: colors.bg, color: colors.fg,
              }}>
                {vendor.category}
              </span>
            </div>
          )}
        </div>
      </div>
      {vendor.service && (
        <p style={{ fontSize: 12.5, color: "var(--ink-3)", margin: 0, lineHeight: 1.55 }}>
          {vendor.service}
        </p>
      )}
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd?: () => void }) {
  return (
    <div style={{
      background: "#FFFFFF", border: "1px solid var(--line-1)", borderRadius: 12,
      padding: "56px 24px", textAlign: "center",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
    }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--bg-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <IcoPartners style={{ width: 24, height: 24, color: "var(--ink-4)" }} />
      </div>
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-1)", margin: "0 0 4px" }}>
          Sin partners en este evento
        </p>
        <p style={{ fontSize: 13, color: "var(--ink-3)", margin: 0 }}>
          Añade partners para colaborar y hacer seguimiento
        </p>
      </div>
      {onAdd && (
        <Btn onClick={onAdd} style={{ marginTop: 4 }}>
          <IcoPlus className="h-[14px] w-[14px]" />
          Añadir primer partner
        </Btn>
      )}
    </div>
  );
}

// ── Invite drawer ────────────────────────────────────────────────
function InviteDrawer({ open, eventId, existingPartners, onClose, onInvited }: {
  open: boolean;
  eventId: number;
  existingPartners: EventPartner[];
  onClose: () => void;
  onInvited: () => void;
}) {
  const [search, setSearch]     = useState("");
  const [providers, setProviders] = useState<DirectoryProvider[]>([]);
  const [loading, setLoading]   = useState(false);
  const [inviting, setInviting] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) { setSearch(""); return; }
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const p = new URLSearchParams({ limit: "30" });
    if (search.trim()) p.set("search", search.trim());
    else p.set("favorites", "true");
    const t = setTimeout(() => {
      fetch(`/api/providers?${p}`)
        .then((r) => r.json())
        .then((d) => { if (d.success) setProviders(d.data?.data ?? []); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search, open]);

  const handleInvite = async (orgId: number) => {
    setInviting(orgId);
    try {
      const res = await fetch(`/api/events/${eventId}/partners`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestOrgId: orgId }),
      });
      if ((await res.json()).success) onInvited();
    } catch { /* silent */ }
    finally { setInviting(null); }
  };

  if (!open) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end", background: "rgba(20,18,12,.35)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 440, background: "var(--bg-panel)",
          borderTopLeftRadius: 16, borderBottomLeftRadius: 16,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "22px 24px 16px", borderBottom: "1px solid var(--line-1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--bg-subtle)", border: "1px solid var(--line-1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IcoPartners style={{ width: 17, height: 17, color: "var(--ink-2)" }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink-1)" }}>Añadir partner</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 1 }}>Busca en el directorio de Hubents</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", color: "var(--ink-3)" }}>
            <IcoClose style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "14px 24px 8px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#FFFFFF", border: "1px solid var(--line-1)", borderRadius: 8, padding: "8px 12px",
          }}>
            <IcoSearch style={{ width: 14, height: 14, color: "var(--ink-3)", flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o categoría..."
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, color: "var(--ink-1)", fontFamily: "inherit" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                <IcoClose style={{ width: 12, height: 12, color: "var(--ink-3)" }} />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 24px 24px", display: "flex", flexDirection: "column", gap: 6 }}>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ height: 64, borderRadius: 10, background: "var(--bg-subtle)" }} />
              ))
            : providers.length === 0
            ? <p style={{ fontSize: 13, color: "var(--ink-3)", textAlign: "center", paddingTop: 32 }}>No se encontraron resultados</p>
            : providers.map((p) => {
                const already  = existingPartners.some((ep) => ep.guestOrgId === p.id);
                const colors   = categoryColor(p.providerCategory);
                const ini      = initials(p.name);
                return (
                  <div key={p.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", borderRadius: 10,
                    background: "#FFFFFF", border: "1px solid var(--line-1)",
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: colors.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: colors.fg }}>{ini}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.name}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        {p.providerCategory && <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{p.providerCategory}</span>}
                        {p.instagramHandle && (
                          <span style={{ fontSize: 11, color: "var(--ink-3)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <IcoInsta style={{ width: 11, height: 11 }} />
                            @{p.instagramHandle}
                          </span>
                        )}
                      </div>
                    </div>
                    {already ? (
                      <Pill color="#065F46" bg="#D1FAE5">Añadido</Pill>
                    ) : (
                      <Btn size="sm" onClick={() => handleInvite(p.id)} disabled={inviting === p.id}>
                        <IcoSend style={{ width: 12, height: 12 }} />
                        {inviting === p.id ? "..." : "Añadir"}
                      </Btn>
                    )}
                  </div>
                );
              })
          }
        </div>
      </div>
    </div>
  );
}
