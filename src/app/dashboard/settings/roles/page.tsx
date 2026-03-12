"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserSession } from "@/hooks/use-user-session";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  RiShieldLine,
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiUserLine,
  RiArrowLeftLine,
  RiLockLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Role {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean | null;
  eventScoped: boolean | null;
  organizationId: number | null;
  permissionCount: number;
  memberCount: number;
}

interface Permission {
  id: number;
  name: string;
  slug: string;
  resource: string;
  action: string;
  description: string | null;
}

interface RoleDetail extends Role {
  permissions: Permission[];
}

const RESOURCE_LABELS: Record<string, string> = {
  events: "Eventos",
  tasks: "Tareas",
  finance: "Finanzas",
  crm: "CRM / Contactos",
  vendors: "Proveedores",
  team: "Equipo",
  settings: "Configuración",
};

const ACTION_LABELS: Record<string, string> = {
  read: "Ver",
  create: "Crear",
  update: "Editar",
  delete: "Eliminar",
  manage: "Gestionar",
  invite: "Invitar",
  comment: "Comentar",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-100 text-amber-800",
  admin: "bg-red-100 text-red-800",
  planner: "bg-blue-100 text-blue-800",
  assistant: "bg-cyan-100 text-cyan-800",
  accountant: "bg-green-100 text-green-800",
  viewer: "bg-gray-100 text-gray-800",
  vendor: "bg-purple-100 text-purple-800",
  client: "bg-pink-100 text-pink-800",
};

