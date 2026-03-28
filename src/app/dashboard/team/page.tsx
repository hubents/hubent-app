"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EventScopedGuard } from "@/components/layout/event-scoped-guard";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { handleBillingError } from "@/lib/billing-errors";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RiUserAddLine,
  RiMailLine,
  RiTimeLine,
  RiTeamLine,
  RiDeleteBinLine,
  RiMoreLine,
  RiRefreshLine,
  RiCloseLine,
} from "@remixicon/react";
import { useTeam } from "@/hooks/use-team";
import { useRoles } from "@/hooks/use-roles";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useUserSession } from "@/hooks/use-user-session";

const DEFAULT_ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  planner: "Planner",
  assistant: "Asistente",
  accountant: "Contable",
  viewer: "Visualizador",
  vendor: "Proveedor",
  client: "Cliente",
};

// Email validation regex
const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export default function TeamPage() {
  return <EventScopedGuard><TeamPageContent /></EventScopedGuard>;
}

export function TeamPageContent({ rolesPath = "/dashboard/settings/roles" }: { rolesPath?: string }) {
  const router = useRouter();
  const { can } = useUserSession();
  const canManageTeam = can("team:manage");
  const { members, invitations, loading, inviteMember, removeMember, cancelInvitation, resendInvitation } = useTeam();
  const { systemRoles, customRoles, loading: rolesLoading } = useRoles();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newInvite, setNewInvite] = useState({
    email: "",
    role: "planner",
  });

  const allRoles = [...systemRoles, ...customRoles];
  const invitableRoles = allRoles.filter(
    (r) => r.slug !== "owner" && r.slug !== "vendor" && r.slug !== "client"
  );
  const getRoleLabel = (slug: string) => {
    const role = allRoles.find((r) => r.slug === slug);
    if (role) return role.name;
    return DEFAULT_ROLE_LABELS[slug] || slug;
  };

  const handleEmailChange = (email: string) => {
    setNewInvite({ ...newInvite, email });
    if (email && !isValidEmail(email)) {
      setEmailError("Ingresa un email válido");
    } else {
      setEmailError(null);
    }
  };

  const handleInvite = async () => {
    if (!newInvite.email || !isValidEmail(newInvite.email)) {
      setEmailError("Ingresa un email válido");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const result = await inviteMember(newInvite);
      if (result.success) {
        toast.success("Invitación enviada", {
          description: `Se envió una invitación a ${newInvite.email}`,
        });
        setNewInvite({ email: "", role: "planner" });
        setEmailError(null);
        setIsDrawerOpen(false);
      } else {
        if (!handleBillingError(result.error || "")) {
          toast.error("Error al enviar invitación", {
            description: result.error,
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelInvitation = async (invitationId: number, email: string) => {
    const result = await cancelInvitation(invitationId);
    if (result.success) {
      toast.success("Invitación cancelada", {
        description: `La invitación a ${email} fue cancelada`,
      });
    } else {
      toast.error("Error al cancelar", {
        description: result.error,
      });
    }
  };

  const handleResendInvitation = async (invitationId: number, email: string) => {
    const result = await resendInvitation(invitationId);
    if (result.success) {
      toast.success("Invitación reenviada", {
        description: `Se reenvió la invitación a ${email}`,
      });
    } else {
      toast.error("Error al reenviar", {
        description: result.error,
      });
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      const parts = name.split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipo</h1>
          <p className="text-[var(--muted-foreground)]">
            Gestiona los miembros de tu equipo
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManageTeam && (
            <Button variant="outline" onClick={() => router.push(rolesPath)}>
              <RiTeamLine className="h-4 w-4 mr-2" />
              Roles
            </Button>
          )}
          {canManageTeam && (
            <Button className="gap-2" onClick={() => setIsDrawerOpen(true)}>
              <RiUserAddLine className="h-4 w-4" />
              Invitar Miembro
            </Button>
          )}
        </div>
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetContent className="sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Invitar Miembro</SheetTitle>
              <SheetDescription>
                Envía una invitación por email para unirse a tu equipo
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={newInvite.email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={emailError ? "border-red-500" : ""}
                />
                {emailError && (
                  <p className="text-sm text-red-500">{emailError}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rol</label>
                <Select
                  value={newInvite.role}
                  onValueChange={(value) => setNewInvite({ ...newInvite, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rolesLoading ? (
                      <SelectItem value="planner" disabled>Cargando...</SelectItem>
                    ) : (
                      invitableRoles.map((role) => (
                        <SelectItem key={role.slug} value={role.slug}>
                          {role.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <SheetFooter className="px-4">
              <Button variant="outline" onClick={() => setIsDrawerOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button 
                onClick={handleInvite} 
                disabled={!newInvite.email || !!emailError || isSubmitting}
              >
                {isSubmitting ? "Enviando..." : "Enviar Invitación"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Miembros del Equipo</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : members.length > 0 ? (
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-[var(--muted)] transition-colors"
                >
                  <Avatar>
                    {member.image && <AvatarImage src={member.image} alt={member.name || ""} />}
                    <AvatarFallback className="bg-[var(--primary)] text-white">
                      {getInitials(member.name, member.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{member.name || "Sin nombre"}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{member.email}</p>
                  </div>
                  <Badge variant="secondary">
                    {getRoleLabel(member.role || "viewer")}
                  </Badge>
                  {member.role !== "owner" && canManageTeam && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => removeMember(member.id)}
                    >
                      <RiDeleteBinLine className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <RiTeamLine className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-2" />
              <p className="text-[var(--muted-foreground)]">No hay miembros en el equipo</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invitaciones Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center gap-4 p-3 rounded-lg border border-dashed border-[var(--border)]"
                >
                  <div className="h-10 w-10 rounded-full bg-[var(--muted)] flex items-center justify-center">
                    <RiMailLine className="h-5 w-5 text-[var(--muted-foreground)]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{invitation.email}</p>
                    <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                      <RiTimeLine className="h-3 w-3" />
                      <span>
                        Expira: {invitation.expiresAt 
                          ? new Date(invitation.expiresAt).toLocaleDateString("es-ES")
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                  <Badge variant="warning">Pendiente</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <RiMoreLine className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => handleResendInvitation(invitation.id, invitation.email)}
                        className="gap-2"
                      >
                        <RiRefreshLine className="h-4 w-4" />
                        Reenviar invitación
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleCancelInvitation(invitation.id, invitation.email)}
                        className="gap-2 text-red-500 focus:text-red-500"
                      >
                        <RiCloseLine className="h-4 w-4" />
                        Cancelar invitación
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
