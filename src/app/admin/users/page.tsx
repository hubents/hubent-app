import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Search, 
  Shield,
  Mail,
  MoreVertical
} from "lucide-react";
import { db } from "@/db";
import { users, platformAdmins, organizationMembers } from "@/db/schema";
import { eq, count } from "drizzle-orm";

async function getUsers() {
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);

  return allUsers;
}

async function getPlatformAdminIds() {
  const admins = await db.select({ userId: platformAdmins.userId }).from(platformAdmins);
  return new Set(admins.map((a) => a.userId));
}

export default async function UsersPage() {
  const allUsers = await getUsers();
  const adminIds = await getPlatformAdminIds();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-[var(--muted-foreground)]">
            Todos los usuarios registrados en la plataforma
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {allUsers.length} usuarios
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
              <Input
                placeholder="Buscar por nombre o email..."
                className="pl-10"
              />
            </div>
            <select className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)]">
              <option value="">Todos</option>
              <option value="admin">Solo Admins</option>
              <option value="verified">Verificados</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {allUsers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-4" />
              <h3 className="font-medium mb-2">No hay usuarios</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Aún no se han registrado usuarios en la plataforma
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">
                    Usuario
                  </th>
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">
                    Email
                  </th>
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">
                    Estado
                  </th>
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">
                    Rol
                  </th>
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">
                    Registrado
                  </th>
                  <th className="text-right p-4 font-medium text-[var(--muted-foreground)]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center overflow-hidden">
                          {user.image ? (
                            <img
                              src={user.image}
                              alt={user.name || ""}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <Users className="h-5 w-5 text-[var(--primary)]" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{user.name || "Sin nombre"}</p>
                          <p className="text-xs text-[var(--muted-foreground)] font-mono">
                            {user.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-[var(--muted-foreground)]" />
                        <span>{user.email}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {user.emailVerified ? (
                        <Badge variant="default" className="bg-green-500/10 text-green-500">
                          Verificado
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pendiente</Badge>
                      )}
                    </td>
                    <td className="p-4">
                      {adminIds.has(user.id) ? (
                        <Badge className="gap-1 bg-red-500/10 text-red-500">
                          <Shield className="h-3 w-3" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Usuario</Badge>
                      )}
                    </td>
                    <td className="p-4 text-[var(--muted-foreground)]">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end">
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
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
