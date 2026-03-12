"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import Link from "next/link";

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
      toast.error("Error al cargar API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    if (newKeyScopes.length === 0) {
      toast.error("Selecciona al menos un scope");
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
        toast.success("API key creada. Copia la key ahora.");
        setShowCreateForm(false);
        setNewKeyName("");
        setNewKeyScopes([]);
        fetchKeys();
      } else {
        toast.error(data.error?.message || "Error al crear API key");
      }
    } catch {
      toast.error("Error al crear API key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: number) => {
    if (!confirm("Revocar esta API key? Esta accion no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/settings/api-keys/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("API key revocada");
        fetchKeys();
      } else {
        toast.error(data.error?.message || "Error al revocar");
      }
    } catch {
      toast.error("Error al revocar API key");
    }
  };

  const copyToClipboard = async (text: string, keyId?: number) => {
    await navigator.clipboard.writeText(text);
    if (keyId) {
      setCopiedKeyId(keyId);
      setTimeout(() => setCopiedKeyId(null), 2000);
    }
    toast.success("Copiado al portapapeles");
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
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings" className="text-muted-foreground hover:text-foreground">
          <RiArrowLeftSLine className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Developer Settings</h1>
          <p className="text-sm text-muted-foreground">Gestiona API keys para acceder a la API publica de HubEnts</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <RiKeyLine className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active_keys}</p>
                  <p className="text-xs text-muted-foreground">Keys activas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <RiRefreshLine className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_requests.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Requests ({stats.period_days}d)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <RiShieldLine className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.error_requests.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Errores ({stats.period_days}d)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revealed key banner */}
      {revealedKey && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <RiEyeLine className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-amber-800 dark:text-amber-200">API Key creada — copia ahora</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">No podras ver esta key de nuevo.</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-amber-100 dark:bg-amber-900/50 px-3 py-2 rounded font-mono break-all flex-1">{revealedKey}</code>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(revealedKey)}>
                    <RiFileCopyLine className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setRevealedKey(null)} className="shrink-0">
                <RiEyeOffLine className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create key form */}
      {showCreateForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nueva API Key</CardTitle>
            <CardDescription>Crea una nueva key para acceder a la API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  placeholder="Mi aplicacion, CI/CD, MCP..."
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Entorno</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={newKeyEnvironment === "live" ? "default" : "outline"}
                    onClick={() => setNewKeyEnvironment("live")}
                  >
                    Live
                  </Button>
                  <Button
                    size="sm"
                    variant={newKeyEnvironment === "test" ? "default" : "outline"}
                    onClick={() => setNewKeyEnvironment("test")}
                  >
                    Test
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Scopes (permisos)</Label>
                <Button size="sm" variant="ghost" onClick={selectAllScopes} className="text-xs">
                  Seleccionar todos
                </Button>
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
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? "Creando..." : "Crear API Key"}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setShowCreateForm(true)}>
          <RiAddLine className="h-4 w-4 mr-2" />
          Nueva API Key
        </Button>
      )}

      {/* Keys list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">API Keys</CardTitle>
          <CardDescription>Keys activas y revocadas de tu organizacion</CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <RiKeyLine className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay API keys creadas</p>
              <p className="text-xs mt-1">Crea una key para empezar a usar la API</p>
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
                        <Badge variant={key.isActive ? "default" : "secondary"} className="text-[10px]">
                          {key.isActive ? "Activa" : "Revocada"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {key.environment}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-xs text-muted-foreground font-mono">{key.keyPrefix}...****</code>
                        <Button
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
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {key.scopes.slice(0, 5).map((scope) => (
                          <Badge key={scope} variant="outline" className="text-[10px] font-mono">
                            {scope}
                          </Badge>
                        ))}
                        {key.scopes.length > 5 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{key.scopes.length - 5} mas
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <RiTimeLine className="h-3 w-3" />
                          Creada: {key.createdAt ? new Date(key.createdAt).toLocaleDateString() : "—"}
                        </span>
                        {key.lastUsedAt && (
                          <span>Ultimo uso: {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                        )}
                        {key.rateLimit && <span>Rate limit: {key.rateLimit}/min</span>}
                      </div>
                    </div>
                    {key.isActive && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                        onClick={() => handleRevoke(key.id)}
                      >
                        <RiDeleteBinLine className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recursos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="/api/v1/openapi"
              target="_blank"
              className="flex items-center gap-2 border rounded-lg p-3 hover:bg-muted/50 transition-colors"
            >
              <RiExternalLinkLine className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">OpenAPI Spec</p>
                <p className="text-xs text-muted-foreground">JSON schema completo</p>
              </div>
            </a>
            <a
              href="/developers"
              target="_blank"
              className="flex items-center gap-2 border rounded-lg p-3 hover:bg-muted/50 transition-colors"
            >
              <RiExternalLinkLine className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Documentacion</p>
                <p className="text-xs text-muted-foreground">Portal de desarrolladores</p>
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
        </CardContent>
      </Card>
    </div>
  );
}
