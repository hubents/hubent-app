"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiContactsBookLine,
  RiSearchLine,
  RiMailLine,
  RiPhoneLine,
  RiBuildingLine,
  RiUserLine,
} from "@remixicon/react";
import { toast } from "sonner";

interface Contact {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  type: string | null;
  isVendor: boolean;
}

export default function VendorContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchContacts() {
      try {
        const res = await fetch("/api/contacts?limit=100");
        const data = await res.json();
        if (data.success) {
          setContacts(data.data || []);
        }
      } catch {
        toast.error("Error al cargar contactos");
      } finally {
        setLoading(false);
      }
    }
    fetchContacts();
  }, []);

  const filtered = contacts.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contactos</h1>
        <p className="text-muted-foreground text-sm">Tus clientes y contactos profesionales</p>
      </div>

      <div className="relative">
        <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre, email o empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RiContactsBookLine className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {search ? "Sin resultados para esta búsqueda" : "No hay contactos todavía"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{filtered.length} contactos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      {contact.type === "company" ? (
                        <RiBuildingLine className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <RiUserLine className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{contact.name}</p>
                      {contact.company && (
                        <p className="text-xs text-muted-foreground">{contact.company}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {contact.email && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <RiMailLine className="h-3 w-3" />
                        {contact.email}
                      </span>
                    )}
                    {contact.phone && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <RiPhoneLine className="h-3 w-3" />
                        {contact.phone}
                      </span>
                    )}
                    {contact.isVendor && (
                      <Badge variant="secondary" className="text-xs">Proveedor</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
