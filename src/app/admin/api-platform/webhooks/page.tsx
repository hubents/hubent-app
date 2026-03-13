"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RiCheckLine, RiCloseLine, RiTimeLine } from "@remixicon/react";
import { useEffect, useState, useCallback } from "react";

interface WebhookRow {
  id: number;
  url: string;
  events: string[];
  isActive: boolean;
  description: string | null;
  orgId: number;
  orgName: string;
  createdAt: string | null;
  deliveries30d: number;
  delivered30d: number;
  failed30d: number;
  pending30d: number;
  lastDelivery: string | null;
}

interface DeliveryRow {
  id: number;
  webhookId: number;
  eventType: string;
  status: string;
  responseCode: number | null;
  attempt: number;
  deliveredAt: string | null;
  createdAt: string | null;
  webhookUrl: string;
  orgName: string;
}

export default function ApiPlatformWebhooksPage() {
  const [webhooksData, setWebhooksData] = useState<WebhookRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/api-platform/webhooks");
      const json = await res.json();
      if (json.success) {
        setWebhooksData(json.data.webhooks);
        setDeliveries(json.data.recent_deliveries);
      }
    } catch {
      console.error("Failed to fetch webhooks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  const totalActive = webhooksData.filter((w) => w.isActive).length;
  const totalDeliveries = webhooksData.reduce((sum, w) => sum + w.deliveries30d, 0);
  const totalFailed = webhooksData.reduce((sum, w) => sum + w.failed30d, 0);
  const successRate = totalDeliveries > 0
    ? ((1 - totalFailed / totalDeliveries) * 100).toFixed(1) + "%"
    : "—";

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{totalActive}</p>
            <p className="text-xs text-muted-foreground">Webhooks activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{totalDeliveries.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Deliveries (30d)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-red-500">{totalFailed}</p>
            <p className="text-xs text-muted-foreground">Fallos (30d)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-green-600">{successRate}</p>
            <p className="text-xs text-muted-foreground">Tasa de exito</p>
          </CardContent>
        </Card>
      </div>

      {/* Webhooks list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhooks Configurados</CardTitle>
          <CardDescription>{webhooksData.length} webhooks en total</CardDescription>
        </CardHeader>
        <CardContent>
          {webhooksData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin webhooks configurados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4">Organizacion</th>
                    <th className="py-2 pr-4">URL</th>
                    <th className="py-2 pr-4 text-center">Eventos</th>
                    <th className="py-2 pr-4 text-center">Estado</th>
                    <th className="py-2 pr-4 text-right">Deliveries</th>
                    <th className="py-2 pr-4 text-right">Fallos</th>
                    <th className="py-2">Ultimo delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {webhooksData.map((wh) => (
                    <tr key={wh.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2.5 pr-4 text-xs">{wh.orgName}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs max-w-[250px] truncate">{wh.url}</td>
                      <td className="py-2.5 pr-4 text-center">
                        <Badge variant="secondary" className="text-[10px]">{wh.events.length} eventos</Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-center">
                        {wh.isActive ? (
                          <Badge className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Activo</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Inactivo</Badge>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono text-xs">{wh.deliveries30d}</td>
                      <td className="py-2.5 pr-4 text-right font-mono text-xs">
                        {wh.failed30d > 0 ? (
                          <span className="text-red-500">{wh.failed30d}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground">
                        {wh.lastDelivery ? new Date(wh.lastDelivery).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent deliveries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RiTimeLine className="h-4 w-4" /> Deliveries Recientes
          </CardTitle>
          <CardDescription>Ultimas 50 entregas de webhooks</CardDescription>
        </CardHeader>
        <CardContent>
          {deliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin deliveries registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4">Timestamp</th>
                    <th className="py-2 pr-4">Org</th>
                    <th className="py-2 pr-4">Evento</th>
                    <th className="py-2 pr-4 text-center">Status</th>
                    <th className="py-2 pr-4 text-center">Response</th>
                    <th className="py-2 pr-4 text-center">Intento</th>
                    <th className="py-2">URL</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((d) => (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                        {d.createdAt ? new Date(d.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
                      </td>
                      <td className="py-2 pr-4 text-xs">{d.orgName}</td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="text-[10px] font-mono">{d.eventType}</Badge>
                      </td>
                      <td className="py-2 pr-4 text-center">
                        {d.status === "delivered" ? (
                          <RiCheckLine className="h-4 w-4 text-green-500 inline" />
                        ) : d.status === "failed" ? (
                          <RiCloseLine className="h-4 w-4 text-red-500 inline" />
                        ) : (
                          <RiTimeLine className="h-4 w-4 text-amber-500 inline" />
                        )}
                      </td>
                      <td className="py-2 pr-4 text-center font-mono text-xs">
                        {d.responseCode ?? "—"}
                      </td>
                      <td className="py-2 pr-4 text-center text-xs">{d.attempt}</td>
                      <td className="py-2 font-mono text-[10px] text-muted-foreground max-w-[200px] truncate">{d.webhookUrl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
