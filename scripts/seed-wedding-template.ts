import "dotenv/config";
import { db } from "../src/db";
import { eventTemplates, taskTemplates, taskTemplateChecklists } from "../src/db/schema";
import { eq } from "drizzle-orm";

const WEDDING_TEMPLATE = {
  name: "Boda Completa",
  eventType: "wedding" as const,
  description: "Template completo para planificación de bodas con 12 fases, desde la reunión inicial hasta la reunión final. Incluye todas las tareas y checklists necesarios.",
  defaultBudget: 30000,
  isGlobal: true,
  tasks: [
    {
      title: "Reunión y sesión informativa",
      description: "Primera reunión con los novios para conocer sus expectativas y establecer objetivos.",
      htmlContent: `<p>Esta fase se realizará a través de una reunión personal/Zoom, para tener toda la información y establecer los objetivos y necesidades de cada pareja.</p>`,
      daysBeforeEvent: 180,
      priority: "high",
      checklists: [
        "Comunicación de las expectativas",
        "Presupuesto estimado",
      ],
    },
    {
      title: "Buscar venues",
      description: "Selección y visita de posibles lugares para la ceremonia y recepción.",
      htmlContent: `<p>El pago se realiza aparte y se aplica un descuento en el último pago.</p>
<p>Se seleccionan los lugares que la pareja desea visitar, ya sea presencial o virtualmente, se explican las ventajas y desventajas. El tour se paga con antelación de la siguiente manera: 50% antes de reservar los lugares, coordinar las fechas y programar. El 50% restante se pagará 48 horas antes del tour mediante transferencia bancaria o efectivo justo antes del inicio del tour.</p>
<p>El pago del tour se aplicará con el último pago.</p>`,
      daysBeforeEvent: 150,
      priority: "high",
      checklists: [
        "Confirmación de las fechas del tour",
        "Pago del tour",
        "Programar visitas",
      ],
    },
    {
      title: "Reservar venues",
      description: "Formalización de la reserva del lugar elegido.",
      htmlContent: `<p>En caso de desear una ceremonia religiosa, será necesario contactar con la iglesia para verificar su disponibilidad y realizar la reserva correspondiente. La pareja debe iniciar el proceso y entregar todos los documentos a su iglesia local 6 meses antes de la boda, debido a la fecha de vencimiento de algunos documentos.</p>`,
      daysBeforeEvent: 140,
      priority: "high",
      checklists: [
        "Firma del contrato",
        "Pago del primer lugar",
        "Enviar tarjeta 'Reserva la fecha'",
      ],
    },
    {
      title: "Contrato Wedding Planner",
      description: "Formalización del contrato de servicios de planificación.",
      htmlContent: `<p>Firma nuestro contrato y el primer pago del 40%. En nuestro cuestionario, les pediremos a los novios que especifiquen colores, gustos, preferencias musicales y otros detalles que nos permitirán conocerlos mejor y comprender su visión para el día de su boda.</p>`,
      daysBeforeEvent: 135,
      priority: "high",
      checklists: [
        "Firma del contrato y primer pago",
        "Rellenar cuestionario general",
      ],
    },
    {
      title: "Reservar proveedores principales",
      description: "Contratación de los proveedores esenciales para el evento.",
      htmlContent: `<p>Catering, Fotos/Videos, Flores, Decoración, Oficiante, Maquillaje y Peinado.</p>
<p>Al abrir el perfil de la pareja, nuestros clientes tendrán acceso a la lista de nuestros proveedores de confianza, donde crearán su propia lista de favoritos. A continuación, se mostrarán los proveedores que más les gusten.</p>
<p>Según nuestra experiencia, los proveedores recomendados para esta fase son Catering, Fotos/Videos, Flores, Decoración, Oficiante, Maquillaje y Peinado. Para formalizar estas reservas, se requiere un pago inicial y la firma del contrato.</p>`,
      daysBeforeEvent: 120,
      priority: "high",
      checklists: [
        "Seleccionar proveedores favoritos",
        "Firma del contrato y primer pago",
      ],
    },
    {
      title: "Calendario de pagos",
      description: "Establecimiento del cronograma de pagos a proveedores.",
      htmlContent: `<p>Crearemos un calendario compartido con la pareja donde tendremos todas las fechas de vencimiento y el porcentaje de los pagos. En el mismo se adjuntarán los comprobantes de pago, los contratos y todos los demás documentos que acompañen a dicha acción.</p>
<p>Para una mejor experiencia, estableceremos recordatorios una semana y dos días antes de realizar cualquier pago. De esta manera, la pareja tendrá tiempo para realizar cualquier transferencia a la fecha sin problemas.</p>`,
      daysBeforeEvent: 110,
      priority: "medium",
      checklists: [
        "Confirmación de fechas de pago",
      ],
    },
    {
      title: "Maqueta y diseño",
      description: "Definición de la temática visual y diseño del evento.",
      htmlContent: `<p>Comenzaremos con la fase de diseño, donde se definirá la temática de la boda, la paleta de colores, la distribución, el diseño/propuesta de las invitaciones, las flores y el mobiliario. Nos basaremos en Pinterest; las propuestas deberán seleccionarse previamente durante los cuestionarios del cuarto paso.</p>
<p>Nuestro equipo ofrecerá tres propuestas de diseño: la primera basada en tu Pinterest, la segunda versión actualizada tras recibir tus comentarios y el diseño final tras recibirlos. Una vez elegida la favorita, esta versión se enviará a la floristería y a los proveedores de decoración para solicitar presupuestos.</p>`,
      daysBeforeEvent: 90,
      priority: "medium",
      checklists: [
        "Elección de propuestas",
        "Comentarios y modificaciones",
      ],
    },
    {
      title: "Proveedores adicionales",
      description: "Contratación de servicios complementarios según el diseño.",
      htmlContent: `<p>Iluminación, espectáculos, entretenimiento y más, según el diseño.</p>
<p>Una vez confirmada la primera fase de diseño, comenzaremos a recomendar a los mejores proveedores que se ajusten perfectamente a las necesidades de servicios, productos o elementos, y así lograr el cumplimiento de los objetivos.</p>
<p>Generalmente, estos proveedores se dedican a la decoración, la iluminación, el mobiliario, etc.</p>
<p>Como es habitual, se requiere un pago para la contratación de estos proveedores, junto con la firma de los contratos correspondientes.</p>`,
      daysBeforeEvent: 75,
      priority: "medium",
      checklists: [
        "Selección de proveedores adicionales",
        "Firma del contrato y pagos",
      ],
    },
    {
      title: "Trámites y papelería",
      description: "Gestión de invitaciones, landing page y documentación.",
      htmlContent: `<p>Siguiendo la línea visual, la combinación de colores y todo lo previamente acordado se enviará al responsable de papelería junto con una copia del diseño. Esta servirá de guía para la creación de las invitaciones, tarjetas de ubicación, planos de asientos y cualquier otro soporte gráfico necesario.</p>
<p>También crearemos una página de destino con la siguiente información: horario de la ceremonia y recepción, si se trata de una preboda o postboda, recomendaciones de hoteles/restaurantes, preguntas frecuentes y cualquier otra información de interés para los invitados.</p>`,
      daysBeforeEvent: 60,
      priority: "medium",
      checklists: [
        "Selección de diseño de papelería",
        "Enviar información para la landing page",
        "Enviar invitaciones",
      ],
    },
    {
      title: "Catas y ensayos",
      description: "Pruebas de menú, maquillaje y peinado.",
      htmlContent: `<p>Maquillaje, Peluquería (segundo pago).</p>
<p>En esta etapa, fijaremos fechas para degustar el menú y realizar pruebas de peluquería y maquillaje. Acompañaremos a la pareja con asistencia y compañía para probar el menú y así tomaremos notas.</p>
<p>La pareja debe tener en cuenta que las pruebas del menú suelen realizarse durante los meses de noviembre, enero, febrero, marzo y abril, y como máximo 4 meses antes de la boda.</p>`,
      daysBeforeEvent: 45,
      priority: "medium",
      checklists: [
        "Confirmación de fechas y asistencia",
        "Segundo pago a proveedores",
      ],
    },
    {
      title: "Seating plan",
      description: "Distribución de invitados en las mesas.",
      htmlContent: `<p>Una vez confirmado el menú, tomaremos todos los datos de la confirmación de asistencia (RSVP) y se enviará una hoja con todos los invitados que completaron el cuestionario en la página de inicio (nombre, apellidos, asistente, preferencias de menú y notas).</p>
<p>También se enviará nuestra plantilla del plano de asientos, que debe completarse con el lugar que ocupará cada invitado. Este debe entregarse en menos de 45 días y así lo confirma el servicio de catering.</p>
<p>Se realizará una videollamada para comentar el diseño final. Firmar y aprobar el diseño.</p>`,
      daysBeforeEvent: 30,
      priority: "high",
      checklists: [
        "Confirmación del menú y configuración del plano",
        "Firma y confirmación del diseño",
      ],
    },
    {
      title: "Reunión final",
      description: "Revisión de todos los detalles antes del evento.",
      htmlContent: `<p>Programamos una reunión final entre los 7 y 3 días del evento para revisar cada detalle, como el horario, el protocolo de la ceremonia, los eventos durante el cóctel, la cena y los discursos, las sorpresas para los invitados, el corte del pastel, el primer baile, la lista de proveedores, etc.</p>
<p>El dinero se entregará a cada proveedor según lo previsto. Para mayor seguridad, el dinero será en efectivo y verificado para cada miembro de nuestro equipo. Posteriormente, lo guardaremos en sobres individuales que se entregarán a cada proveedor el día de la boda.</p>`,
      daysBeforeEvent: 7,
      priority: "high",
      checklists: [
        "Confirmación de fechas y asistencia",
        "Pagos restantes",
        "Último pago con descuento del tour",
      ],
    },
  ],
};

