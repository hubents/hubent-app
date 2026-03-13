"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState, useCallback } from "react";

interface OrgRow {
  organizationId: number;
  orgName: string;
  orgType: string;
  plan: string;
  activeKeys: number;
  totalKeys: number;
  webhooks: number;
  requests30d: number;
  errors30d: number;
  lastUsedAt: string | null;
}

export default function ApiPlatformOrganizationsPage() {
  const [data, setData] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/api-platform/organizations");
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      console.error("Failed to fetch organizations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Organizaciones con API Keys</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Ninguna organizacion ha creado API keys todavia.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-4">Organizacion</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">Plan</th>
                  <th className="py-2 pr-4 text-center">Keys activas</th>
                  <th className="py-2 pr-4 text-center">Webhooks</th>
                  <th className="py-2 pr-4 text-right">Requests 30d</th>
                  <th className="py-2 pr-4 text-right">Errors 30d</th>
                  <th className="py-2 text-right">Ultimo uso</th>
                </tr>
              </thead>
              <tbody>
                {data.map((org) => (
                  <tr key={org.organizationId} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-2.5 pr-4 font-medium">{org.orgName}</td>
                    <td className="py-2.5 pr-4">
                      <Badge variant="outline" className="text-[10px] capitalize">{org.orgType}</Badge>
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge variant="secondary" className="text-[10px]">{org.plan}</Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-center">
                      <span className="font-medium">{org.activeKeys}</span>
                      <span className="text-muted-foreground text-xs"> / {org.totalKeys}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-center">{org.webhooks}</td>
                    <td className="py-2.5 pr-4 text-right font-mono text-xs">
                      {org.requests30d.toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono text-xs">
                      {org.errors30d > 0 ? (
                        <span className="text-red-500">{org.errors30d.toLocaleString()}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right text-xs text-muted-foreground">
                      {org.lastUsedAt ? new Date(org.lastUsedAt).toLocaleDateString() : "Nunca"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
