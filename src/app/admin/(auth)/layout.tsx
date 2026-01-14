import { Logo } from "@/components/ui/logo";

export default function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/80 p-12 flex-col justify-between">
        <Logo variant="full" size="md" theme="dark" />
        
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Panel de<br />
            Administración
          </h1>
          <p className="text-white/80 text-lg max-w-md">
            Gestiona usuarios, organizaciones y configuración de la plataforma HubEnts.
          </p>
          <div className="flex items-center gap-4 text-white/60 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Solo administradores</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Acceso por invitación</span>
            </div>
          </div>
        </div>

        <p className="text-white/40 text-sm">
          © {new Date().getFullYear()} HubEnts. Todos los derechos reservados.
        </p>
      </div>

      {/* Right side - Auth forms */}
      <div className="flex-1 flex items-center justify-center bg-muted p-4 lg:p-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
