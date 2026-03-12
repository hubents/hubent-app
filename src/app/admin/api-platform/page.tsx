"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiKeyLine,
  RiRefreshLine,
  RiErrorWarningLine,
  RiBarChartLine,
  RiBuilding2Line,
  RiTimeLine,
  RiGlobalLine,
} from "@remixicon/react";
import { useEffect, useState, useCallback } from "react";

interface PlatformData {
  keys: {
    total: number;
    active: number;
    revoked: number;
    by_environment: Record<string, number>;
  };
  requests: {
    total_30d: number;
    errors_30d: number;
    error_rate: string;
    daily_volume: { date: string; count: number }[];
  };
  top_organizations: { organizationId: number; orgName: string; keyCount: number }[];
  top_endpoints: { endpoint: string; method: string; count: number }[];
  recent_keys: {
    id: number;
    name: string;
    keyPrefix: string;
    environment: string;
    isActive: boolean;
    organizationId: number;
    orgName: string;
    createdAt: string | null;
    lastUsedAt: string | null;
  }[];
}

export default function ApiPlatformPage() {
  const [data, setData] = useState<PlatformData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/api-platform");
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      console.error("Failed to fetch API platform data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) return <div className="p-6">Error cargando datos</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">API Platform</h1>
        <p className="text-sm text-muted-foreground">Monitoreo global de la API publica de HubEnts</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><RiKeyLine className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{data.keys.active}</p>
                <p className="text-xs text-muted-foreground">Keys activas ({data.keys.total} total)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><RiRefreshLine className="h-5 w-5 text-blue-500" /></div>
              <div>
                <p className="text-2xl font-bold">{data.requests.total_30d.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Requests (30d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10"><RiErrorWarningLine className="h-5 w-5 text-red-500" /></div>
              <div>
                <p className="text-2xl font-bold">{data.requests.error_rate}</p>
                <p className="text-xs text-muted-foreground">Error rate ({data.requests.errors_30d} errors)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><RiGlobalLine className="h-5 w-5 text-green-500" /></div>
              <div>
                <p className="text-2xl font-bold">{data.keys.by_environment?.live ?? 0}</p>
                <p className="text-xs text-muted-foreground">Live / {data.keys.by_environment?.test ?? 0} Test</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top organizations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RiBuilding2Line className="h-4 w-4" /> Top Organizaciones
            </CardTitle>
            <CardDescription>Por cantidad de API keys activas</CardDescription>
          </CardHeader>
          <CardContent>
            {data.top_organizations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {data.top_organizations.map((org) => (
                  <div key={org.organizationId} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <span className="text-sm">{org.orgName}</span>
                    <Badge variant="secondary">{org.keyCount} keys</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top endpoints */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RiBarChartLine className="h-4 w-4" /> Top Endpoints
            </CardTitle>
            <CardDescription>Mas utilizados (30d)</CardDescription>
          </CardHeader>
          <CardContent>
            {data.top_endpoints.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {data.top_endpoints.map((ep, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-[10px] shrink-0 font-mono">{ep.method}</Badge>
                      <span className="text-xs font-mono truncate">{ep.endpoint}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">{ep.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily volume */}
      {data.requests.daily_volume.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Volumen Diario (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-32">
              {data.requests.daily_volume.map((day, i) => {
                const max = Math.max(...data.requests.daily_volume.map((d) => d.count), 1);
                const height = (day.count / max) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">{day.count}</span>
                    <div className="w-full bg-primary/20 rounded-t" style={{ height: `${Math.max(height, 2)}%` }}>
                      <div className="w-full h-full bg-primary rounded-t" />
                    </div>
                    <span className="text-[9px] text-muted-foreground">{new Date(day.date).toLocaleDateString("es", { weekday: "short" })}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent keys */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RiTimeLine className="h-4 w-4" /> Keys Recientes
          </CardTitle>
          <CardDescription>Ultimas API keys creadas en la plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-4">Org</th>
                  <th className="py-2 pr-4">Nombre</th>
                  <th className="py-2 pr-4">Prefix</th>
                  <th className="py-2 pr-4">Env</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-4">Creada</th>
                  <th className="py-2">Ultimo uso</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_keys.map((key) => (
                  <tr key={key.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 max-w-37.5 truncate">{key.orgName}</td>
                    <td className="py-2 pr-4">{key.name}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{key.keyPrefix}...</td>
                    <td className="py-2 pr-4">
                      <Badge variant="outline" className="text-[10px]">{key.environment}</Badge>
                    </td>
                    <td className="py-2 pr-4">
                      <Badge variant={key.isActive ? "default" : "secondary"} className="text-[10px]">
                        {key.isActive ? "Activa" : "Revocada"}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">
                      {key.createdAt ? new Date(key.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Nunca"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
