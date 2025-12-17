import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RemixiconComponentType } from "@remixicon/react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: RemixiconComponentType;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatsCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--muted-foreground)]">
              {title}
            </p>
            <p className="text-3xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-[var(--muted-foreground)]">
                {description}
              </p>
            )}
            {trend && (
              <p
                className={cn(
                  "text-xs font-medium",
                  trend.isPositive
                    ? "text-[var(--success)]"
                    : "text-[var(--destructive)]"
                )}
              >
                {trend.isPositive ? "+" : "-"}
                {Math.abs(trend.value)}% vs mes anterior
              </p>
            )}
          </div>
          <div className="rounded-lg bg-[var(--primary)]/10 p-3">
            <Icon className="h-6 w-6 text-[var(--primary)]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
