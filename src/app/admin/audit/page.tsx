import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ScrollText, 
  Search,
  User,
  Calendar
} from "lucide-react";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

async function getAuditLogs() {
  return await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      resource: auditLogs.resource,
      resourceId: auditLogs.resourceId,
      actorEmail: auditLogs.actorEmail,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
      details: auditLogs.details,
    })
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(50);
}

export default async function AuditPage() {
  const logs = await getAuditLogs();

  const getActionColor = (action: string) => {
    if (action.includes("create")) return "bg-green-500/10 text-green-500";
    if (action.includes("update")) return "bg-blue-500/10 text-blue-500";
    if (action.includes("delete")) return "bg-red-500/10 text-red-500";
    if (action.includes("login")) return "bg-purple-500/10 text-purple-500";
    return "bg-gray-500/10 text-gray-500";
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Logs de Auditoría</h1>
        <p className="text-[var(--muted-foreground)]">
          Historial de acciones en la plataforma
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
              <Input
                placeholder="Buscar por acción, recurso o usuario..."
                className="pl-10"
              />
            </div>
            <select className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)]">
              <option value="">Todas las acciones</option>
              <option value="create">Crear</option>
              <option value="update">Actualizar</option>
              <option value="delete">Eliminar</option>
              <option value="login">Login</option>
            </select>
            <select className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)]">
              <option value="">Todos los recursos</option>
              <option value="user">Usuarios</option>
              <option value="organization">Organizaciones</option>
              <option value="event">Eventos</option>
              <option value="subscription">Suscripciones</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="p-8 text-center">
              <ScrollText className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-4" />
              <h3 className="font-medium mb-2">No hay logs</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Aún no se han registrado acciones en la plataforma
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">
                    Fecha
                  </th>
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">
                    Usuario
                  </th>
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">
                    Acción
                  </th>
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">
                    Recurso
                  </th>
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-[var(--muted-foreground)]" />
                        {log.createdAt
                          ? new Date(log.createdAt).toLocaleString()
                          : "-"}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-[var(--muted-foreground)]" />
                        <span className="text-sm">{log.actorEmail || "-"}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4">
                      <div>
                        <span className="font-medium">{log.resource}</span>
                        {log.resourceId && (
                          <span className="text-[var(--muted-foreground)] text-sm ml-1">
                            #{log.resourceId}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-mono text-sm text-[var(--muted-foreground)]">
                      {log.ipAddress || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
