import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
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
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <h2 className="text-xl font-semibold mt-2">Página no encontrada</h2>
          <p className="text-muted-foreground mt-2">
            La página que buscas no existe o fue movida.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Ir al Dashboard
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
