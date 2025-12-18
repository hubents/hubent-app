import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--muted)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="flex items-center gap-3">
              <Image
                src="/images/icon.png"
                alt="HubEnts"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className="text-2xl font-bold">hubents</span>
            </div>
          </div>
          
          {/* Email Icon */}
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-[var(--primary)]/10">
              <Mail className="h-8 w-8 text-[var(--primary)]" />
            </div>
          </div>

          <div>
            <CardTitle className="text-xl">Revisa tu email</CardTitle>
            <CardDescription className="mt-2">
              Te enviamos un link de acceso a tu correo electrónico.
              <br />
              Haz clic en el link para iniciar sesión.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-[var(--muted)] text-sm text-center">
            <p className="text-[var(--muted-foreground)]">
              El link expira en <strong>24 horas</strong>.
              <br />
              Si no lo ves, revisa tu carpeta de spam.
            </p>
          </div>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
