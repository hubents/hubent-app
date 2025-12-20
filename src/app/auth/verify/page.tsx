import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function VerifyPage() {
  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-[var(--primary)]/10">
            <Mail className="h-8 w-8 text-[var(--primary)]" />
          </div>
        </div>
        <CardTitle className="text-2xl">Revisa tu email</CardTitle>
        <CardDescription>
          Te enviamos un link de acceso a tu correo electrónico.
          <br />
          Haz clic en el link para iniciar sesión.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-[var(--muted)] text-sm text-center">
          <p className="text-[var(--muted-foreground)]">
            El link expira en <strong>24 horas</strong>.
            <br />
            Si no lo ves, revisa tu carpeta de spam.
          </p>
        </div>

        <Link href="/auth/login">
          <Button variant="outline" className="w-full gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al login
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
