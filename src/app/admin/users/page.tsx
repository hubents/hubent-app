"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NumericPagination } from "@/components/ui/numeric-pagination";
import {
  Users,
  Search,
  Shield,
  Mail,
  UserPlus,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { UserActionsDropdown } from "@/components/admin/user-actions-dropdown";
import { UserDetailDrawer } from "@/components/admin/user-detail-drawer";
import { EditUserDrawer } from "@/components/admin/edit-user-drawer";
import { Toaster } from "sonner";

interface UserOrg {
  id: number;
  name: string;
  orgType: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  emailVerified: string | null;
  createdAt?: string;
  isAdmin: boolean;
  adminLevel?: string | null;
  status?: string;
  organizations: UserOrg[];
}

interface PendingAdminInvitation {
  id: number;
  email: string;
  level: string;
  createdAt: string;
  expiresAt: string;
}

interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  globalTotal: number;
  adminCount: number;
  verifiedCount: number;
  pendingCount: number;
  suspendedCount: number;
  noOrgCount: number;
}

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingAdminInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<Meta>({
    page: 1, limit: 50, total: 0, totalPages: 0,
    globalTotal: 0, adminCount: 0, verifiedCount: 0,
    pendingCount: 0, suspendedCount: 0, noOrgCount: 0,
  });

  // Server-side filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [adminFilter, setAdminFilter] = useState("");
  const [orgTypeFilter, setOrgTypeFilter] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 350);
  };

  // Invite admin state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", level: "support" });
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Detail/Edit drawers
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams({ page: page.toString() });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter) params.set("status", statusFilter);
    if (verifiedFilter) params.set("verified", verifiedFilter);
    if (adminFilter) params.set("admin", adminFilter);
    if (orgTypeFilter) params.set("orgType", orgTypeFilter);
    return params;
  }, [page, debouncedSearch, statusFilter, verifiedFilter, adminFilter, orgTypeFilter]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?${buildParams()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setPendingInvitations(data.pendingInvitations || []);
        if (data.meta) setMeta(data.meta);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, verifiedFilter, adminFilter, orgTypeFilter]);

  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteError("");

    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al enviar invitación");
      }

      setInviteSuccess(true);
      fetchData();

      setTimeout(() => {
        setInviteOpen(false);
        setInviteSuccess(false);
        setInviteForm({ email: "", level: "support" });
      }, 2000);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Error al invitar");
    } finally {
      setInviting(false);
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case "super_admin": return "Super Admin";
      case "support": return "Soporte";
      default: return level;
    }
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("");
    setVerifiedFilter("");
    setAdminFilter("");
    setOrgTypeFilter("");
  };

  const hasActiveFilters = debouncedSearch || statusFilter || verifiedFilter || adminFilter || orgTypeFilter;

  const statCards = [
    {
      label: "Total usuarios",
      value: meta.globalTotal,
      icon: Users,
      color: "bg-blue-500/10 text-blue-500",
      onClick: clearFilters,
      active: !hasActiveFilters,
    },
    {
      label: "Admins",
      value: meta.adminCount,
      icon: Shield,
      color: "bg-red-500/10 text-red-500",
      onClick: () => { clearFilters(); setAdminFilter("admin"); },
      active: adminFilter === "admin" && !statusFilter && !verifiedFilter && !orgTypeFilter,
    },
    {
      label: "Verificados",
      value: meta.verifiedCount,
      icon: CheckCircle2,
      color: "bg-green-500/10 text-green-500",
      onClick: () => { clearFilters(); setVerifiedFilter("verified"); },
      active: verifiedFilter === "verified" && !statusFilter && !adminFilter && !orgTypeFilter,
    },
    {
      label: "Suspendidos",
      value: meta.suspendedCount,
      icon: XCircle,
      color: "bg-yellow-500/10 text-yellow-600",
      onClick: () => { clearFilters(); setStatusFilter("suspended"); },
      active: statusFilter === "suspended" && !verifiedFilter && !adminFilter && !orgTypeFilter,
    },
    {
      label: "Sin organización",
      value: meta.noOrgCount,
      icon: AlertTriangle,
      color: "bg-orange-500/10 text-orange-500",
      onClick: () => { clearFilters(); setOrgTypeFilter("none"); },
      active: orgTypeFilter === "none" && !statusFilter && !verifiedFilter && !adminFilter,
    },
  ];

  if (loading && users.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-400" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-[var(--muted-foreground)]">
            Todos los usuarios registrados en la plataforma
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {meta.globalTotal} usuarios
          </Badge>
          <Button className="gap-2 bg-red-600 hover:bg-red-700" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Invitar Admin
          </Button>
          <Sheet open={inviteOpen} onOpenChange={setInviteOpen}>
            <SheetContent className="sm:max-w-2xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Invitar Administrador</SheetTitle>
                <SheetDescription>
                  Envía una invitación para unirse como administrador de la plataforma
                </SheetDescription>
              </SheetHeader>

              {inviteSuccess ? (
                <div className="py-8 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-green-500/10">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  <p className="font-medium">Invitación enviada!</p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Se ha enviado un email a {inviteForm.email}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleInviteAdmin} className="space-y-4 px-4 py-4">
                  {inviteError && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
                      {inviteError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@ejemplo.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="level">Nivel de acceso</Label>
                    <Select
                      value={inviteForm.level}
                      onValueChange={(value) => setInviteForm({ ...inviteForm, level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un nivel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">
                          <div>
                            <p className="font-medium">Super Administrador</p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              Control total de la plataforma
                            </p>
                          </div>
                        </SelectItem>
                        <SelectItem value="support">
                          <div>
                            <p className="font-medium">Soporte</p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              Ver tenants y usuarios, sin modificar
                            </p>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm">
                    <p className="font-medium">Acceso de administrador</p>
                    <p className="text-xs mt-1">
                      Esta persona tendrá acceso al panel de administración de la plataforma.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={inviting}>
                      {inviting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Enviando...
                        </>
                      ) : (
                        "Enviar invitación"
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className={`cursor-pointer transition-all hover:shadow-md ${stat.active ? "ring-2 ring-primary" : ""}`}
              onClick={stat.onClick}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stat.value}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pending Admin Invitations */}
      {pendingInvitations.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Invitaciones de Admin Pendientes
            </h3>
            <div className="space-y-3">
              {pendingInvitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--muted)]">
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-red-400" />
                    <div>
                      <p className="font-medium">{inv.email}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Expira: {new Date(inv.expiresAt).toLocaleDateString("es")}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-red-500/10 text-red-500">{getLevelLabel(inv.level)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
              <Input
                placeholder="Buscar por nombre o email..."
                className="pl-10"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>

            <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="suspended">Suspendido</SelectItem>
              </SelectContent>
            </Select>

            <Select value={verifiedFilter || "all"} onValueChange={(v) => setVerifiedFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Verificación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="verified">Verificado</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
              </SelectContent>
            </Select>

            <Select value={adminFilter || "all"} onValueChange={(v) => setAdminFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">Usuario</SelectItem>
              </SelectContent>
            </Select>

            <Select value={orgTypeFilter || "all"} onValueChange={(v) => setOrgTypeFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Organización" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="tenant">Planificador</SelectItem>
                <SelectItem value="provider">Proveedor</SelectItem>
                <SelectItem value="none">Sin organización</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-[var(--muted-foreground)]">
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-4" />
              <h3 className="font-medium mb-2">No hay usuarios</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                {hasActiveFilters ? "No se encontraron resultados con los filtros actuales" : "Aún no se han registrado usuarios"}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">Usuario</th>
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">Email</th>
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">Estado</th>
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">Rol</th>
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">Organización</th>
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">Registrado</th>
                  <th className="text-right p-4 font-medium text-[var(--muted-foreground)]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center overflow-hidden">
                          {user.image ? (
                            <img src={user.image} alt={user.name || ""} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <Users className="h-5 w-5 text-[var(--primary)]" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{user.name || "Sin nombre"}</p>
                          <p className="text-xs text-[var(--muted-foreground)] font-mono">{user.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-[var(--muted-foreground)]" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {user.status === "suspended" ? (
                          <Badge variant="destructive" className="gap-1 w-fit">
                            <XCircle className="h-3 w-3" />
                            Suspendido
                          </Badge>
                        ) : user.emailVerified ? (
                          <Badge variant="default" className="bg-green-500/10 text-green-500 w-fit">Verificado</Badge>
                        ) : (
                          <Badge variant="secondary" className="w-fit">Pendiente</Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {user.isAdmin ? (
                        <Badge className="gap-1 bg-red-500/10 text-red-500">
                          <Shield className="h-3 w-3" />
                          {getLevelLabel(user.adminLevel || "support")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Usuario</Badge>
                      )}
                    </td>
                    <td className="p-4">
                      {user.organizations.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {user.organizations.map((org) => (
                            <Link
                              key={org.id}
                              href={`/admin/tenants/${org.id}`}
                              className="text-sm hover:underline inline-flex items-center gap-1"
                            >
                              {org.name}
                              <span className={`text-[10px] px-1 py-0.5 rounded ${
                                org.orgType === "provider" ? "bg-purple-500/10 text-purple-600" : "bg-blue-500/10 text-blue-600"
                              }`}>
                                {org.orgType === "provider" ? "Proveedor" : "Planner"}
                              </span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-[var(--muted-foreground)]">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString("es-AR") : "-"}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end">
                        <UserActionsDropdown
                          user={user}
                          currentUserId={session?.user?.id || ""}
                          onViewDetails={(u) => setDetailUserId(u.id)}
                          onEdit={(u) => setEditUser(u as User)}
                          onRefresh={fetchData}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Drawers */}
      <UserDetailDrawer
        userId={detailUserId}
        open={!!detailUserId}
        onOpenChange={(open) => !open && setDetailUserId(null)}
      />

      <EditUserDrawer
        user={editUser}
        open={!!editUser}
        onOpenChange={(open) => !open && setEditUser(null)}
        onSuccess={fetchData}
      />

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {((meta.page - 1) * meta.limit) + 1}–{Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
          </p>
          <NumericPagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  );
}
