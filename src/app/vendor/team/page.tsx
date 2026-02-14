"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiTeamLine,
  RiMailLine,
  RiTimeLine,
  RiUserLine,
} from "@remixicon/react";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  roleName: string;
  joinedAt: string;
}

export default function VendorTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeam() {
      try {
        const res = await fetch("/api/team");
        const data = await res.json();
        if (data.success && data.data?.members) {
          setMembers(data.data.members);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchTeam();
  }, []);

  const roleLabels: Record<string, string> = {
    provider_owner: "Dueño",
    provider_admin: "Administrador",
    provider_tech: "Técnico",
    owner: "Dueño",
    admin: "Admin",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Equipo</h1>
        <p className="text-muted-foreground text-sm">Miembros de tu organización proveedora</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RiTeamLine className="h-5 w-5" />
            Miembros ({members.length})
          </CardTitle>
          <CardDescription>
            Personas con acceso a esta cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No se encontraron miembros
            </p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      {member.image ? (
                        <img
                          src={member.image}
                          alt={member.name || ""}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <RiUserLine className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {member.name || "Sin nombre"}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <RiMailLine className="h-3 w-3" />
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {roleLabels[member.role] || member.roleName || member.role}
                    </Badge>
                    {member.joinedAt && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <RiTimeLine className="h-3 w-3" />
                        {new Date(member.joinedAt).toLocaleDateString("es-AR")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
