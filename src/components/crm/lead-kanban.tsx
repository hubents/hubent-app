"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  MoreHorizontal, 
  Calendar, 
  DollarSign,
  GripVertical,
  Edit,
  Trash2,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface Lead {
  id: number;
  title: string;
  value: string | null;
  currency: string | null;
  stageId: number | null;
  status: string | null;
  probability: number | null;
  expectedCloseDate: Date | null;
  assignedTo: string | null;
  createdAt: Date | null;
  assignedUserName: string | null;
  assignedUserImage: string | null;
  contactId?: number | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactType?: string | null;
  contactAvatar?: string | null;
}

interface Stage {
  id: number;
  name: string;
  color: string | null;
  sortOrder: number | null;
  isWon: boolean | null;
  isLost: boolean | null;
  leads: Lead[];
  totalValue: number;
}

interface LeadKanbanProps {
  stages: Stage[];
  onLeadClick?: (lead: Lead) => void;
  onLeadMove?: (leadId: number, newStageId: number) => void;
  onAddLead?: (stageId: number) => void;
  onEditLead?: (lead: Lead) => void;
  onDeleteLead?: (leadId: number) => void;
}

export function LeadKanban({
  stages,
  onLeadClick,
  onLeadMove,
  onAddLead,
  onEditLead,
  onDeleteLead,
}: LeadKanbanProps) {
  const [draggedLead, setDraggedLead] = React.useState<Lead | null>(null);
  const [dragOverStage, setDragOverStage] = React.useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", lead.id.toString());
  };

  const handleDragOver = (e: React.DragEvent, stageId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, stageId: number) => {
    e.preventDefault();
    setDragOverStage(null);
    
    if (draggedLead && draggedLead.stageId !== stageId) {
      onLeadMove?.(draggedLead.id, stageId);
    }
    setDraggedLead(null);
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
    setDragOverStage(null);
  };

  const formatCurrency = (value: string | null, currency: string | null) => {
    if (!value) return null;
    const num = parseFloat(value);
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: currency || "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 p-4 min-w-max">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={cn(
              "w-[300px] flex-shrink-0 rounded-lg border bg-muted/30",
              dragOverStage === stage.id && "ring-2 ring-primary"
            )}
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            {/* Stage Header */}
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: stage.color || "#6366f1" }}
                />
                <h3 className="font-medium">{stage.name}</h3>
                <Badge variant="secondary" className="text-xs">
                  {stage.leads.length}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onAddLead?.(stage.id)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Stage Total */}
            {stage.totalValue > 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground border-b">
                Total: {formatCurrency(stage.totalValue.toString(), "EUR")}
              </div>
            )}

            {/* Leads */}
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="p-2 space-y-2">
                {stage.leads.map((lead) => (
                  <Card
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "cursor-grab active:cursor-grabbing transition-all",
                      draggedLead?.id === lead.id && "opacity-50 scale-95"
                    )}
                  >
                    <CardContent className="p-3 space-y-2">
                      {/* Lead Header */}
                      <div className="flex items-start justify-between">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => onLeadClick?.(lead)}
                        >
                          <h4 className="font-medium text-sm line-clamp-2">
                            {lead.title}
                          </h4>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onLeadClick?.(lead)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEditLead?.(lead)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => onDeleteLead?.(lead.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Contact Info */}
                      {lead.contactName && (
                        <div className="flex items-center gap-2 py-1 px-2 bg-muted/50 rounded text-xs">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={lead.contactAvatar || undefined} />
                            <AvatarFallback className={cn(
                              "text-[10px]",
                              lead.contactType === "company" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
                            )}>
                              {lead.contactName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate text-muted-foreground">{lead.contactName}</span>
                        </div>
                      )}

                      {/* Lead Value */}
                      {lead.value && (
                        <div className="flex items-center gap-1 text-sm font-medium text-primary">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(lead.value, lead.currency)}
                        </div>
                      )}

                      {/* Lead Footer */}
                      <div className="flex items-center justify-between pt-1">
                        {/* Expected Close Date */}
                        {lead.expectedCloseDate && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(lead.expectedCloseDate).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "short",
                            })}
                          </div>
                        )}

                        {/* Probability */}
                        {lead.probability && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              lead.probability >= 70 && "border-green-500 text-green-600",
                              lead.probability >= 40 && lead.probability < 70 && "border-yellow-500 text-yellow-600",
                              lead.probability < 40 && "border-red-500 text-red-600"
                            )}
                          >
                            {lead.probability}%
                          </Badge>
                        )}

                        {/* Assigned User */}
                        {lead.assignedUserName && (
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={lead.assignedUserImage || undefined} />
                            <AvatarFallback className="text-xs">
                              {lead.assignedUserName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {stage.leads.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No hay leads en esta etapa
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        ))}

        {/* Add Stage Button */}
        <div className="w-[300px] flex-shrink-0">
          <Button
            variant="outline"
            className="w-full h-12 border-dashed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Añadir etapa
          </Button>
        </div>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
