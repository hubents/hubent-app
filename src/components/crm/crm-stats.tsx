"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  RiMoneyDollarCircleLine,
  RiUserLine,
  RiPercentLine,
  RiTrophyLine,
  RiTimeLine,
  RiArrowUpLine,
  RiArrowDownLine,
} from "@remixicon/react";

interface Stage {
  id: number;
  name: string;
  color: string | null;
  leads: Array<{
    id: number;
    value: string | null;
    probability: number | null;
    stageChangedAt?: Date | null;
    createdAt?: Date | null;
  }>;
  totalValue: number;
  isWon?: boolean | null;
  isLost?: boolean | null;
}

// Helper to calculate days in stage
function getDaysInStage(stageChangedAt: Date | null | undefined, createdAt: Date | null | undefined): number {
  const referenceDate = stageChangedAt || createdAt;
  if (!referenceDate) return 0;
  const now = new Date();
  const changed = new Date(referenceDate);
  const diffTime = Math.abs(now.getTime() - changed.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

interface CRMStatsProps {
  stages: Stage[];
  loading?: boolean;
}

export function CRMStats({ stages, loading }: CRMStatsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-8 w-24 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate metrics
  const totalLeads = stages.reduce((sum, s) => sum + s.leads.length, 0);
  const totalValue = stages.reduce((sum, s) => sum + s.totalValue, 0);
  
  // Find won/lost stages by flag or by name pattern
  const wonStage = stages.find(s => s.isWon === true) || 
    stages.find(s => s.name.toLowerCase().includes('ganado') || s.name.toLowerCase().includes('won'));
  const lostStage = stages.find(s => s.isLost === true) || 
    stages.find(s => s.name.toLowerCase().includes('perdido') || s.name.toLowerCase().includes('lost'));
  
  const wonLeads = wonStage?.leads.length || 0;
  const lostLeads = lostStage?.leads.length || 0;
  const wonValue = wonStage?.totalValue || 0;
  const lostValue = lostStage?.totalValue || 0;
  const activeLeads = totalLeads - wonLeads - lostLeads;
  
  // Weighted pipeline value (by probability)
  const weightedValue = stages.reduce((sum, stage) => {
    return sum + stage.leads.reduce((stageSum, lead) => {
      const value = parseFloat(lead.value || "0");
      const prob = (lead.probability || 50) / 100;
      return stageSum + (value * prob);
    }, 0);
  }, 0);

  // Conversion rate
  const closedDeals = wonLeads + lostLeads;
  const conversionRate = closedDeals > 0 ? (wonLeads / closedDeals) * 100 : 0;

  // Average deal value
  const avgDealValue = totalLeads > 0 ? totalValue / totalLeads : 0;

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `€${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `€${(value / 1000).toFixed(1)}K`;
    }
    return `€${value.toLocaleString("es-ES")}`;
  };

  // Get max value for funnel visualization
  const maxLeads = Math.max(...stages.filter(s => !s.isWon && !s.isLost).map(s => s.leads.length), 1);

  return (
    <div className="space-y-6">
      {/* Main KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Total Pipeline Value */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pipeline Total</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totalValue)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ponderado: {formatCurrency(weightedValue)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <RiMoneyDollarCircleLine className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Leads */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Leads Activos</p>
                <p className="text-2xl font-bold mt-1">{activeLeads}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  de {totalLeads} totales
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <RiUserLine className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tasa Conversión</p>
                <p className="text-2xl font-bold mt-1">{conversionRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {wonLeads} ganados / {closedDeals} cerrados
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <RiPercentLine className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Won Value */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valor Ganado</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(wonValue)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Promedio: {formatCurrency(avgDealValue)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <RiTrophyLine className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Funnel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Embudo de Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stages.filter(s => !s.isWon && !s.isLost).map((stage, index) => {
              const percentage = maxLeads > 0 ? (stage.leads.length / maxLeads) * 100 : 0;
              const stagePercentage = totalLeads > 0 ? (stage.leads.length / totalLeads) * 100 : 0;
              
              return (
                <div key={stage.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: stage.color || "#6366f1" }}
                      />
                      <span className="font-medium">{stage.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="font-mono">
                        {stage.leads.length}
                      </Badge>
                      <span className="text-muted-foreground w-16 text-right">
                        {formatCurrency(stage.totalValue)}
                      </span>
                      <span className="text-muted-foreground w-12 text-right text-xs">
                        {stagePercentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <Progress 
                      value={percentage} 
                      className="h-2"
                      style={{ 
                        // @ts-ignore
                        "--progress-background": stage.color || "#6366f1" 
                      } as React.CSSProperties}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Won/Lost Summary */}
          <div className="mt-6 pt-4 border-t grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <RiArrowUpLine className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Ganados</p>
                <p className="text-lg font-bold">{wonLeads} <span className="text-sm font-normal text-muted-foreground">({formatCurrency(wonValue)})</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <RiArrowDownLine className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Perdidos</p>
                <p className="text-lg font-bold">{lostLeads} <span className="text-sm font-normal text-muted-foreground">({formatCurrency(lostValue)})</span></p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
