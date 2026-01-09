"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiAddLine,
  RiSearchLine,
  RiUserLine,
  RiBuilding2Line,
  RiMailLine,
  RiPhoneLine,
  RiMapPinLine,
} from "@remixicon/react";
import { useContacts } from "@/hooks/use-contacts";
import { ContactDrawer } from "./contact-drawer";
import { CreateContactDialog } from "./create-contact-dialog";

export function ContactsPageContent() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { contacts, stats, loading, refetch } = useContacts({
    search: search || undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
  });

  const handleContactClick = (contactId: number) => {
    setSelectedContactId(contactId);
    setIsDrawerOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contactos</h1>
          <p className="text-muted-foreground">
            Administra todos tus contactos desde un solo lugar
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
          <RiAddLine className="h-4 w-4" />
          Nuevo Contacto
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <RiUserLine className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Contactos</span>
                </div>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <RiUserLine className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Personas</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-blue-500">{stats.persons}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <RiBuilding2Line className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-muted-foreground">Empresas</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-purple-500">{stats.companies}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <RiUserLine className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Leads</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-green-500">{stats.leads}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Lista de Contactos</CardTitle>
            <div className="flex items-center gap-3">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="person">Personas</SelectItem>
                  <SelectItem value="company">Empresas</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar contactos..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-12">
              <RiUserLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No hay contactos</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search ? "No se encontraron contactos con esa búsqueda" : "Crea tu primer contacto para comenzar"}
              </p>
              {!search && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <RiAddLine className="h-4 w-4 mr-2" />
                  Nuevo Contacto
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleContactClick(contact.id)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={contact.avatar || undefined} />
                    <AvatarFallback className={contact.type === "company" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}>
                      {contact.type === "company" ? (
                        <RiBuilding2Line className="h-5 w-5" />
                      ) : (
                        getInitials(contact.name)
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{contact.name}</p>
                      <Badge variant={contact.type === "company" ? "secondary" : "outline"} className="text-xs">
                        {contact.type === "company" ? "Empresa" : "Persona"}
                      </Badge>
                      {contact.isLead && (
                        <Badge variant="default" className="text-xs bg-green-500">
                          Lead
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {contact.email && (
                        <span className="flex items-center gap-1 truncate">
                          <RiMailLine className="h-3 w-3" />
                          {contact.email}
                        </span>
                      )}
                      {contact.phone && (
                        <span className="flex items-center gap-1">
                          <RiPhoneLine className="h-3 w-3" />
                          {contact.phoneCountryCode} {contact.phone}
                        </span>
                      )}
                      {contact.city && (
                        <span className="flex items-center gap-1">
                          <RiMapPinLine className="h-3 w-3" />
                          {contact.city}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {contact.tags && contact.tags.length > 0 && (
                      <div className="flex gap-1">
                        {contact.tags.slice(0, 2).map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {contact.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{contact.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Contact Dialog */}
      <CreateContactDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onContactCreated={refetch}
      />

      {/* Contact Drawer */}
      <ContactDrawer
        contactId={selectedContactId}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onContactDeleted={refetch}
        onContactUpdated={refetch}
      />
    </div>
  );
}
