"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RiUserLine, RiSearchLine } from "@remixicon/react";

interface Guest {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  tableId: number | null;
  tableName: string | null;
  rsvpStatus: string | null;
  groupName: string | null;
}

interface TableData {
  id: number;
  name: string;
  capacity: number;
  guestCount: number;
}

interface GuestSidebarProps {
  guests: Guest[];
  tables: TableData[];
  onAssign: (guestId: number, tableId: number) => void;
}

export function GuestSidebar({ guests, tables, onAssign }: GuestSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGuest, setSelectedGuest] = useState<number | null>(null);

  const filteredGuests = guests.filter((g) =>
    `${g.firstName} ${g.lastName || ""}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssign = (tableId: string) => {
    if (selectedGuest && tableId) {
      onAssign(selectedGuest, parseInt(tableId, 10));
      setSelectedGuest(null);
    }
  };

  return (
    <div className="w-72 border-r bg-muted/30 flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <RiUserLine className="h-4 w-4" />
          Sin mesa asignada
          <Badge variant="secondary">{guests.length}</Badge>
        </h3>
        <div className="relative">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-8"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredGuests.length > 0 ? (
          filteredGuests.map((guest) => (
            <div
              key={guest.id}
              className={`p-3 bg-white rounded-lg border cursor-pointer transition-all ${
                selectedGuest === guest.id
                  ? "ring-2 ring-primary border-primary"
                  : "hover:shadow-md"
              }`}
              onClick={() => setSelectedGuest(guest.id === selectedGuest ? null : guest.id)}
            >
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                  {guest.firstName.charAt(0)}{guest.lastName?.charAt(0) || ""}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {guest.firstName} {guest.lastName}
                  </p>
                  {guest.groupName && (
                    <p className="text-xs text-muted-foreground truncate">{guest.groupName}</p>
                  )}
                </div>
                {guest.rsvpStatus === "confirmed" && (
                  <Badge variant="default" className="text-xs bg-green-500">✓</Badge>
                )}
              </div>

              {selectedGuest === guest.id && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Asignar a mesa:</p>
                  <Select onValueChange={handleAssign}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Seleccionar mesa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map((t) => (
                        <SelectItem 
                          key={t.id} 
                          value={t.id.toString()}
                          disabled={t.guestCount >= t.capacity}
                        >
                          {t.name} ({t.guestCount}/{t.capacity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {searchTerm ? "No hay resultados" : "Todos los invitados tienen mesa"}
          </div>
        )}
      </div>
    </div>
  );
}
