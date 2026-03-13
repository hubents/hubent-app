"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState, useCallback } from "react";

interface LogRow {
  id: number;
  method: string;
  path: string;
  statusCode: number;
  responseTimeMs: number | null;
  ipAddress: string | null;
  requestId: string;
  errorCode: string | null;
  createdAt: string | null;
  keyPrefix: string;
  keyName: string;
  orgName: string;
  orgId: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_COLORS: Record<string, string> = {
  "2": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "4": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "5": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const METHOD_COLORS: Record<string, string> = {
  GET: "text-blue-600",
  POST: "text-green-600",
  PATCH: "text-amber-600",
  DELETE: "text-red-600",
  PUT: "text-purple-600",
};

export default function ApiPlatformLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (statusFilter) params.set("status", statusFilter);
      if (methodFilter) params.set("method", methodFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/api-platform/logs?${params}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data.logs);
        setPagination(json.data.pagination);
      }
    } catch {
      console.error("Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, methodFilter, search]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  const getStatusColor = (code: number) => {
    const prefix = String(code).charAt(0);
    return STATUS_COLORS[prefix] ?? "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Todos los status</option>
          <option value="2xx">2xx Success</option>
          <option value="4xx">4xx Client Error</option>
          <option value="5xx">5xx Server Error</option>
        </select>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Todos los metodos</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
        <input
          type="text"
          placeholder="Buscar por path o request_id..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm min-w-[250px]"
        />
        <span className="text-xs text-muted-foreground self-center ml-auto">
          {pagination.total.toLocaleString()} registros
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin logs encontrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 px-4">Timestamp</th>
                    <th className="py-2 px-3">Org</th>
                    <th className="py-2 px-3">Key</th>
                    <th className="py-2 px-3">Method</th>
                    <th className="py-2 px-3">Path</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right">Time</th>
                    <th className="py-2 px-3">IP</th>
                    <th className="py-2 px-4">Request ID</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
                      </td>
                      <td className="py-2 px-3 text-xs max-w-[120px] truncate">{log.orgName}</td>
                      <td className="py-2 px-3 font-mono text-[10px] text-muted-foreground">{log.keyPrefix}...</td>
                      <td className="py-2 px-3">
                        <span className={`font-mono text-xs font-medium ${METHOD_COLORS[log.method] ?? ""}`}>{log.method}</span>
                      </td>
                      <td className="py-2 px-3 font-mono text-xs max-w-[200px] truncate">{log.path}</td>
                      <td className="py-2 px-3">
                        <Badge className={`text-[10px] ${getStatusColor(log.statusCode)}`}>{log.statusCode}</Badge>
                      </td>
                      <td className="py-2 px-3 text-right text-xs text-muted-foreground">
                        {log.responseTimeMs != null ? `${log.responseTimeMs}ms` : "—"}
                      </td>
                      <td className="py-2 px-3 text-xs text-muted-foreground font-mono">{log.ipAddress ?? "—"}</td>
                      <td className="py-2 px-4 font-mono text-[10px] text-muted-foreground max-w-[120px] truncate">{log.requestId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Pagina {pagination.page} de {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchData(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="h-8 px-3 text-xs border rounded-md bg-background hover:bg-muted disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => fetchData(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="h-8 px-3 text-xs border rounded-md bg-background hover:bg-muted disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
