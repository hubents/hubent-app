"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Mail,
  Shield,
  Calendar,
  Building2,
  Store,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface UserDetail {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  emailVerified: string | null;
  status: string;
  suspendedAt: string | null;
  suspendedBy: string | null;
  suspendedReason: string | null;
  onboardingCompleted: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  isAdmin: boolean;
  adminLevel: string | null;
  organizations: {
    id: number;
    name: string;
    slug: string;
    logo: string | null;
    orgType: string;
    orgStatus: string;
    role: string;
    joinedAt: string | null;
  }[];
}

interface UserDetailDrawerProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ORG_TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof Building2 }> = {
  tenant: { label: "Planificador", color: "bg-blue-500/10 text-blue-600", icon: Building2 },
  provider: { label: "Proveedor", color: "bg-purple-500/10 text-purple-600", icon: Store },
  client: { label: "Cliente", color: "bg-gray-500/10 text-gray-600", icon: Users },
};

const ORG_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "Activo", color: "bg-green-500/10 text-green-600" },
  suspended: { label: "Suspendido", color: "bg-yellow-500/10 text-yellow-600" },
  deleted: { label: "Eliminado", color: "bg-red-500/10 text-red-600" },
};

export function UserDetailDrawer({
  userId,
  open,
  onOpenChange,
}: UserDetailDrawerProps) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && userId) {
      fetchUserDetail();
    } else {
      setUser(null);
      setError(null);
    }
  }, [open, userId]);

  const fetchUserDetail = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al cargar usuario");
      }

      setUser(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("es", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLevelLabel = (level: string | null) => {
    switch (level) {
      case "super_admin":
        return "Super Admin";
      case "support":
        return "Soporte";
      default:
        return level || "-";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-5xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detalles del Usuario</SheetTitle>
        </SheetHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600">
            {error}
          </div>
        )}

        {user && !loading && (
          <div className="space-y-6 px-4 py-4">
            {/* Header with avatar */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name || ""}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <Users className="h-8 w-8 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold truncate">
                  {user.name || "Sin nombre"}
                </h3>
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {user.status === "suspended" ? (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Suspendido
                    </Badge>
                  ) : (
                    <Badge variant="default" className="gap-1 bg-green-500/10 text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Activo
                    </Badge>
                  )}
                  {user.emailVerified ? (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Verificado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      Pendiente
                    </Badge>
                  )}
                  {user.isAdmin && (
                    <Badge className="gap-1 bg-red-500/10 text-red-500">
                      <Shield className="h-3 w-3" />
                      {getLevelLabel(user.adminLevel)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Suspension info */}
            {user.status === "suspended" && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-600">Usuario suspendido</p>
                    {user.suspendedReason && (
                      <p className="text-sm text-red-600/80 mt-1">
                        Razón: {user.suspendedReason}
                      </p>
                    )}
                    <p className="text-sm text-red-600/60 mt-1">
                      Suspendido el {formatDate(user.suspendedAt)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">ID</p>
                <p className="font-mono text-sm">{user.id}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Onboarding</p>
                <p className="text-sm">
                  {user.onboardingCompleted ? "Completado" : "Pendiente"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Registrado</p>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatDate(user.createdAt)}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Última actualización</p>
                <p className="text-sm">{formatDate(user.updatedAt)}</p>
              </div>
              {user.emailVerified && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Email verificado</p>
                  <p className="text-sm">{formatDate(user.emailVerified)}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Organizations */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Organizaciones ({user.organizations.length})
              </h4>
              {user.organizations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Este usuario no pertenece a ninguna organización
                </p>
              ) : (
                <div className="space-y-2">
                  {user.organizations.map((org) => {
                    const typeConfig = ORG_TYPE_CONFIG[org.orgType] || ORG_TYPE_CONFIG.tenant;
                    const statusConfig = ORG_STATUS_CONFIG[org.orgStatus] || ORG_STATUS_CONFIG.active;
                    const TypeIcon = typeConfig.icon;
                    return (
                      <div
                        key={org.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                            {org.logo ? (
                              <img
                                src={org.logo}
                                alt={org.name}
                                className="w-10 h-10 object-cover"
                              />
                            ) : (
                              <TypeIcon className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <Link
                              href={`/admin/tenants/${org.id}`}
                              className="font-medium hover:underline inline-flex items-center gap-1"
                            >
                              {org.name}
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-muted-foreground">/{org.slug}</p>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${typeConfig.color}`}>
                                {typeConfig.label}
                              </span>
                              {org.orgStatus !== "active" && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusConfig.color}`}>
                                  {statusConfig.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">{org.role}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Desde {formatDate(org.joinedAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
