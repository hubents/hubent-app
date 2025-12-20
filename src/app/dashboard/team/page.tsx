"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus } from "lucide-react";

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipo</h1>
          <p className="text-muted-foreground">Gestiona los miembros de tu equipo</p>
        </div>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invitar Miembro
        </Button>
      </div>
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Equipo</h3>
          <p className="text-sm text-muted-foreground">Funcionalidad en desarrollo</p>
        </CardContent>
      </Card>
    </div>
  );
}
