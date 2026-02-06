"use client";

import { Button } from "@/components/ui/button";
import { RiBellLine } from "@remixicon/react";
import { toast } from "sonner";

interface ComingSoonPageProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  features?: string[];
}

export function ComingSoonPage({ icon, title, description, features }: ComingSoonPageProps) {
  const handleNotify = () => {
    toast.success("¡Te notificaremos cuando esté disponible!");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="mb-6 text-muted-foreground opacity-50">
        {icon}
      </div>
      
      <h1 className="text-3xl font-bold mb-3">{title}</h1>
      
      <p className="text-muted-foreground max-w-md mb-6">
        {description}
      </p>

      {features && features.length > 0 && (
        <div className="mb-8 text-left">
          <p className="text-sm font-medium mb-2">Próximamente podrás:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button onClick={handleNotify} variant="outline" className="gap-2">
        <RiBellLine className="h-4 w-4" />
        Notificarme cuando esté listo
      </Button>

      <p className="text-xs text-muted-foreground mt-8">
        Estamos trabajando para traerte esta funcionalidad pronto
      </p>
    </div>
  );
}
