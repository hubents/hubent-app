"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RiExternalLinkLine, RiInformationLine } from "@remixicon/react";
import Image from "next/image";

interface IntegrationCardProps {
  slug: string;
  name: string;
  description: string;
  icon: string;
  requiresBusiness: boolean;
  helpUrl: string | null;
  helpTooltip: string | null;
  isConnected: boolean;
  status: string;
  connectedEmail: string | null;
  connectedByName: string | null;
  connectedAt: string | null;
  canManage: boolean;
  onConnect: (slug: string) => void;
  onDisconnect: (slug: string) => void;
}

export function IntegrationCard({
  slug,
  name,
  description,
  icon,
  requiresBusiness,
  helpUrl,
  helpTooltip,
  isConnected,
  status,
  connectedEmail,
  connectedByName,
  connectedAt,
  canManage,
  onConnect,
  onDisconnect,
}: IntegrationCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <Image src={icon} alt={name} width={24} height={24} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm">{name}</h3>
              {isConnected ? (
                <Badge variant="default" className="bg-green-600 text-[10px] px-1.5 py-0">
                  Conectado
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  No conectado
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>

            {isConnected && connectedEmail && (
              <p className="text-xs text-muted-foreground mt-1">
                {connectedEmail}
                {connectedByName && (
                  <span> · Conectado por {connectedByName}</span>
                )}
              </p>
            )}

            {requiresBusiness && !isConnected && (
              <div className="flex items-center gap-1 mt-1.5">
                <span className="text-[10px] text-amber-600 font-medium">
                  Requiere cuenta Business
                </span>
                {helpTooltip && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <RiInformationLine className="w-3.5 h-3.5 text-amber-600 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        {helpTooltip}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {helpUrl && (
                  <a
                    href={helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    Cómo configurar
                    <RiExternalLinkLine className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 flex gap-1.5">
            {isConnected ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onConnect(slug)}
                  disabled={!canManage}
                >
                  Reconectar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => onDisconnect(slug)}
                  disabled={!canManage}
                >
                  Desconectar
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => onConnect(slug)}
                disabled={!canManage}
              >
                Conectar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
