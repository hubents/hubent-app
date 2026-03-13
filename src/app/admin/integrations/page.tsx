"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  RiPlugLine,
  RiMailLine,
  RiWhatsappLine,
  RiLinkUnlink,
  RiBarChartBoxLine,
} from "@remixicon/react";
import { toast } from "sonner";
import Image from "next/image";

interface IntegrationRow {
  id: number;
  organizationId: number;
  orgName: string;
  orgSlug: string;
  orgType: string;
  toolkit: string;
  status: string;
  connectedEmail: string | null;
  connectedByName: string | null;
  connectedAt: string | null;
}

interface Stats {
  totalConnections: number;
  totalOrganizations: number;
  byToolkit: Record<string, number>;
  adoptionRate: number;
}

export default function AdminIntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<number | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<IntegrationRow | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/integrations");
      const data = await res.json();
      if (data.success) {
        setIntegrations(data.data.integrations);
        setStats(data.data.stats);
      }
    } catch {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleForceDisconnect = async (integration: IntegrationRow) => {
    setDisconnecting(integration.id);
    try {
      const res = await fetch(
        `/api/admin/integrations/${integration.id}/disconnect`,
        { method: "POST" }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(
          `${integration.toolkit} desconectado de ${integration.orgName}`
        );
        await fetchData();
      } else {
        toast.error(data.error || "Error al desconectar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDisconnecting(null);
      setConfirmDisconnect(null);
    }
  };

  const toolkitIcon = (toolkit: string) => {
    if (toolkit === "gmail")
      return <Image src="/icons/gmail.svg" alt="Gmail" width={16} height={16} />;
    if (toolkit === "whatsapp")
      return (
        <Image src="/icons/whatsapp.svg" alt="WhatsApp" width={16} height={16} />
      );
    return <RiPlugLine className="w-4 h-4" />;
  };

  const connectedIntegrations = integrations.filter(
    (i) => i.status === "connected"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <RiPlugLine className="w-6 h-6" />
          Integraciones - Admin
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visión global de las integraciones Composio en toda la plataforma
        </p>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <RiBarChartBoxLine className="w-4 h-4" />
                Conexiones Activas
              </div>
              <p className="text-2xl font-bold mt-1">
                {stats.totalConnections}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <RiMailLine className="w-4 h-4" />
                Gmail
              </div>
              <p className="text-2xl font-bold mt-1">
                {stats.byToolkit["gmail"] || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <RiWhatsappLine className="w-4 h-4" />
                WhatsApp
              </div>
              <p className="text-2xl font-bold mt-1">
                {stats.byToolkit["whatsapp"] || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                Tasa de Adopción
              </div>
              <p className="text-2xl font-bold mt-1">{stats.adoptionRate}%</p>
              <p className="text-[10px] text-muted-foreground">
                de {stats.totalOrganizations} organizaciones
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Connections Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conexiones por Organización</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : connectedIntegrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <RiPlugLine className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay integraciones conectadas</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organización</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Toolkit</TableHead>
                  <TableHead>Email Conectado</TableHead>
                  <TableHead>Conectado Por</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connectedIntegrations.map((integration) => (
                  <TableRow key={integration.id}>
                    <TableCell className="font-medium">
                      {integration.orgName}
                      <span className="text-xs text-muted-foreground ml-1">
                        /{integration.orgSlug}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          integration.orgType === "provider"
                            ? "secondary"
                            : "default"
                        }
                        className="text-[10px]"
                      >
                        {integration.orgType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {toolkitIcon(integration.toolkit)}
                        <span className="text-sm capitalize">
                          {integration.toolkit}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {integration.connectedEmail || "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {integration.connectedByName || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {integration.connectedAt
                        ? new Date(integration.connectedAt).toLocaleDateString(
                            "es-AR",
                            { day: "2-digit", month: "short", year: "numeric" }
                          )
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        disabled={disconnecting === integration.id}
                        onClick={() => setConfirmDisconnect(integration)}
                      >
                        <RiLinkUnlink className="w-3.5 h-3.5 mr-1" />
                        {disconnecting === integration.id
                          ? "..."
                          : "Forzar Desconexión"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirm Disconnect Dialog */}
      <AlertDialog
        open={!!confirmDisconnect}
        onOpenChange={() => setConfirmDisconnect(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Forzar Desconexión</AlertDialogTitle>
            <AlertDialogDescription>
              Estás por desconectar{" "}
              <strong>{confirmDisconnect?.toolkit}</strong> de{" "}
              <strong>{confirmDisconnect?.orgName}</strong>. La organización no
              podrá usar esta integración hasta que la reconecte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                confirmDisconnect && handleForceDisconnect(confirmDisconnect)
              }
            >
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
