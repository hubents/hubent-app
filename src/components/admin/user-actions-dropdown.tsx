"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MoreVertical,
  Eye,
  Pencil,
  Shield,
  ShieldOff,
  UserX,
  UserCheck,
  Mail,
  KeyRound,
  Trash2,
  Loader2,
  Crown,
} from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  emailVerified: string | null;
  createdAt?: string;
  isAdmin: boolean;
  adminLevel?: string;
  status?: string;
}

interface UserActionsDropdownProps {
  user: User;
  currentUserId: string;
  onViewDetails: (user: User) => void;
  onEdit: (user: User) => void;
  onRefresh: () => void;
}

export function UserActionsDropdown({
  user,
  currentUserId,
  onViewDetails,
  onEdit,
  onRefresh,
}: UserActionsDropdownProps) {
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: string;
    title: string;
    description: string;
    destructive?: boolean;
  }>({ open: false, action: "", title: "", description: "" });
  const [suspendReason, setSuspendReason] = useState("");
  const [promoteLevel, setPromoteLevel] = useState<"support" | "super_admin">("support");

  const isSelf = user.id === currentUserId;
  const isSuspended = user.status === "suspended";

  const executeAction = async (action: string, body?: object) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al ejecutar acción");
      }

      toast.success(data.message || "Acción completada");
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error desconocido");
    } finally {
      setLoading(false);
      setConfirmDialog({ open: false, action: "", title: "", description: "" });
      setSuspendReason("");
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al eliminar usuario");
      }

      toast.success("Usuario eliminado");
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error desconocido");
    } finally {
      setLoading(false);
      setConfirmDialog({ open: false, action: "", title: "", description: "" });
    }
  };

  const confirmAction = (
    action: string,
    title: string,
    description: string,
    destructive = false
  ) => {
    setConfirmDialog({ open: true, action, title, description, destructive });
  };

  const handleConfirm = () => {
    switch (confirmDialog.action) {
      case "suspend":
        executeAction("suspend", { reason: suspendReason });
        break;
      case "reactivate":
        executeAction("reactivate");
        break;
      case "promote":
        executeAction("promote", { level: promoteLevel });
        break;
      case "demote":
        executeAction("demote");
        break;
      case "resend-verification":
        executeAction("resend-verification");
        break;
      case "reset-password":
        executeAction("reset-password");
        break;
      case "delete":
        handleDelete();
        break;
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreVertical className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onViewDetails(user)}>
            <Eye className="h-4 w-4 mr-2" />
            Ver detalles
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(user)}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Admin actions */}
          {user.isAdmin ? (
            <>
              <DropdownMenuItem
                onClick={() =>
                  confirmAction(
                    "demote",
                    "Revocar permisos de admin",
                    `¿Estás seguro de quitar los permisos de administrador a ${user.name || user.email}?`
                  )
                }
                disabled={isSelf}
              >
                <ShieldOff className="h-4 w-4 mr-2" />
                Revocar admin
              </DropdownMenuItem>
              {user.adminLevel !== "super_admin" && (
                <DropdownMenuItem
                  onClick={() => {
                    setPromoteLevel("super_admin");
                    confirmAction(
                      "promote",
                      "Promover a Super Admin",
                      `¿Promover a ${user.name || user.email} a Super Admin?`
                    );
                  }}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Hacer Super Admin
                </DropdownMenuItem>
              )}
            </>
          ) : (
            <DropdownMenuItem
              onClick={() => {
                setPromoteLevel("support");
                confirmAction(
                  "promote",
                  "Promover a Admin",
                  `¿Promover a ${user.name || user.email} como administrador de soporte?`
                );
              }}
            >
              <Shield className="h-4 w-4 mr-2" />
              Promover a Admin
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Suspend/Reactivate */}
          {isSuspended ? (
            <DropdownMenuItem
              onClick={() =>
                confirmAction(
                  "reactivate",
                  "Reactivar usuario",
                  `¿Reactivar la cuenta de ${user.name || user.email}?`
                )
              }
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Reactivar
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() =>
                confirmAction(
                  "suspend",
                  "Suspender usuario",
                  `¿Suspender la cuenta de ${user.name || user.email}? No podrá acceder a la plataforma.`,
                  true
                )
              }
              disabled={isSelf}
            >
              <UserX className="h-4 w-4 mr-2" />
              Suspender
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Email actions */}
          {!user.emailVerified && (
            <DropdownMenuItem
              onClick={() =>
                confirmAction(
                  "resend-verification",
                  "Reenviar verificación",
                  `¿Enviar email de verificación a ${user.email}?`
                )
              }
            >
              <Mail className="h-4 w-4 mr-2" />
              Reenviar verificación
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() =>
              confirmAction(
                "reset-password",
                "Enviar reset de contraseña",
                `¿Enviar email de recuperación de contraseña a ${user.email}?`
              )
            }
          >
            <KeyRound className="h-4 w-4 mr-2" />
            Resetear contraseña
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Delete */}
          <DropdownMenuItem
            onClick={() =>
              confirmAction(
                "delete",
                "Eliminar usuario",
                `¿Eliminar permanentemente a ${user.name || user.email}? Esta acción no se puede deshacer.`,
                true
              )
            }
            disabled={isSelf}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ ...confirmDialog, open })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {confirmDialog.action === "suspend" && (
            <div className="py-4">
              <Label htmlFor="reason">Razón (opcional)</Label>
              <Input
                id="reason"
                placeholder="Ej: Violación de términos de uso"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="mt-2"
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={loading}
              className={
                confirmDialog.destructive
                  ? "bg-red-600 hover:bg-red-700"
                  : ""
              }
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                "Confirmar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
