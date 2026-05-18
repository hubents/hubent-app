"use client";

import { useTranslations } from "next-intl";
import { Btn, Inp, Pill, PCard } from "@/components/ui/ds";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RiKeyLine,
  RiAddLine,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiEyeLine,
  RiEyeOffLine,
  RiArrowLeftSLine,
  RiCheckLine,
  RiRefreshLine,
  RiExternalLinkLine,
  RiTimeLine,
  RiShieldLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { useEffect, useState, useCallback } from "react";
import { Link } from "@/i18n/navigation";
import { appConfirm } from "@/lib/confirm";

interface ApiKeyItem {
  id: number;
  name: string;
  keyPrefix: string;
  scopes: string[];
  environment: string;
  rateLimit: number | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string | null;
  revokedAt: string | null;
}

interface ApiStats {
  active_keys: number;
  total_requests: number;
  error_requests: number;
  period_days: number;
}

const SCOPE_GROUPS = [
  { label: "Eventos", scopes: ["events:read", "events:write"] },
  { label: "Contactos", scopes: ["contacts:read", "contacts:write"] },
  { label: "Tareas", scopes: ["tasks:read", "tasks:write"] },
  { label: "Finanzas", scopes: ["finance:read", "finance:write"] },
  { label: "Invitados", scopes: ["guests:read", "guests:write"] },
  { label: "CRM", scopes: ["crm:read", "crm:write"] },
  { label: "Formularios", scopes: ["forms:read", "forms:write"] },
  { label: "Proveedores", scopes: ["vendors:read", "vendors:write"] },
  { label: "Templates", scopes: ["templates:read"] },
  { label: "Organizacion", scopes: ["organization:read"] },
  { label: "Webhooks", scopes: ["webhooks:manage"] },
];

