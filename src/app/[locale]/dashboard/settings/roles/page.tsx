"use client";

import { useState, useEffect, useCallback } from "react";
import { Btn, Inp, Pill, PCard } from "@/components/ui/ds";
import { PageHeader } from "@/components/layout/page-header";
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
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

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
  return <RolesPageContent />;
}

export function RolesPageContent({ backPath = "/dashboard/settings" }: { backPath?: string }) {
  const t = useTranslations("settingsSub");
  const router = useRouter();
  const { can } = useUserSession();
  const resourceLabel = (r: string) => ({ events: t("resEvents"), tasks: t("resTasks"), finance: t("resFinance"), crm: t("resCRM"), vendors: t("resVendors"), team: t("resTeam"), settings: t("resSettings") }[r] ?? r);
  const actionLabel = (a: string) => ({ read: t("actionRead"), create: t("actionCreate"), update: t("actionUpdate"), delete: t("actionDelete"), manage: t("actionManage"), invite: t("actionInvite"), comment: t("actionComment") }[a] ?? a);
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
      toast.error(t("errorLoadingRoles"));
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
      toast.error(t("errorLoadingPermissions"));
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
      toast.error(t("errorLoadingRoleDetail"));
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
      toast.error(t("nameRequired"));
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
          toast.success(t("roleCreated"));
          setDrawerOpen(false);
          await fetchRoles();
        } else {
          toast.error(data.error?.message || t("errorCreatingRole"));
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
          toast.success(t("roleUpdated"));
          setDrawerOpen(false);
          await fetchRoles();
        } else {
          toast.error(data.error?.message || t("errorUpdatingRole"));
        }
      }
    } catch {
      toast.error(t("errorConnection"));
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
        toast.success(t("roleDeleted"));
        await fetchRoles();
      } else {
        toast.error(data.error?.message || t("errorDeleting"));
      }
    } catch {
      toast.error(t("errorConnection"));
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
          {isSystem && <Pill bg="var(--bg-subtle)" color="var(--ink-2)" style={{ fontSize: 11 }}>{t("system")}</Pill>}
        </div>
        <p className="text-sm text-[var(--muted-foreground)] truncate">
          {role.description || t("noDescription")}
        </p>
      </div>
      <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
        <span>{role.permissionCount}/{totalPerms} {t("permissions")}</span>
        <span>{role.memberCount} {role.memberCount === 1 ? t("member") : t("members")}</span>
      </div>
      {!isSystem && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-2)" }}
            onClick={(e) => { e.stopPropagation(); handleEditRole(role); }}
          >
            <RiEditLine className="h-4 w-4" />
          </button>
          <button
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", color: "#EF4444" }}
            onClick={(e) => {
              e.stopPropagation();
              setRoleToDelete(role);
              setDeleteConfirmOpen(true);
            }}
          >
            <RiDeleteBinLine className="h-4 w-4" />
          </button>
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
                {resourceLabel(resource)}
              </span>
              <Pill bg="transparent" style={{ border: "1px solid var(--line-strong)", marginLeft: "auto", fontSize: 11 }}>
                {perms.filter((p) => currentPermIds.has(p.id)).length}/{perms.length}
              </Pill>
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
                    <span className="font-medium">{actionLabel(perm.action)}</span>
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
        <PCard>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </PCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ onClick: () => router.push(backPath) }}
        action={canManageTeam && (
          <Btn variant="primary" onClick={handleCreateRole}>
            <RiAddLine className="h-4 w-4" />
            {t("newRole")}
          </Btn>
        )}
      />

      {/* System Roles */}
      <PCard>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)", display: "flex", alignItems: "center", gap: 6 }}>
            <RiLockLine className="h-5 w-5" />
            {t("systemRoles")}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>
            {t("systemRolesDesc")}
          </div>
        </div>
        <div className="space-y-2">
          {systemRoles.map((role) => renderRoleCard(role, true))}
        </div>
      </PCard>

      {/* Custom Roles */}
      <PCard>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)", display: "flex", alignItems: "center", gap: 6 }}>
            <RiShieldLine className="h-5 w-5" />
            {t("customRoles")}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>
            {t("customRolesDesc")}
          </div>
        </div>
        {customRoles.length > 0 ? (
          <div className="space-y-2">
            {customRoles.map((role) => renderRoleCard(role, false))}
          </div>
        ) : (
          <div className="text-center py-8">
            <RiShieldLine className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-2" />
            <p className="text-[var(--muted-foreground)]">{t("noCustomRoles")}</p>
            <p className="text-sm text-[var(--muted-foreground)] mb-4">
              {t("noCustomRolesDesc")}
            </p>
            {canManageTeam && (
              <Btn variant="outline" onClick={handleCreateRole} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <RiAddLine className="h-4 w-4" />
                {t("createRole")}
              </Btn>
            )}
          </div>
        )}
      </PCard>

      {/* Role Detail / Edit Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {drawerMode === "create"
                ? t("newRole")
                : drawerMode === "edit"
                ? `${t("editRole")}: ${selectedRole?.name}`
                : selectedRole?.name || t("loading")}
            </SheetTitle>
            <SheetDescription>
              {drawerMode === "create"
                ? t("newRoleDesc")
                : drawerMode === "edit"
                ? t("editRoleDesc")
                : selectedRole?.description || t("assignedPermissions")}
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
                      <label className="text-sm font-medium">{t("name")} *</label>
                      <Inp
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t("description")}</label>
                      <Inp
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{t("limitToAssignedEvents")}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {t("limitToAssignedEventsDesc")}
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
                        <p className="text-xs text-[var(--muted-foreground)]">{t("permissions")}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-[var(--muted)]/50 text-center">
                        <p className="text-2xl font-bold">{selectedRole.memberCount}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{t("members")}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-[var(--muted)]/50 text-center">
                        <p className="text-2xl font-bold">
                          {selectedRole.isSystem ? t("yes") : t("no")}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">{t("system")}</p>
                      </div>
                    </div>
                    {(selectedRole as unknown as Role).eventScoped && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <RiLockLine className="h-4 w-4 text-amber-600" />
                        <p className="text-sm text-amber-800">{t("roleScopedNote")}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Permission Matrix */}
                <div>
                  <h3 className="text-sm font-medium mb-3">
                    {t("permissions")}
                    {(drawerMode === "create" || drawerMode === "edit") && (
                      <span className="text-[var(--muted-foreground)] ml-2">
                        ({formPermissionIds.size}/{totalPerms} {t("selected")})
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
              <Btn variant="outline" onClick={() => setDrawerOpen(false)} disabled={saving}>
                {t("cancel")}
              </Btn>
              <Btn variant="primary" onClick={handleSave} disabled={saving || !formName.trim()}>
                {saving ? t("saving") : drawerMode === "create" ? t("createRole") : t("saveChanges")}
              </Btn>
            </SheetFooter>
          )}

          {drawerMode === "view" && selectedRole && !selectedRole.isSystem && (
            <SheetFooter className="px-4">
              <Btn
                variant="outline"
                onClick={() => {
                  setDrawerMode("edit");
                  setFormName(selectedRole.name);
                  setFormDescription(selectedRole.description || "");
                  setFormEventScoped((selectedRole as unknown as Role).eventScoped ?? false);
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <RiEditLine className="h-4 w-4" />
                {t("edit")}
              </Btn>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteRole")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteRoleConfirm", { name: roleToDelete?.name ?? "" })}
              {roleToDelete && roleToDelete.memberCount > 0 && (
                <span className="block mt-2 text-red-500 font-medium">
                  {t("deleteRoleHasMembers", { count: roleToDelete.memberCount })}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
