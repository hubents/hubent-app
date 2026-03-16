import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Términos y Condiciones - HubEnts",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/" className="inline-block">
            <Image
              src="/images/isotipo-dark.png"
              alt="HubEnts"
              width={40}
              height={40}
            />
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">Términos y Condiciones</h1>
        <p className="text-muted-foreground mb-8">
          Última actualización: Marzo 2026
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Aceptación de los Términos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Al acceder y utilizar la plataforma HubEnts (&quot;el Servicio&quot;), operada por NapsixAI (&quot;nosotros&quot;),
              aceptas quedar vinculado por estos Términos y Condiciones. Si no estás de acuerdo con alguna parte
              de estos términos, no podrás acceder al Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Descripción del Servicio</h2>
            <p className="text-muted-foreground leading-relaxed">
              HubEnts es una plataforma SaaS de gestión integral de bodas y eventos que permite a planificadores
              de eventos y proveedores gestionar sus operaciones, incluyendo pero no limitado a: gestión de eventos,
              tareas, contactos, finanzas, invitados, formularios RSVP, y comunicación con equipos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Cuentas de Usuario</h2>
            <p className="text-muted-foreground leading-relaxed">
              Al crear una cuenta, te comprometes a proporcionar información veraz, completa y actualizada.
              Eres responsable de mantener la confidencialidad de tu contraseña y de todas las actividades
              que ocurran bajo tu cuenta. Debes notificarnos inmediatamente sobre cualquier uso no autorizado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Planes y Facturación</h2>
            <p className="text-muted-foreground leading-relaxed">
              El Servicio ofrece planes gratuitos y de pago. Los planes de pago se facturan de forma mensual
              o anual según la opción seleccionada. Los precios pueden cambiar con previo aviso de 30 días.
              Los períodos de prueba gratuitos no requieren tarjeta de crédito y se convierten automáticamente
              al plan gratuito al expirar si no se elige un plan de pago.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Uso Aceptable</h2>
            <p className="text-muted-foreground leading-relaxed">
              Te comprometes a utilizar el Servicio únicamente para fines legítimos de gestión de eventos.
              No está permitido: (a) violar leyes o regulaciones aplicables, (b) cargar contenido ilegal
              o infractor, (c) intentar acceder a cuentas de otros usuarios, (d) interferir con el
              funcionamiento del Servicio, (e) usar el Servicio para enviar comunicaciones no solicitadas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Propiedad Intelectual</h2>
            <p className="text-muted-foreground leading-relaxed">
              El Servicio y su contenido original, características y funcionalidad son propiedad exclusiva
              de NapsixAI. Los datos que subas al Servicio siguen siendo de tu propiedad. Al usar el Servicio,
              nos otorgas una licencia limitada para procesar tus datos con el único fin de proporcionarte el Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Limitación de Responsabilidad</h2>
            <p className="text-muted-foreground leading-relaxed">
              El Servicio se proporciona &quot;tal cual&quot; y &quot;según disponibilidad&quot;. No garantizamos que el Servicio
              sea ininterrumpido o libre de errores. En ningún caso NapsixAI será responsable por daños
              indirectos, incidentales, especiales o consecuentes que resulten del uso del Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Cancelación</h2>
            <p className="text-muted-foreground leading-relaxed">
              Puedes cancelar tu cuenta en cualquier momento desde la configuración de tu cuenta.
              Al cancelar, tendrás acceso al Servicio hasta el final del período de facturación actual.
              Nos reservamos el derecho de suspender o cancelar cuentas que violen estos términos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Modificaciones</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nos reservamos el derecho de modificar estos términos en cualquier momento.
              Te notificaremos sobre cambios significativos por email o mediante un aviso en el Servicio.
              El uso continuado del Servicio después de dichos cambios constituye tu aceptación de los
              nuevos términos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contacto</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para cualquier consulta sobre estos Términos, puedes contactarnos en:{" "}
              <a href="mailto:legal@hubents.com" className="text-primary hover:underline">
                legal@hubents.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} NapsixAI. Todos los derechos reservados.</p>
          <div className="flex gap-4 mt-2">
            <Link href="/privacy" className="hover:underline">Política de Privacidad</Link>
            <Link href="/auth/login" className="hover:underline">Iniciar sesión</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