async function seedWeddingTemplate() {
  console.log("🌱 Seeding Wedding Template...\n");

  // Check if template already exists
  const existing = await db
    .select({ id: eventTemplates.id })
    .from(eventTemplates)
    .where(eq(eventTemplates.name, WEDDING_TEMPLATE.name))
    .limit(1);

  if (existing.length > 0) {
    console.log("⚠️  Template 'Boda Completa' already exists. Skipping...");
    console.log("   To recreate, delete the existing template first.\n");
    process.exit(0);
  }

  // Create event template
  const [template] = await db.insert(eventTemplates).values({
    organizationId: null, // Global template
    name: WEDDING_TEMPLATE.name,
    eventType: WEDDING_TEMPLATE.eventType,
    description: WEDDING_TEMPLATE.description,
    defaultBudget: WEDDING_TEMPLATE.defaultBudget.toString(),
    isGlobal: WEDDING_TEMPLATE.isGlobal,
    isActive: true,
  }).returning();

  console.log(`✅ Created template: ${template.name} (ID: ${template.id})`);

  // Create task templates with checklists
  for (let i = 0; i < WEDDING_TEMPLATE.tasks.length; i++) {
    const task = WEDDING_TEMPLATE.tasks[i];

    const [taskTpl] = await db.insert(taskTemplates).values({
      eventTemplateId: template.id,
      title: task.title,
      description: task.description,
      htmlContent: task.htmlContent,
      daysBeforeEvent: task.daysBeforeEvent,
      priority: task.priority,
      sortOrder: i,
    }).returning();

    console.log(`   📋 Task ${i + 1}: ${task.title}`);

    // Create checklist items
    for (let j = 0; j < task.checklists.length; j++) {
      await db.insert(taskTemplateChecklists).values({
        taskTemplateId: taskTpl.id,
        title: task.checklists[j],
        sortOrder: j,
      });
    }
    console.log(`      └─ ${task.checklists.length} checklist items`);
  }

  console.log(`\n🎉 Wedding template created successfully!`);
  console.log(`   Total tasks: ${WEDDING_TEMPLATE.tasks.length}`);
  console.log(`   Total checklist items: ${WEDDING_TEMPLATE.tasks.reduce((acc, t) => acc + t.checklists.length, 0)}`);

  process.exit(0);
}

seedWeddingTemplate().catch((error) => {
  console.error("❌ Error seeding template:", error);
  process.exit(1);
});
