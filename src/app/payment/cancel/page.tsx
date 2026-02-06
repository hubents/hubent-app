"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RiCloseCircleLine } from "@remixicon/react";
import Link from "next/link";

function PaymentCancelContent() {
  const searchParams = useSearchParams();
  const documentNumber = searchParams.get("document");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <RiCloseCircleLine className="h-10 w-10 text-gray-500" />
          </div>
          <CardTitle className="text-2xl">Pago cancelado</CardTitle>
          <CardDescription>
            El proceso de pago ha sido cancelado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            No se ha realizado ningún cargo. Puedes intentar de nuevo cuando lo desees.
          </p>
          {documentNumber && (
            <p className="text-xs text-muted-foreground">
              Documento: {documentNumber}
            </p>
          )}
          <div className="pt-4 flex gap-2 justify-center">
            <Button variant="outline" asChild>
              <Link href="/">Volver al inicio</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    }>
      <PaymentCancelContent />
    </Suspense>
  );
}
