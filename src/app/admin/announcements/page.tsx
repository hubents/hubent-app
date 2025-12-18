import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Megaphone, 
  Plus,
  Edit,
  Trash2,
  Calendar
} from "lucide-react";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { desc } from "drizzle-orm";

async function getAnnouncements() {
  return await db
    .select()
    .from(announcements)
    .orderBy(desc(announcements.createdAt));
}

export default async function AnnouncementsPage() {
  const allAnnouncements = await getAnnouncements();

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case "info":
        return "bg-blue-500/10 text-blue-500";
      case "warning":
        return "bg-yellow-500/10 text-yellow-500";
      case "success":
        return "bg-green-500/10 text-green-500";
      case "error":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Anuncios</h1>
          <p className="text-[var(--muted-foreground)]">
            Comunica novedades a todos los tenants
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Anuncio
        </Button>
      </div>

      {/* Announcements List */}
      {allAnnouncements.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Megaphone className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-4" />
            <h3 className="font-medium mb-2">No hay anuncios</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-4">
              Crea tu primer anuncio para comunicarte con los tenants
            </p>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Crear Anuncio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {allAnnouncements.map((announcement) => (
            <Card key={announcement.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{announcement.title}</h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(
                          announcement.type
                        )}`}
                      >
                        {announcement.type}
                      </span>
                      {announcement.isActive ? (
                        <Badge variant="default" className="bg-green-500/10 text-green-500">
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactivo</Badge>
                      )}
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)] mb-4">
                      {announcement.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Creado: {announcement.createdAt
                          ? new Date(announcement.createdAt).toLocaleDateString()
                          : "-"}
                      </div>
                      {announcement.startsAt && (
                        <div className="flex items-center gap-1">
                          Inicia: {new Date(announcement.startsAt).toLocaleDateString()}
                        </div>
                      )}
                      {announcement.endsAt && (
                        <div className="flex items-center gap-1">
                          Termina: {new Date(announcement.endsAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
