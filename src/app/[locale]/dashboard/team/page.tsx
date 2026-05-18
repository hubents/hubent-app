"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { EventScopedGuard } from "@/components/layout/event-scoped-guard";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useTeam } from "@/hooks/use-team";
import { useRoles } from "@/hooks/use-roles";
import { useUserSession } from "@/hooks/use-user-session";
import { handleBillingError } from "@/lib/billing-errors";
import { hgIcon } from "@/components/ui/hg-icon";
import { UserAdd01Icon, UserGroupIcon, Mail01Icon, Time01Icon, Delete01Icon, Refresh01Icon, Cancel01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Av, Btn, Inp } from "@/components/ui/ds";
import { appConfirm } from "@/lib/confirm";

const RiUserAddLine = hgIcon(UserAdd01Icon);
const RiTeamLine = hgIcon(UserGroupIcon);
const RiMailLine = hgIcon(Mail01Icon);
const RiTimeLine = hgIcon(Time01Icon);
const RiDeleteBinLine = hgIcon(Delete01Icon);
const RiRefreshLine = hgIcon(Refresh01Icon);
const RiCloseLine = hgIcon(Cancel01Icon);
const RiArrowRightSLine = hgIcon(ArrowRight01Icon);

// ── Types ──────────────────────────────────────────────────────────────────────
interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string | null;
  createdAt: Date | null;
}

interface Invitation {
  id: number;
  email: string;
  role: string | null;
  status: string;
  expiresAt: Date | null;
  createdAt: Date | null;
}