export default function DevelopersPage() {
  const t = useTranslations("settingsSub");
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [stats, setStats] = useState<ApiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([]);
  const [newKeyEnvironment, setNewKeyEnvironment] = useState<"live" | "test">("live");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null);
  const [availableScopes, setAvailableScopes] = useState<string[]>([]);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/api-keys");
      const data = await res.json();
      if (data.success) {
        setKeys(data.data.keys);
        setStats(data.data.stats);
        if (data.data.available_scopes) {
          setAvailableScopes(data.data.available_scopes);
        }
      }
    } catch {
      toast.error(t("errorLoadingApiKeys"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast.error(t("nameRequired"));
      return;
    }
    if (newKeyScopes.length === 0) {
      toast.error(t("selectAtLeastOneScope"));
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName,
          scopes: newKeyScopes,
          environment: newKeyEnvironment,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRevealedKey(data.data.raw_key);
        toast.success(t("apiKeyCreated"));
        setShowCreateForm(false);
        setNewKeyName("");
        setNewKeyScopes([]);
        fetchKeys();
      } else {
        toast.error(data.error?.message || t("errorCreatingApiKey"));
      }
    } catch {
      toast.error(t("errorCreatingApiKey"));
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: number) => {
    if (!await appConfirm({ title: t("revokeApiKey"), description: t("cannotUndo"), variant: "destructive", confirmLabel: t("revoke") })) return;
    try {
      const res = await fetch(`/api/settings/api-keys/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success(t("apiKeyRevoked"));
        fetchKeys();
      } else {
        toast.error(data.error?.message || t("errorRevoking"));
      }
    } catch {
      toast.error(t("errorRevokingApiKey"));
    }
  };

  const copyToClipboard = async (text: string, keyId?: number) => {
    await navigator.clipboard.writeText(text);
    if (keyId) {
      setCopiedKeyId(keyId);
      setTimeout(() => setCopiedKeyId(null), 2000);
    }
    toast.success(t("copiedToClipboard"));
  };

  const toggleScope = (scope: string) => {
    setNewKeyScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const filteredScopeGroups = SCOPE_GROUPS
    .map((g) => ({
      ...g,
      scopes: availableScopes.length > 0
        ? g.scopes.filter((s) => availableScopes.includes(s))
        : g.scopes,
    }))
    .filter((g) => g.scopes.length > 0);

  const selectAllScopes = () => {
    const all = filteredScopeGroups.flatMap((g) => g.scopes);
    setNewKeyScopes(all);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <PageHeader back={{ href: "/dashboard/settings" }} />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PCard>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <RiKeyLine className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active_keys}</p>
                <p className="text-xs text-muted-foreground">{t("activeKeys")}</p>
              </div>
            </div>
          </PCard>
          <PCard>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <RiRefreshLine className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_requests.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{t("requests")} ({stats.period_days}d)</p>
              </div>
            </div>
          </PCard>
          <PCard>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <RiShieldLine className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.error_requests.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{t("errors")} ({stats.period_days}d)</p>
              </div>
            </div>
          </PCard>
        </div>
      )}

      {/* Revealed key banner */}
      {revealedKey && (
        <PCard className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <RiEyeLine className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-amber-800 dark:text-amber-200">{t("apiKeyCreatedCopyNow")}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">{t("apiKeyOneTimeWarning")}</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-amber-100 dark:bg-amber-900/50 px-3 py-2 rounded font-mono break-all flex-1">{revealedKey}</code>
                <Btn size="sm" variant="outline" onClick={() => copyToClipboard(revealedKey)}>
                  <RiFileCopyLine className="h-4 w-4" />
                </Btn>
              </div>
            </div>
            <Btn size="sm" variant="ghost" onClick={() => setRevealedKey(null)} className="shrink-0">
              <RiEyeOffLine className="h-4 w-4" />
            </Btn>
          </div>
        </PCard>
      )}

      {/* Create key form */}
      {showCreateForm ? (
        <PCard>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }}>{t("newApiKey")}</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>{t("newApiKeyDesc")}</div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("name")}</Label>
                <Inp
                  placeholder={t("keyNamePlaceholder")}
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("environment")}</Label>
                <div className="flex gap-2">
                  <Btn
                    size="sm"
                    variant={newKeyEnvironment === "live" ? "primary" : "outline"}
                    onClick={() => setNewKeyEnvironment("live")}
                  >
                    Live
                  </Btn>
                  <Btn
                    size="sm"
                    variant={newKeyEnvironment === "test" ? "primary" : "outline"}
                    onClick={() => setNewKeyEnvironment("test")}
                  >
                    Test
                  </Btn>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("scopes")}</Label>
                <Btn size="sm" variant="ghost" onClick={selectAllScopes} className="text-xs">
                  {t("selectAll")}
                </Btn>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredScopeGroups.map((group) => (
                  <div key={group.label} className="border rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{group.label}</p>
                    {group.scopes.map((scope) => (
                      <label key={scope} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={newKeyScopes.includes(scope)}
                          onCheckedChange={() => toggleScope(scope)}
                        />
                        <span className="font-mono text-xs">{scope}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Btn onClick={handleCreate} disabled={creating}>
                {creating ? t("creating") : t("createApiKey")}
              </Btn>
              <Btn variant="outline" onClick={() => setShowCreateForm(false)}>
                {t("cancel")}
              </Btn>
            </div>
          </div>
        </PCard>
      ) : (
        <Btn onClick={() => setShowCreateForm(true)}>
          <RiAddLine className="h-4 w-4 mr-2" />
          {t("newApiKey")}
        </Btn>
      )}

      {/* Keys list */}
      <PCard>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }}>API Keys</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>{t("apiKeysDesc")}</div>
        </div>
          {keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <RiKeyLine className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t("noApiKeys")}</p>
              <p className="text-xs mt-1">{t("noApiKeysDesc")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className={`border rounded-lg p-4 ${key.isActive ? "" : "opacity-60"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm">{key.name}</h3>
                        <Pill
                          style={{ fontSize: 10 }}
                          {...(!key.isActive ? { bg: "var(--bg-subtle)", color: "var(--ink-2)" } : {})}
                        >
                          {key.isActive ? t("active") : t("revoked")}
                        </Pill>
                        <Pill
                          style={{ fontSize: 10, border: "1px solid var(--line-strong)" }}
                          bg="transparent"
                        >
                          {key.environment}
                        </Pill>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-xs text-muted-foreground font-mono">{key.keyPrefix}...****</code>
                        <Btn
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(key.keyPrefix, key.id)}
                        >
                          {copiedKeyId === key.id ? (
                            <RiCheckLine className="h-3 w-3 text-green-500" />
                          ) : (
                            <RiFileCopyLine className="h-3 w-3" />
                          )}
                        </Btn>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {key.scopes.slice(0, 5).map((scope) => (
                          <Pill key={scope} style={{ fontSize: 10, border: "1px solid var(--line-strong)", fontFamily: "monospace" }} bg="transparent">
                            {scope}
                          </Pill>
                        ))}
                        {key.scopes.length > 5 && (
                          <Pill style={{ fontSize: 10, border: "1px solid var(--line-strong)" }} bg="transparent">
                            +{key.scopes.length - 5} {t("more")}
                          </Pill>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <RiTimeLine className="h-3 w-3" />
                          {t("created")}: {key.createdAt ? new Date(key.createdAt).toLocaleDateString() : "—"}
                        </span>
                        {key.lastUsedAt && (
                          <span>{t("lastUsed")}: {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                        )}
                        {key.rateLimit && <span>Rate limit: {key.rateLimit}/min</span>}
                      </div>
                    </div>
                    {key.isActive && (
                      <Btn
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                        onClick={() => handleRevoke(key.id)}
                      >
                        <RiDeleteBinLine className="h-4 w-4" />
                      </Btn>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
      </PCard>

      {/* Quick links */}
      <PCard>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }}>{t("resources")}</div>
        </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="/api/v1/openapi"
              target="_blank"
              className="flex items-center gap-2 border rounded-lg p-3 hover:bg-muted/50 transition-colors"
            >
              <RiExternalLinkLine className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">OpenAPI Spec</p>
                <p className="text-xs text-muted-foreground">{t("jsonSchemaComplete")}</p>
              </div>
            </a>
            <a
              href="/developers"
              target="_blank"
              className="flex items-center gap-2 border rounded-lg p-3 hover:bg-muted/50 transition-colors"
            >
              <RiExternalLinkLine className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t("documentation")}</p>
                <p className="text-xs text-muted-foreground">{t("developerPortal")}</p>
              </div>
            </a>
            <div className="flex items-center gap-2 border rounded-lg p-3">
              <RiShieldLine className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Base URL</p>
                <code className="text-xs text-muted-foreground">/api/v1</code>
              </div>
            </div>
          </div>
      </PCard>
    </div>
  );
}
