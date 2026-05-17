import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Política de Privacidad - Hubents",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/" className="inline-block">
            <Image
              src="/images/isotipo-dark.png"
              alt="Hubents"
              width={40}
              height={40}
            />
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">Política de Privacidad</h1>
        <p className="text-muted-foreground mb-8">
          Última actualización: Marzo 2026
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Responsable del Tratamiento</h2>
            <p className="text-muted-foreground leading-relaxed">
              NapsixAI (&quot;nosotros&quot;) es el responsable del tratamiento de los datos personales
              recopilados a través de la plataforma Hubents (&quot;el Servicio&quot;). Para cualquier consulta
              sobre privacidad, puedes contactarnos en:{" "}
              <a href="mailto:privacy@hubents.com" className="text-primary hover:underline">
                privacy@hubents.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Datos que Recopilamos</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Recopilamos los siguientes tipos de datos personales:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Datos de registro:</strong> nombre, email, contraseña (cifrada), nombre de empresa.</li>
              <li><strong>Datos de perfil:</strong> teléfono, dirección, sitio web, redes sociales, categoría profesional.</li>
              <li><strong>Datos de uso:</strong> eventos creados, tareas, contactos, documentos financieros, archivos subidos.</li>
              <li><strong>Datos técnicos:</strong> dirección IP, tipo de navegador, páginas visitadas, cookies de sesión.</li>
              <li><strong>Datos de facturación:</strong> procesados directamente por Stripe; no almacenamos datos de tarjeta.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Finalidad del Tratamiento</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Utilizamos tus datos para:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Proporcionarte acceso y funcionalidad del Servicio.</li>
              <li>Gestionar tu cuenta y suscripción.</li>
              <li>Enviar comunicaciones transaccionales (confirmaciones, invitaciones, alertas).</li>
              <li>Mejorar el Servicio mediante análisis de uso agregado y anónimo.</li>
              <li>Cumplir con obligaciones legales y fiscales.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Base Legal</h2>
            <p className="text-muted-foreground leading-relaxed">
              El tratamiento de tus datos se basa en: (a) la ejecución del contrato de servicio,
              (b) tu consentimiento al registrarte, (c) nuestro interés legítimo en mejorar el Servicio,
              y (d) el cumplimiento de obligaciones legales. Puedes retirar tu consentimiento en cualquier
              momento sin que ello afecte la licitud del tratamiento previo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Compartición de Datos</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              No vendemos tus datos personales. Compartimos datos únicamente con:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Stripe:</strong> procesamiento de pagos y facturación.</li>
              <li><strong>Resend:</strong> envío de emails transaccionales.</li>
              <li><strong>Vercel:</strong> alojamiento y ejecución del Servicio.</li>
              <li><strong>Neon:</strong> almacenamiento de base de datos.</li>
              <li><strong>Cloudflare R2:</strong> almacenamiento de archivos subidos.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Todos nuestros proveedores cumplen con estándares de protección de datos adecuados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Retención de Datos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Conservamos tus datos mientras mantengas una cuenta activa. Al cancelar tu cuenta,
              eliminaremos tus datos personales en un plazo de 30 días, salvo aquellos que debamos
              conservar por obligaciones legales o fiscales (hasta 5 años para datos de facturación).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Tus Derechos</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Tienes derecho a:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Acceso:</strong> solicitar una copia de tus datos personales.</li>
              <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
              <li><strong>Supresión:</strong> solicitar la eliminación de tus datos.</li>
              <li><strong>Portabilidad:</strong> recibir tus datos en formato estructurado.</li>
              <li><strong>Oposición:</strong> oponerte al tratamiento de tus datos.</li>
              <li><strong>Limitación:</strong> solicitar la restricción del tratamiento.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Para ejercer estos derechos, contacta a{" "}
              <a href="mailto:privacy@hubents.com" className="text-primary hover:underline">
                privacy@hubents.com
              </a>.
              Responderemos en un plazo máximo de 30 días.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos cookies estrictamente necesarias para el funcionamiento del Servicio
              (autenticación, preferencias de sesión). No utilizamos cookies de seguimiento
              publicitario. Vercel Analytics recopila datos de uso anónimos y agregados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Seguridad</h2>
            <p className="text-muted-foreground leading-relaxed">
              Implementamos medidas técnicas y organizativas para proteger tus datos, incluyendo:
              cifrado de contraseñas, conexiones HTTPS, acceso restringido a datos, y auditorías
              periódicas de seguridad. Sin embargo, ningún método de transmisión por Internet es
              100% seguro.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Cambios en esta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nos reservamos el derecho de actualizar esta política. Te notificaremos sobre
              cambios significativos por email. La versión actualizada siempre estará disponible
              en esta página.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} NapsixAI. Todos los derechos reservados.</p>
          <div className="flex gap-4 mt-2">
            <Link href="/terms" className="hover:underline">Términos y Condiciones</Link>
            <Link href="/auth/login" className="hover:underline">Iniciar sesión</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
