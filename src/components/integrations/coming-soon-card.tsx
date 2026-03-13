"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

interface ComingSoonCardProps {
  slug: string;
  name: string;
  description: string;
  category: string;
  logoUrl: string;
}

export function ComingSoonCard({
  name,
  description,
  category,
  logoUrl,
}: ComingSoonCardProps) {
  return (
    <Card className="relative overflow-hidden border-dashed opacity-80 hover:opacity-100 transition-opacity">
      <CardContent className="p-3">
        <div className="flex items-start gap-2.5">
          <div className="shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center">
            <Image
              src={logoUrl}
              alt={name}
              width={18}
              height={18}
              unoptimized
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-medium text-xs">{name}</h3>
              <Badge
                variant="outline"
                className="text-[9px] px-1 py-0 border-amber-300 text-amber-600 bg-amber-50"
              >
                Próximamente
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
              {description}
            </p>
          </div>

          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0">
            {category}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
