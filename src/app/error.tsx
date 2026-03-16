"use client";

import { useEffect } from "react";
import Image from "next/image";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md">
        <Image
          src="/images/isotipo-dark.png"
          alt="HubEnts"
          width={48}
          height={48}
          className="mx-auto"
        />
        <div>
          <h1 className="text-4xl font-bold text-destructive">Error</h1>
          <h2 className="text-xl font-semibold mt-2">Algo salió mal</h2>
          <p className="text-muted-foreground mt-2">
            Ocurrió un error inesperado. Intentá de nuevo o contactá soporte si el problema persiste.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground mt-1">
              Ref: {error.digest}
            </p>
          )}
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Intentar de nuevo
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Ir al Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
