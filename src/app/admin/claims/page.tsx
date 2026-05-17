"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search, Phone, Mail, Building2, Clock, CheckCircle,
  AlertTriangle, RefreshCw, ChevronLeft, ChevronRight, UserCheck,
} from "lucide-react";

interface Claim {
  id: number;
  providerName: string;
  email: string;
  emailDomain: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  claimedAt: string | null;
  plannerOrgId: number;
  plannerOrgName: string;
  plannerOrgType: string;
  token: string;
  phone: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string; size?: number }> }> = {
  pending: { label: "Pendiente", color: "bg-blue-100 text-blue-700", icon: Clock },
  needs_manual_verification: { label: "Verificación manual", color: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  claimed: { label: "Reclamado", color: "bg-green-100 text-green-700", icon: CheckCircle },
  expired: { label: "Expirado", color: "bg-gray-100 text-gray-500", icon: Clock },
};

export default function AdminClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const limit = 50;

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/claims?${params}`);
      const data = await res.json();
      if (data.success) {
        setClaims(data.data?.data ?? []);
        setTotal(data.data?.meta?.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => { setPage(1); }, [search, status]);
  useEffect(() => {
    const t = setTimeout(fetchClaims, 300);
    return () => clearTimeout(t);
  }, [fetchClaims]);

  const totalPages = Math.ceil(total / limit);
  const pendingManual = claims.filter((c) => c.status === "needs_manual_verification").length;

  const handleAction = async (id: number, action: "resolve" | "expire") => {
    setActioningId(id);
    try {
      const res = await fetch(`/api/admin/claims/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) fetchClaims();
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">
            Reclamaciones de perfil
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Seguimiento de invitaciones enviadas a proveedores para que verifiquen su perfil
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchClaims} disabled={loading}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: total, color: "text-[var(--foreground)]" },
          { label: "Pendientes", value: claims.filter((c) => c.status === "pending").length, color: "text-blue-600" },
          { label: "Verif. manual", value: pendingManual, color: "text-amber-600" },
          { label: "Reclamados", value: claims.filter((c) => c.status === "claimed").length, color: "text-green-600" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
              <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{k.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alert for manual verifications */}
      {pendingManual > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <strong>{pendingManual} proveedor{pendingManual > 1 ? "es" : ""}</strong> requieren verificación manual por teléfono o código SMS. Contactar a través del número de la ficha.
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar proveedor o email..."
            className="pl-8 h-8 text-sm"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-[var(--border)] rounded-md px-3 h-8 text-sm bg-white text-[var(--foreground)]"
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="needs_manual_verification">Verificación manual</option>
          <option value="claimed">Reclamado</option>
          <option value="expired">Expirado</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                  <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)] text-xs uppercase tracking-wide">Proveedor</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)] text-xs uppercase tracking-wide">Contacto</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)] text-xs uppercase tracking-wide">Creado por</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)] text-xs uppercase tracking-wide">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)] text-xs uppercase tracking-wide">Fechas</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-[var(--border)]">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-[var(--muted)] rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : claims.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-[var(--muted-foreground)] text-sm">
                      No se encontraron reclamaciones
                    </td>
                  </tr>
                ) : (
                  claims.map((claim) => {
                    const cfg = STATUS_CONFIG[claim.status] ?? STATUS_CONFIG.expired;
                    const StatusIcon = cfg.icon;
                    const isExpired = claim.status === "pending" && new Date() > new Date(claim.expiresAt);
                    return (
                      <tr key={claim.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/20">
                        <td className="px-4 py-3">
                          <div className="font-medium text-[var(--foreground)]">{claim.providerName}</div>
                          {claim.emailDomain && (
                            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">@{claim.emailDomain}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-[var(--foreground)]">
                            <Mail size={12} className="text-[var(--muted-foreground)]" />
                            <span className="text-xs">{claim.email}</span>
                          </div>
                          {claim.phone && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <Phone size={12} className="text-[var(--muted-foreground)]" />
                              <span className="text-xs text-[var(--foreground)]">{claim.phone}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Building2 size={12} className="text-[var(--muted-foreground)]" />
                            <span className="text-xs text-[var(--foreground)]">{claim.plannerOrgName}</span>
                          </div>
                          <div className="text-xs text-[var(--muted-foreground)] mt-0.5 capitalize">
                            {claim.plannerOrgType === "tenant" ? "Planner" : "Proveedor"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs px-2 py-0.5 ${isExpired ? "bg-gray-100 text-gray-500" : cfg.color} border-0`}>
                            <StatusIcon size={11} className="mr-1" />
                            {isExpired ? "Expirado" : cfg.label}
                          </Badge>
                          {claim.status === "needs_manual_verification" && (
                            <div className="mt-1.5 flex flex-col gap-1">
                              {claim.phone && (
                                <Badge className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border-amber-200">
                                  <Phone size={10} className="mr-1" /> {claim.phone}
                                </Badge>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs text-green-700 border-green-200 hover:bg-green-50"
                                disabled={actioningId === claim.id}
                                onClick={() => handleAction(claim.id, "resolve")}
                              >
                                <CheckCircle size={11} className="mr-1" />
                                {actioningId === claim.id ? "..." : "Marcar verificado"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs text-gray-500 hover:text-red-600"
                                disabled={actioningId === claim.id}
                                onClick={() => handleAction(claim.id, "expire")}
                              >
                                Expirar
                              </Button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                          <div>Creado: {new Date(claim.createdAt).toLocaleDateString("es")}</div>
                          {claim.claimedAt ? (
                            <div className="text-green-600 mt-0.5 flex items-center gap-1">
                              <UserCheck size={11} /> {new Date(claim.claimedAt).toLocaleDateString("es")}
                            </div>
                          ) : (
                            <div className="mt-0.5">Expira: {new Date(claim.expiresAt).toLocaleDateString("es")}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
              <span className="text-xs text-[var(--muted-foreground)]">
                {total} resultados · pág. {page} de {totalPages}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft size={13} />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight size={13} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
