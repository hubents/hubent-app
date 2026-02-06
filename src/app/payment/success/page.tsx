"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RiCheckboxCircleLine } from "@remixicon/react";
import Link from "next/link";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <RiCheckboxCircleLine className="h-10 w-10 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl">¡Pago completado!</CardTitle>
          <CardDescription>
            Tu pago ha sido procesado correctamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Recibirás un email de confirmación con los detalles de tu pago.
          </p>
          {sessionId && (
            <p className="text-xs text-muted-foreground">
              Referencia: {sessionId.slice(0, 20)}...
            </p>
          )}
          <div className="pt-4">
            <Button asChild>
              <Link href="/">Volver al inicio</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