export default function RolesPage() {
  const router = useRouter();
  const { can } = useUserSession();
  const canManageTeam = can("team:manage");
  const [systemRoles, setSystemRoles] = useState<Role[]>([]);
  const [customRoles, setCustomRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"view" | "create" | "edit">("view");
  const [selectedRole, setSelectedRole] = useState<RoleDetail | null>(null);
  const [loadingRole, setLoadingRole] = useState(false);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPermissionIds, setFormPermissionIds] = useState<Set<number>>(new Set());
  const [formEventScoped, setFormEventScoped] = useState(false);
  const [saving, setSaving] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/roles");
      const data = await res.json();
      if (data.success) {
        setSystemRoles(data.data.systemRoles);
        setCustomRoles(data.data.customRoles);
      }
    } catch {
      toast.error("Error al cargar roles");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch("/api/permissions");
      const data = await res.json();
      if (data.success) {
        setAllPermissions(data.data.permissions);
        setGroupedPermissions(data.data.grouped);
      }
    } catch {
      toast.error("Error al cargar permisos");
    }
  }, []);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [fetchRoles, fetchPermissions]);

  const fetchRoleDetail = async (roleId: number) => {
    setLoadingRole(true);
    try {
      const res = await fetch(`/api/roles/${roleId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedRole(data.data);
        setFormPermissionIds(new Set(data.data.permissions.map((p: Permission) => p.id)));
      }
    } catch {
      toast.error("Error al cargar detalle del rol");
    } finally {
      setLoadingRole(false);
    }
  };

  const handleViewRole = async (role: Role) => {
    setDrawerMode("view");
    setDrawerOpen(true);
    await fetchRoleDetail(role.id);
  };

  const handleEditRole = async (role: Role) => {
    setDrawerMode("edit");
    setDrawerOpen(true);
    await fetchRoleDetail(role.id);
    setFormName(role.name);
    setFormDescription(role.description || "");
    setFormEventScoped(role.eventScoped ?? false);
  };

  const handleCreateRole = () => {
    setDrawerMode("create");
    setSelectedRole(null);
    setFormName("");
    setFormDescription("");
    setFormPermissionIds(new Set());
    setFormEventScoped(false);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    setSaving(true);
    try {
      if (drawerMode === "create") {
        const res = await fetch("/api/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            description: formDescription.trim() || null,
            permissionIds: Array.from(formPermissionIds),
            eventScoped: formEventScoped,
          }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success("Rol creado correctamente");
          setDrawerOpen(false);
          await fetchRoles();
        } else {
          toast.error(data.error?.message || "Error al crear rol");
        }
      } else if (drawerMode === "edit" && selectedRole) {
        const res = await fetch(`/api/roles/${selectedRole.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            description: formDescription.trim() || null,
            permissionIds: Array.from(formPermissionIds),
            eventScoped: formEventScoped,
          }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success("Rol actualizado correctamente");
          setDrawerOpen(false);
          await fetchRoles();
        } else {
          toast.error(data.error?.message || "Error al actualizar rol");
        }
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!roleToDelete) return;
    try {
      const res = await fetch(`/api/roles/${roleToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Rol eliminado");
        await fetchRoles();
      } else {
        toast.error(data.error?.message || "Error al eliminar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDeleteConfirmOpen(false);
      setRoleToDelete(null);
    }
  };

  const togglePermission = (permId: number) => {
    setFormPermissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  };

  const toggleResourceAll = (resource: string) => {
    const resourcePerms = groupedPermissions[resource] || [];
    const allSelected = resourcePerms.every((p) => formPermissionIds.has(p.id));
    setFormPermissionIds((prev) => {
      const next = new Set(prev);
      for (const p of resourcePerms) {
        if (allSelected) {
          next.delete(p.id);
        } else {
          next.add(p.id);
        }
      }
      return next;
    });
  };

  const totalPerms = allPermissions.length;

  const renderRoleCard = (role: Role, isSystem: boolean) => (
    <div
      key={role.id}
      className="flex items-center gap-4 p-4 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors cursor-pointer group"
      onClick={() => handleViewRole(role)}
    >
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${ROLE_COLORS[role.slug] || "bg-gray-100 text-gray-800"}`}>
        {isSystem ? <RiShieldLine className="h-5 w-5" /> : <RiUserLine className="h-5 w-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium">{role.name}</p>
          {isSystem && <Badge variant="secondary" className="text-xs">Sistema</Badge>}
        </div>
        <p className="text-sm text-[var(--muted-foreground)] truncate">
          {role.description || "Sin descripción"}
        </p>
      </div>
      <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
        <span>{role.permissionCount}/{totalPerms} permisos</span>
        <span>{role.memberCount} {role.memberCount === 1 ? "miembro" : "miembros"}</span>
      </div>
      {!isSystem && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); handleEditRole(role); }}
          >
            <RiEditLine className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              setRoleToDelete(role);
              setDeleteConfirmOpen(true);
            }}
          >
            <RiDeleteBinLine className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );

  const renderPermissionMatrix = (readonly: boolean, currentPermIds: Set<number>) => (
    <div className="space-y-4">
      {Object.entries(groupedPermissions).map(([resource, perms]) => {
        const allChecked = perms.every((p) => currentPermIds.has(p.id));
        const someChecked = perms.some((p) => currentPermIds.has(p.id));

        return (
          <div key={resource} className="border border-[var(--border)] rounded-lg overflow-hidden">
            <div
              className="flex items-center gap-3 px-4 py-3 bg-[var(--muted)]/50 cursor-pointer"
              onClick={() => !readonly && toggleResourceAll(resource)}
            >
              {!readonly && (
                <Checkbox
                  checked={allChecked}
                  className={someChecked && !allChecked ? "opacity-50" : ""}
                  onCheckedChange={() => toggleResourceAll(resource)}
                />
              )}
              <span className="font-medium text-sm">
                {RESOURCE_LABELS[resource] || resource}
              </span>
              <Badge variant="outline" className="ml-auto text-xs">
                {perms.filter((p) => currentPermIds.has(p.id)).length}/{perms.length}
              </Badge>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {perms.map((perm) => (
                <label
                  key={perm.id}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
                    readonly ? "" : "hover:bg-[var(--muted)]/30 cursor-pointer"
                  }`}
                >
                  {readonly ? (
                    <div className={`h-4 w-4 rounded-sm border flex items-center justify-center ${
                      currentPermIds.has(perm.id)
                        ? "bg-[var(--primary)] border-[var(--primary)] text-white"
                        : "border-[var(--border)]"
                    }`}>
                      {currentPermIds.has(perm.id) && (
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  ) : (
                    <Checkbox
                      checked={currentPermIds.has(perm.id)}
                      onCheckedChange={() => togglePermission(perm.id)}
                    />
                  )}
                  <div className="flex-1">
                    <span className="font-medium">{ACTION_LABELS[perm.action] || perm.action}</span>
                    <span className="text-[var(--muted-foreground)] ml-2">{perm.slug}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/settings")}>
            <RiArrowLeftLine className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Roles y Permisos</h1>
            <p className="text-[var(--muted-foreground)]">
              Gestiona los roles de tu equipo y sus permisos
            </p>
          </div>
        </div>
        {canManageTeam && (
          <Button className="gap-2" onClick={handleCreateRole}>
            <RiAddLine className="h-4 w-4" />
            Nuevo Rol
          </Button>
        )}
      </div>

      {/* System Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RiLockLine className="h-5 w-5" />
            Roles del Sistema
          </CardTitle>
          <CardDescription>
            Roles predefinidos con permisos estándar. No se pueden editar ni eliminar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {systemRoles.map((role) => renderRoleCard(role, true))}
        </CardContent>
      </Card>

      {/* Custom Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RiShieldLine className="h-5 w-5" />
            Roles Personalizados
          </CardTitle>
          <CardDescription>
            Crea roles a medida con los permisos que necesites.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customRoles.length > 0 ? (
            <div className="space-y-2">
              {customRoles.map((role) => renderRoleCard(role, false))}
            </div>
          ) : (
            <div className="text-center py-8">
              <RiShieldLine className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-2" />
              <p className="text-[var(--muted-foreground)]">No hay roles personalizados</p>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                Crea un rol personalizado para asignar permisos específicos
              </p>
              {canManageTeam && (
                <Button variant="outline" onClick={handleCreateRole}>
                  <RiAddLine className="h-4 w-4 mr-2" />
                  Crear Rol
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Detail / Edit Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {drawerMode === "create"
                ? "Nuevo Rol"
                : drawerMode === "edit"
                ? `Editar: ${selectedRole?.name}`
                : selectedRole?.name || "Cargando..."}
            </SheetTitle>
            <SheetDescription>
              {drawerMode === "create"
                ? "Define un nombre y selecciona los permisos para el nuevo rol"
                : drawerMode === "edit"
                ? "Modifica el nombre y los permisos del rol"
                : selectedRole?.description || "Permisos asignados a este rol"}
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 py-4 space-y-6">
            {loadingRole ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : (
              <>
                {/* Name & Description (edit/create only) */}
                {(drawerMode === "create" || drawerMode === "edit") && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nombre *</label>
                      <Input
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Descripción</label>
                      <Input
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">Limitar acceso a eventos asignados</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Los usuarios con este rol solo verán los eventos donde son colaboradores
                        </p>
                      </div>
                      <Checkbox
                        checked={formEventScoped}
                        onCheckedChange={(checked) => setFormEventScoped(checked === true)}
                      />
                    </div>
                  </div>
                )}

                {/* Role info (view mode) */}
                {drawerMode === "view" && selectedRole && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 rounded-lg bg-[var(--muted)]/50 text-center">
                        <p className="text-2xl font-bold">{selectedRole.permissions.length}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">Permisos</p>
                      </div>
                      <div className="p-3 rounded-lg bg-[var(--muted)]/50 text-center">
                        <p className="text-2xl font-bold">{selectedRole.memberCount}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">Miembros</p>
                      </div>
                      <div className="p-3 rounded-lg bg-[var(--muted)]/50 text-center">
                        <p className="text-2xl font-bold">
                          {selectedRole.isSystem ? "Sí" : "No"}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">Sistema</p>
                      </div>
                    </div>
                    {(selectedRole as unknown as Role).eventScoped && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <RiLockLine className="h-4 w-4 text-amber-600" />
                        <p className="text-sm text-amber-800">Este rol solo ve eventos donde es colaborador</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Permission Matrix */}
                <div>
                  <h3 className="text-sm font-medium mb-3">
                    Permisos
                    {(drawerMode === "create" || drawerMode === "edit") && (
                      <span className="text-[var(--muted-foreground)] ml-2">
                        ({formPermissionIds.size}/{totalPerms} seleccionados)
                      </span>
                    )}
                  </h3>
                  {drawerMode === "view" && selectedRole
                    ? renderPermissionMatrix(true, new Set(selectedRole.permissions.map((p) => p.id)))
                    : renderPermissionMatrix(false, formPermissionIds)}
                </div>
              </>
            )}
          </div>

          {(drawerMode === "create" || drawerMode === "edit") && (
            <SheetFooter className="px-4">
              <Button variant="outline" onClick={() => setDrawerOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !formName.trim()}>
                {saving ? "Guardando..." : drawerMode === "create" ? "Crear Rol" : "Guardar Cambios"}
              </Button>
            </SheetFooter>
          )}

          {drawerMode === "view" && selectedRole && !selectedRole.isSystem && (
            <SheetFooter className="px-4">
              <Button
                variant="outline"
                onClick={() => {
                  setDrawerMode("edit");
                  setFormName(selectedRole.name);
                  setFormDescription(selectedRole.description || "");
                  setFormEventScoped((selectedRole as unknown as Role).eventScoped ?? false);
                }}
              >
                <RiEditLine className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Rol</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar el rol &quot;{roleToDelete?.name}&quot;?
              {roleToDelete && roleToDelete.memberCount > 0 && (
                <span className="block mt-2 text-red-500 font-medium">
                  Este rol tiene {roleToDelete.memberCount} miembros asignados. Reasígnalos primero.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
