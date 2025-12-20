"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiUserAddLine,
  RiMailLine,
  RiTimeLine,
  RiTeamLine,
  RiDeleteBinLine,
} from "@remixicon/react";
import { useTeam } from "@/hooks/use-team";
import { useState } from "react";

const roleLabels: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  member: "Miembro",
  viewer: "Visualizador",
};

export default function TeamPage() {
  const { members, invitations, loading, inviteMember, removeMember, cancelInvitation } = useTeam();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newInvite, setNewInvite] = useState({
    email: "",
    role: "member",
  });

  const handleInvite = async () => {
    if (!newInvite.email) return;
    
    await inviteMember(newInvite);
    setNewInvite({ email: "", role: "member" });
    setIsDialogOpen(false);
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <RiUserAddLine className="h-4 w-4" />
              Invitar Miembro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Invitar Miembro</DialogTitle>
              <DialogDescription>
                Envía una invitación por email para unirse a tu equipo
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={newInvite.email}
                  onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                />
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
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="member">Miembro</SelectItem>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleInvite} disabled={!newInvite.email}>
                Enviar Invitación
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                    {roleLabels[member.role || "member"] || member.role}
                  </Badge>
                  {member.role !== "owner" && (
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500"
                    onClick={() => cancelInvitation(invitation.id)}
                  >
                    Cancelar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
