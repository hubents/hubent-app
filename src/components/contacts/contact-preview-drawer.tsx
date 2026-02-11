"use client";

import { useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  RiMailLine,
  RiPhoneLine,
  RiMapPinLine,
  RiGlobalLine,
  RiBuilding2Line,
  RiUserLine,
  RiStore2Line,
  RiEditLine,
  RiCalendarEventLine,
  RiFileListLine,
  RiIdCardLine,
} from "@remixicon/react";
import { useContactDetail } from "@/hooks/use-contact-detail";

interface ContactPreviewDrawerProps {
  contactId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export function ContactPreviewDrawer({
  contactId,
  open,
  onOpenChange,
  onEdit,
}: ContactPreviewDrawerProps) {
  const { contact, linkedEvents, linkedTasks, loading, refetch } = useContactDetail(contactId);

  useEffect(() => {
    if (open && contactId) {
      refetch();
    }
  }, [open, contactId, refetch]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getContactDisplayType = (): "Persona" | "Empresa" | "Proveedor" => {
    if (!contact) return "Persona";
    if (contact.isVendor) return "Proveedor";
    return contact.type === "company" ? "Empresa" : "Persona";
  };

  const getContactCategory = (): string | null => {
    if (!contact) return null;
    if (contact.isVendor) return contact.vendorCategory;
    return null;
  };

  const getTypeIcon = () => {
    if (!contact) return <RiUserLine className="h-5 w-5" />;
    if (contact.isVendor) return <RiStore2Line className="h-5 w-5" />;
    if (contact.type === "company") return <RiBuilding2Line className="h-5 w-5" />;
    return <RiUserLine className="h-5 w-5" />;
  };

  const getTypeBadgeColor = () => {
    if (!contact) return "";
    if (contact.isVendor) return "bg-green-500 text-white";
    if (contact.type === "company") return "bg-purple-100 text-purple-700";
    return "bg-blue-100 text-blue-700";
  };

  const formatAddress = () => {
    if (!contact) return null;
    const parts = [contact.address, contact.city, contact.state, contact.postalCode, contact.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        {loading ? (
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : contact ? (
          <>
            <SheetHeader className="pb-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={contact.avatar || undefined} />
                  <AvatarFallback className={getTypeBadgeColor()}>
                    {contact.type === "company" ? (
                      <RiBuilding2Line className="h-8 w-8" />
                    ) : (
                      getInitials(contact.name)
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-xl truncate">{contact.name}</SheetTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={getTypeBadgeColor()}>
                      {getTypeIcon()}
                      <span className="ml-1">{getContactDisplayType()}</span>
                    </Badge>
                    {getContactCategory() && (
                      <Badge variant="outline">{getContactCategory()}</Badge>
                    )}
                    {contact.isLead && !contact.isVendor && (
                      <Badge className="bg-amber-500 text-white">Lead</Badge>
                    )}
                  </div>
                  {contact.tradeName && (
                    <p className="text-sm text-muted-foreground mt-1">{contact.tradeName}</p>
                  )}
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-6 py-4">
              {/* Contact Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Datos de contacto</h3>
                <div className="space-y-2">
                  {contact.email && (
                    <div className="flex items-center gap-3">
                      <RiMailLine className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${contact.email}`} className="text-sm hover:underline">
                        {contact.email}
                      </a>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-3">
                      <RiPhoneLine className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${contact.phoneCountryCode}${contact.phone}`} className="text-sm hover:underline">
                        {contact.phoneCountryCode} {contact.phone}
                      </a>
                    </div>
                  )}
                  {contact.website && (
                    <div className="flex items-center gap-3">
                      <RiGlobalLine className="h-4 w-4 text-muted-foreground" />
                      <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline">
                        {contact.website}
                      </a>
                    </div>
                  )}
                  {formatAddress() && (
                    <div className="flex items-start gap-3">
                      <RiMapPinLine className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{formatAddress()}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Identification */}
              {(contact.nieOrCif || contact.taxId) && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground">Identificación</h3>
                    <div className="space-y-2">
                      {contact.nieOrCif && (
                        <div className="flex items-center gap-3">
                          <RiIdCardLine className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">NIF/NIE: {contact.nieOrCif}</span>
                        </div>
                      )}
                      {contact.taxId && (
                        <div className="flex items-center gap-3">
                          <RiIdCardLine className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">CIF: {contact.taxId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Linked Events */}
              {linkedEvents && linkedEvents.length > 0 && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground">Eventos vinculados</h3>
                    <div className="space-y-2">
                      {linkedEvents.slice(0, 5).map((event) => (
                        <div key={event.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                          <RiCalendarEventLine className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{event.eventName}</p>
                            {event.role && (
                              <p className="text-xs text-muted-foreground">{event.role}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {linkedEvents.length > 5 && (
                        <p className="text-xs text-muted-foreground">
                          +{linkedEvents.length - 5} más
                        </p>
                      )}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Linked Tasks */}
              {linkedTasks && linkedTasks.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Tareas vinculadas</h3>
                  <div className="space-y-2">
                    {linkedTasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                        <RiFileListLine className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.taskTitle}</p>
                          {task.taskStatus && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {task.taskStatus}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {linkedTasks.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        +{linkedTasks.length - 5} más
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {contact.notes && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground">Notas</h3>
                    <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
                  </div>
                </>
              )}
            </div>

            <SheetFooter className="pt-4">
              <Button onClick={onEdit} className="w-full gap-2">
                <RiEditLine className="h-4 w-4" />
                Editar contacto
              </Button>
            </SheetFooter>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No se encontró el contacto</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