// ── Member drawer ─────────────────────────────────────────────────────────────
function MemberDrawer({
  member,
  roleLabel,
  onClose,
  onRemove,
  canManage,
  locale,
}: {
  member: TeamMember;
  roleLabel: string;
  onClose: () => void;
  onRemove: () => void;
  canManage: boolean;
  locale: string;
}) {
  const t = useTranslations("team");

  const fmtDate = (d: Date | string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(20,18,12,0.4)", zIndex: 60, display: "flex", justifyContent: "flex-end" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 420, background: "white", display: "flex", flexDirection: "column", boxShadow: "-8px 0 28px rgba(0,0,0,0.08)" }}
      >
        {/* Header */}
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--line-1)", display: "flex", alignItems: "flex-start", gap: 14 }}>
          <Av src={member.image} name={member.name ?? member.email} seed={member.email} size={52} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>{member.name || member.email}</div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>{roleLabel}</div>
            <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 999, background: "#D9ECD1", fontSize: 12, fontWeight: 600, color: "#1F6A3A" }}>
              {t("memberDrawer.statusActive")}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 4 }}>
            <RiCloseLine size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-4)" }}>{t("memberDrawer.contactSection")}</div>
            {[
              { Icon: RiMailLine, val: member.email },
              { Icon: RiTimeLine, val: member.createdAt ? t("memberDrawer.joinedSince", { date: fmtDate(member.createdAt) }) : null },
            ].filter((r) => r.val).map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--ink-2)" }}>
                <r.Icon size={14} style={{ color: "var(--ink-3)", flexShrink: 0 } as React.CSSProperties} />
                {r.val}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: t("memberDrawer.roleLabel"), val: roleLabel },
              { label: t("memberDrawer.statusLabel"), val: t("memberDrawer.statusActive") },
            ].map((k, i) => (
              <div key={i} style={{ background: "var(--bg-subtle)", borderRadius: "var(--r-sm)", padding: "12px 14px", border: "1px solid var(--line-1)" }}>
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{k.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--line-1)", display: "flex", gap: 10 }}>
          {canManage && member.role !== "owner" && (
            <button
              onClick={onRemove}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "transparent", border: "none", cursor: "pointer", color: "#B55450", fontSize: 12, fontWeight: 500 }}
            >
              <RiDeleteBinLine size={13} /> {t("memberDrawer.removeBtn")}
            </button>
          )}
          <button
            onClick={onClose}
            style={{ marginLeft: "auto", padding: "9px 20px", border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", background: "white", cursor: "pointer", fontSize: 13, fontWeight: 500 }}
          >
            {t("memberDrawer.closeBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Invite modal ──────────────────────────────────────────────────────────────
function InviteModal({
  roles,
  rolesLoading,
  onClose,
  onInvite,
}: {
  roles: { slug: string; name: string }[];
  rolesLoading: boolean;
  onClose: () => void;
  onInvite: (email: string, role: string) => Promise<void>;
}) {
  const t = useTranslations("team");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("planner");
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleEmail = (v: string) => {
    setEmail(v);
    setEmailError(v && !isValidEmail(v) ? t("inviteModal.emailInvalid") : null);
  };

  const submit = async () => {
    if (!isValidEmail(email)) { setEmailError(t("inviteModal.emailInvalid")); return; }
    setSubmitting(true);
    await onInvite(email, role);
    setSubmitting(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,18,12,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ width: 440, background: "white", borderRadius: "var(--r-md)", padding: 22, boxShadow: "var(--shadow-3)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>{t("inviteModal.title")}</div>
        <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 16 }}>{t("inviteModal.subtitle")}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, display: "block" }}>{t("inviteModal.emailLabel")}</label>
            <Inp type="email" placeholder={t("inviteModal.emailPlaceholder")} value={email} onChange={(e) => handleEmail(e.target.value)} className={emailError ? "border-red-500" : ""} />
            {emailError && <p style={{ fontSize: 11.5, color: "#EF4444", marginTop: 4 }}>{emailError}</p>}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, display: "block" }}>{t("inviteModal.roleLabel")}</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rolesLoading ? (
                  <SelectItem value="planner" disabled>{t("inviteModal.rolesLoading")}</SelectItem>
                ) : roles.map((r) => (
                  <SelectItem key={r.slug} value={r.slug}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Btn variant="outline" onClick={onClose} disabled={submitting}>{t("inviteModal.cancelBtn")}</Btn>
          <Btn onClick={submit} disabled={!email || !!emailError || submitting}>
            {submitting ? t("inviteModal.submitting") : t("inviteModal.submitBtn")}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TeamPage() {
  return <EventScopedGuard><TeamPageContent /></EventScopedGuard>;
}

export function TeamPageContent({ rolesPath = "/dashboard/settings/roles" }: { rolesPath?: string }) {
  const t = useTranslations("team");
  const router = useRouter();
  const locale = useLocale();
  const { can } = useUserSession();
  const canManageTeam = can("team:manage");
  const { members, invitations, loading, inviteMember, removeMember, cancelInvitation, resendInvitation } = useTeam();
  const { systemRoles, customRoles, loading: rolesLoading } = useRoles();

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const defaultRoleLabels: Record<string, string> = {
    owner: t("defaultRoles.owner"),
    admin: t("defaultRoles.admin"),
    planner: t("defaultRoles.planner"),
    assistant: t("defaultRoles.assistant"),
    accountant: t("defaultRoles.accountant"),
    viewer: t("defaultRoles.viewer"),
    vendor: t("defaultRoles.vendor"),
    client: t("defaultRoles.client"),
  };

  const allRoles = [...systemRoles, ...customRoles];
  const invitableRoles = allRoles.filter((r) => r.slug !== "owner" && r.slug !== "vendor" && r.slug !== "client");
  const getRoleLabel = (slug: string | null) => {
    if (!slug) return "—";
    return allRoles.find((r) => r.slug === slug)?.name || defaultRoleLabels[slug] || slug;
  };

  const fmtDate = (d: Date | string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
  };

  const filteredMembers = members.filter((m) => {
    if (!query) return true;
    return `${m.name || ""} ${m.email}`.toLowerCase().includes(query.toLowerCase());
  });
  const filteredInvitations = invitations.filter((inv) => {
    if (!query) return true;
    return inv.email.toLowerCase().includes(query.toLowerCase());
  });

  const handleInvite = async (email: string, role: string) => {
    const result = await inviteMember({ email, role });
    if (result.success) {
      toast.success(t("toast.inviteSent"), { description: t("toast.inviteSentDesc", { email }) });
      setInviteOpen(false);
    } else {
      if (!handleBillingError(result.error || "")) {
        toast.error(t("toast.inviteError"), { description: result.error });
      }
    }
  };

  const handleRemove = async (member: TeamMember) => {
    if (!await appConfirm({ title: t("confirm.removeTitle", { name: member.name || member.email }), description: t("confirm.removeDescription"), variant: "destructive", confirmLabel: t("confirm.removeBtn") })) return;
    await removeMember(member.id);
    toast.success(t("toast.memberRemoved"));
    setSelected(null);
  };

  const handleCancelInv = async (id: number, email: string) => {
    const result = await cancelInvitation(id);
    if (result.success) toast.success(t("toast.inviteCanceled", { email }));
    else toast.error(t("toast.cancelError"));
  };

  const handleResendInv = async (id: number, email: string) => {
    const result = await resendInvitation(id);
    if (result.success) toast.success(t("toast.inviteResent", { email }));
    else toast.error(t("toast.resendError"));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0, borderRadius: "var(--r-md)", border: "1px solid var(--line-1)", overflow: "hidden", background: "var(--bg-panel)" }}>
        {[
          { label: t("kpiActiveMembers"),     val: members.length,                           sub: t("kpiActiveSubtitle") },
          { label: t("kpiPendingInvitations"), val: invitations.length,                    sub: t("kpiPendingSubtitle") },
          { label: t("kpiTotal"),          val: members.length + invitations.length,     sub: t("kpiTotalSubtitle") },
          { label: t("kpiRoles"),       val: new Set(members.map((m) => m.role).filter(Boolean)).size, sub: t("kpiRolesSubtitle") },
        ].map((k, i) => (
          <div key={i} style={{ padding: "16px 20px", borderLeft: i > 0 ? "1px solid var(--line-1)" : "none" }}>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 6 }}>{k.label}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>{k.val}</span>
              <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ padding: 18, borderRadius: "var(--r-md)", border: "1px solid var(--line-1)", background: "var(--bg-panel)" }}>
        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ position: "relative", flex: "0 1 280px" }}>
            <RiTeamLine size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-4)" }} />
            <Inp
              placeholder={t("searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: 30, height: 34, fontSize: 13 }}
            />
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {canManageTeam && (
              <Btn variant="outline" size="sm" onClick={() => router.push(rolesPath)}>
                {t("rolesBtn")}
              </Btn>
            )}
            {canManageTeam && (
              <Btn size="sm" className="gap-1.5" onClick={() => setInviteOpen(true)}>
                <RiUserAddLine size={13} /> {t("addMemberBtn")}
              </Btn>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 52, borderRadius: "var(--r-sm)", background: "var(--bg-subtle)", animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line-1)" }}>
                {[t("colMember"), t("colRole"), t("colJoinedSince"), t("colStatus"), ""].map((h, i) => (
                  <th key={i} style={{ padding: "6px 10px", textAlign: "left", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ink-4)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Active members */}
              {filteredMembers.map((m) => {
                return (
                  <tr
                    key={m.id}
                    onClick={() => setSelected(m)}
                    style={{ borderBottom: "1px solid var(--line-1)", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "10px 10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Av src={m.image} name={m.name ?? m.email} seed={m.email} size={34} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name || t("noName")}</div>
                          <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "10px 10px", fontSize: 13, color: "var(--ink-2)" }}>{getRoleLabel(m.role)}</td>
                    <td style={{ padding: "10px 10px", fontSize: 12.5, color: "var(--ink-3)" }}>{fmtDate(m.createdAt)}</td>
                    <td style={{ padding: "10px 10px" }}>
                      <span style={{ background: "#D9ECD1", color: "#1F6A3A", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                        {t("statusActive")}
                      </span>
                    </td>
                    <td style={{ padding: "10px 10px", width: 36 }}>
                      <RiArrowRightSLine size={16} color="var(--ink-4)" />
                    </td>
                  </tr>
                );
              })}

              {/* Pending invitations */}
              {filteredInvitations.map((inv) => {
                const expires = inv.expiresAt ? new Date(inv.expiresAt) : null;
                const isExpired = expires && expires < new Date();
                return (
                  <tr key={`inv-${inv.id}`} style={{ borderBottom: "1px solid var(--line-1)" }}>
                    <td style={{ padding: "10px 10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--bg-subtle)", border: "1.5px dashed var(--line-1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <RiMailLine size={14} color="var(--ink-4)" />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{inv.email}</div>
                          <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>
                            {expires ? t("expires", { date: fmtDate(expires) }) : t("noExpiry")}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "10px 10px", fontSize: 13, color: "var(--ink-3)" }}>{getRoleLabel(inv.role)}</td>
                    <td style={{ padding: "10px 10px", fontSize: 12.5, color: "var(--ink-3)" }}>{fmtDate(inv.createdAt)}</td>
                    <td style={{ padding: "10px 10px" }}>
                      <span style={{ background: isExpired ? "#F3F4F6" : "#FEF3CD", color: isExpired ? "#6B7280" : "#8A6D00", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                        {isExpired ? t("statusExpired") : t("statusPending")}
                      </span>
                    </td>
                    <td style={{ padding: "10px 10px", width: 80 }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button title={t("resendBtn")} onClick={() => handleResendInv(inv.id, inv.email)} style={{ padding: 5, background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", borderRadius: 4 }}>
                          <RiRefreshLine size={14} />
                        </button>
                        <button title={t("cancelInviteBtn")} onClick={() => handleCancelInv(inv.id, inv.email)} style={{ padding: 5, background: "none", border: "none", cursor: "pointer", color: "#EF4444", borderRadius: 4 }}>
                          <RiCloseLine size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredMembers.length === 0 && filteredInvitations.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "40px 10px", color: "var(--ink-3)", fontSize: 13 }}>
                    {query ? t("emptySearch") : t("emptyNoMembers")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Member drawer */}
      {selected && (
        <MemberDrawer
          member={selected}
          roleLabel={getRoleLabel(selected.role)}
          onClose={() => setSelected(null)}
          onRemove={() => handleRemove(selected)}
          canManage={canManageTeam}
          locale={locale}
        />
      )}

      {/* Invite modal */}
      {inviteOpen && (
        <InviteModal
          roles={invitableRoles}
          rolesLoading={rolesLoading}
          onClose={() => setInviteOpen(false)}
          onInvite={handleInvite}
        />
      )}
    </div>
  );
}
