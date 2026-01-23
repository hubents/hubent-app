import "dotenv/config";
import { db } from "../src/db";
import { eventTemplates, taskTemplates, taskTemplateChecklists } from "../src/db/schema";
import { eq } from "drizzle-orm";

// ============================================
// 1. PRE-BODA - Despedida de Soltero/a Premium
// ============================================
const PRE_WEDDING_TEMPLATE = {
  name: "Despedida de Soltero/a Premium",
  eventType: "pre_wedding" as const,
  description: "Template completo para organizar una despedida de soltero/a inolvidable. Incluye planificación de actividades, coordinación de invitados y sorpresas.",
  defaultBudget: 5000,
  isGlobal: true,
  tasks: [
    {
      title: "Reunión secreta de organización",
      description: "Coordinar con los mejores amigos/as para planificar la despedida sin que el/la homenajeado/a se entere.",
      htmlContent: `<p>Esta es la fase más importante: <strong>mantener el secreto</strong>. Reúne al grupo de organizadores (normalmente padrinos, damas de honor o mejores amigos) para definir el concepto de la despedida.</p>
<p>Considera el estilo del homenajeado/a: ¿prefiere algo tranquilo como un spa day o algo más aventurero como paintball o escape rooms?</p>`,
      daysBeforeEvent: 60,
      priority: "high",
      checklists: [
        "Crear grupo de WhatsApp secreto",
        "Definir fecha tentativa",
        "Establecer presupuesto por persona",
        "Asignar roles (tesorero, coordinador de actividades, fotógrafo)",
      ],
    },
    {
      title: "Definir concepto y actividades",
      description: "Elegir el tema y las actividades principales del evento.",
      htmlContent: `<p>Ideas populares según el perfil:</p>
<ul>
<li><strong>Aventurero/a:</strong> Rafting, paracaidismo, karting, paintball</li>
<li><strong>Relajado/a:</strong> Spa day, cata de vinos, retiro de yoga</li>
<li><strong>Fiestero/a:</strong> Pool party, club nocturno, karaoke privado</li>
<li><strong>Gourmet:</strong> Clase de cocina, tour gastronómico, cena degustación</li>
</ul>`,
      daysBeforeEvent: 45,
      priority: "high",
      checklists: [
        "Encuesta anónima a invitados sobre preferencias",
        "Seleccionar 2-3 actividades principales",
        "Definir dress code o temática",
        "Investigar opciones de transporte grupal",
      ],
    },
    {
      title: "Reservas y logística",
      description: "Confirmar reservas de actividades, restaurantes y alojamiento si aplica.",
      htmlContent: `<p>Es momento de pasar de la planificación a la acción. Realiza todas las reservas necesarias y asegura los depósitos.</p>
<p><strong>Tip:</strong> Siempre menciona que es una despedida de soltero/a, muchos lugares ofrecen extras o descuentos especiales.</p>`,
      daysBeforeEvent: 30,
      priority: "high",
      checklists: [
        "Reservar actividad principal",
        "Reservar restaurante para cena/almuerzo",
        "Reservar transporte (limusina, minibus, etc.)",
        "Confirmar alojamiento si es fin de semana",
        "Pagar depósitos necesarios",
      ],
    },
    {
      title: "Coordinar invitados",
      description: "Gestionar confirmaciones y recolectar pagos.",
      htmlContent: `<p>Envía la invitación oficial con todos los detalles (sin revelar sorpresas). Incluye:</p>
<ul>
<li>Fecha, hora y punto de encuentro</li>
<li>Monto a pagar por persona</li>
<li>Fecha límite de confirmación y pago</li>
<li>Qué llevar (ropa cómoda, traje de baño, etc.)</li>
</ul>`,
      daysBeforeEvent: 21,
      priority: "medium",
      checklists: [
        "Enviar invitación con detalles",
        "Crear sistema de pago (Mercado Pago, transferencia)",
        "Seguimiento de confirmaciones",
        "Lista de contactos de emergencia",
      ],
    },
    {
      title: "Preparar sorpresas y detalles",
      description: "Organizar los elementos especiales que harán única la despedida.",
      htmlContent: `<p>Los detalles marcan la diferencia. Algunas ideas:</p>
<ul>
<li>Camisetas personalizadas del grupo</li>
<li>Álbum de fotos con mensajes de los invitados</li>
<li>Video sorpresa con saludos de amigos que no pueden asistir</li>
<li>Juegos y retos durante el evento</li>
<li>Regalo grupal para el/la homenajeado/a</li>
</ul>`,
      daysBeforeEvent: 14,
      priority: "medium",
      checklists: [
        "Encargar camisetas/accesorios personalizados",
        "Preparar juegos y retos",
        "Recopilar fotos para slideshow",
        "Comprar decoración temática",
        "Preparar regalo grupal",
      ],
    },
    {
      title: "Confirmación final",
      description: "Últimos ajustes y confirmación de todos los detalles.",
      htmlContent: `<p>Una semana antes, confirma todo:</p>
<ul>
<li>Reconfirma reservas por teléfono</li>
<li>Envía recordatorio a invitados con itinerario final</li>
<li>Prepara kit de emergencia (cargadores, botiquín, efectivo)</li>
</ul>`,
      daysBeforeEvent: 7,
      priority: "high",
      checklists: [
        "Reconfirmar todas las reservas",
        "Enviar itinerario final a invitados",
        "Verificar pagos pendientes",
        "Preparar playlist del evento",
        "Cargar cámaras y preparar almacenamiento",
      ],
    },
    {
      title: "Día del evento",
      description: "Coordinación durante la despedida.",
      htmlContent: `<p><strong>¡Es el gran día!</strong> Como organizador, tu rol es asegurar que todo fluya sin que el/la homenajeado/a tenga que preocuparse por nada.</p>
<p>Mantén el itinerario flexible pero organizado. Lo más importante es que todos se diviertan.</p>`,
      daysBeforeEvent: 0,
      priority: "high",
      checklists: [
        "Llegar temprano al punto de encuentro",
        "Verificar que todos los invitados lleguen",
        "Coordinar sorpresas en el momento indicado",
        "Documentar todo con fotos y videos",
        "Gestionar imprevistos con calma",
      ],
    },
  ],
};

// ============================================
// 2. POST-BODA - Celebración Post-Boda
// ============================================
const POST_WEDDING_TEMPLATE = {
  name: "Celebración Post-Boda Completa",
  eventType: "post_wedding" as const,
  description: "Template para organizar eventos post-boda: brunch del día después, fiesta de agradecimiento, o celebración para quienes no pudieron asistir a la boda.",
  defaultBudget: 8000,
  isGlobal: true,
  tasks: [
    {
      title: "Definir tipo de celebración",
      description: "Decidir qué tipo de evento post-boda se realizará.",
      htmlContent: `<p>Opciones populares de celebración post-boda:</p>
<ul>
<li><strong>Brunch del día después:</strong> Reunión íntima con familia y amigos cercanos que viajaron para la boda</li>
<li><strong>Fiesta de agradecimiento:</strong> Celebración casual semanas después para agradecer a todos</li>
<li><strong>Segunda recepción:</strong> Para familiares/amigos que no pudieron asistir a la boda principal</li>
<li><strong>Aniversario de un mes:</strong> Celebración íntima del primer mes de casados</li>
</ul>`,
      daysBeforeEvent: 30,
      priority: "high",
      checklists: [
        "Decidir formato del evento",
        "Definir fecha y horario",
        "Establecer presupuesto",
        "Crear lista preliminar de invitados",
      ],
    },
    {
      title: "Seleccionar venue",
      description: "Elegir el lugar ideal para la celebración.",
      htmlContent: `<p>El venue depende del tipo de evento:</p>
<ul>
<li><strong>Brunch:</strong> Restaurante con salón privado, hotel donde se hospedan invitados, casa familiar</li>
<li><strong>Fiesta casual:</strong> Jardín, rooftop, salón de eventos pequeño</li>
<li><strong>Segunda recepción:</strong> Similar al venue de boda pero más íntimo</li>
</ul>`,
      daysBeforeEvent: 21,
      priority: "high",
      checklists: [
        "Visitar 2-3 opciones de venue",
        "Comparar precios y capacidad",
        "Verificar disponibilidad de fecha",
        "Reservar con depósito",
      ],
    },
    {
      title: "Planificar catering y menú",
      description: "Definir la propuesta gastronómica del evento.",
      htmlContent: `<p>El menú debe ser acorde al horario y estilo:</p>
<ul>
<li><strong>Brunch:</strong> Buffet con opciones dulces y saladas, mimosas, café de especialidad</li>
<li><strong>Almuerzo/Cena:</strong> Menú de 3 tiempos o estaciones de comida</li>
<li><strong>Cocktail:</strong> Finger food, estaciones temáticas, barra de tragos</li>
</ul>`,
      daysBeforeEvent: 14,
      priority: "medium",
      checklists: [
        "Solicitar propuestas de catering",
        "Definir menú considerando restricciones alimentarias",
        "Incluir torta o postre especial",
        "Planificar barra de bebidas",
      ],
    },
    {
      title: "Enviar invitaciones",
      description: "Comunicar a los invitados sobre la celebración.",
      htmlContent: `<p>Las invitaciones pueden ser más informales que las de la boda:</p>
<ul>
<li>Invitación digital (Canva, Paperless Post)</li>
<li>Mensaje de WhatsApp con diseño bonito</li>
<li>Tarjeta física para eventos más formales</li>
</ul>
<p>Incluye: fecha, hora, lugar, dress code y si es sorpresa para alguno de los novios.</p>`,
      daysBeforeEvent: 10,
      priority: "medium",
      checklists: [
        "Diseñar invitación",
        "Enviar a todos los invitados",
        "Crear sistema de confirmación (Google Forms, WhatsApp)",
        "Seguimiento de RSVPs",
      ],
    },
    {
      title: "Preparar elementos especiales",
      description: "Organizar detalles que hagan memorable el evento.",
      htmlContent: `<p>Ideas para hacer especial la celebración:</p>
<ul>
<li>Slideshow con fotos de la boda</li>
<li>Libro de firmas para mensajes</li>
<li>Pequeños regalos de agradecimiento</li>
<li>Playlist con canciones de la boda</li>
<li>Photobooth con props</li>
</ul>`,
      daysBeforeEvent: 7,
      priority: "medium",
      checklists: [
        "Seleccionar fotos de la boda para mostrar",
        "Preparar agradecimiento para invitados",
        "Coordinar música/DJ",
        "Organizar decoración",
        "Preparar discurso de agradecimiento",
      ],
    },
    {
      title: "Coordinación final",
      description: "Últimos detalles antes del evento.",
      htmlContent: `<p>Confirma todo y prepárate para disfrutar. Este evento es para celebrar y agradecer, así que delega lo que puedas y disfruta del momento.</p>`,
      daysBeforeEvent: 2,
      priority: "high",
      checklists: [
        "Confirmar número final de asistentes",
        "Reconfirmar con proveedores",
        "Preparar sobres/regalos de agradecimiento",
        "Verificar equipos de audio/video",
        "Designar persona para coordinar el día del evento",
      ],
    },
  ],
};

// ============================================
// 3. CUMPLEAÑOS - Fiesta Temática Épica
// ============================================
const BIRTHDAY_TEMPLATE = {
  name: "Fiesta de Cumpleaños Temática",
  eventType: "birthday" as const,
  description: "Template para organizar una fiesta de cumpleaños memorable con temática personalizada. Ideal para cumpleaños importantes (15, 18, 30, 40, 50+).",
  defaultBudget: 15000,
  isGlobal: true,
  tasks: [
    {
      title: "Definir concepto y temática",
      description: "Elegir el tema central de la fiesta basado en los gustos del cumpleañero/a.",
      htmlContent: `<p>La temática define todo el evento. Ideas populares:</p>
<ul>
<li><strong>Décadas:</strong> Años 80, 90, 2000 - música y estética de la época</li>
<li><strong>Colores:</strong> All white, black & gold, neon party</li>
<li><strong>Películas/Series:</strong> Hollywood, Gatsby, Peaky Blinders, Harry Potter</li>
<li><strong>Destinos:</strong> Noche en París, Havana nights, Fiesta mexicana</li>
<li><strong>Conceptos:</strong> Garden party, Pool party, Masquerade ball</li>
</ul>
<p>Considera la edad y personalidad del homenajeado/a para elegir algo que realmente lo represente.</p>`,
      daysBeforeEvent: 45,
      priority: "high",
      checklists: [
        "Conversar con el cumpleañero/a sobre preferencias",
        "Investigar tendencias de fiestas temáticas",
        "Definir temática final",
        "Crear moodboard de inspiración (Pinterest)",
        "Establecer paleta de colores",
      ],
    },
    {
      title: "Seleccionar venue y fecha",
      description: "Encontrar el lugar perfecto que se adapte a la temática.",
      htmlContent: `<p>El venue debe potenciar la temática elegida:</p>
<ul>
<li><strong>Elegante:</strong> Salón de eventos, rooftop, restaurante privado</li>
<li><strong>Casual:</strong> Jardín, quincho, casa con piscina</li>
<li><strong>Alternativo:</strong> Bodega, galería de arte, teatro</li>
</ul>
<p>Considera: capacidad, estacionamiento, horarios permitidos de música, y si permite decoración propia.</p>`,
      daysBeforeEvent: 35,
      priority: "high",
      checklists: [
        "Listar venues potenciales",
        "Visitar al menos 3 opciones",
        "Verificar disponibilidad en fecha deseada",
        "Negociar precio y condiciones",
        "Firmar contrato y pagar reserva",
      ],
    },
    {
      title: "Contratar proveedores clave",
      description: "Asegurar los servicios esenciales para la fiesta.",
      htmlContent: `<p>Proveedores típicos para una fiesta de cumpleaños:</p>
<ul>
<li><strong>Catering:</strong> Menú acorde a la temática y horario</li>
<li><strong>DJ/Banda:</strong> Música que combine con el tema</li>
<li><strong>Decoración:</strong> Profesional o DIY según presupuesto</li>
<li><strong>Fotografía:</strong> Para capturar los mejores momentos</li>
<li><strong>Torta:</strong> Diseño personalizado con la temática</li>
</ul>`,
      daysBeforeEvent: 28,
      priority: "high",
      checklists: [
        "Solicitar presupuestos de catering",
        "Contratar DJ o banda",
        "Reservar fotógrafo/videógrafo",
        "Encargar torta personalizada",
        "Contratar servicio de decoración o comprar materiales",
      ],
    },
    {
      title: "Diseñar y enviar invitaciones",
      description: "Crear invitaciones que anticipen la experiencia.",
      htmlContent: `<p>La invitación es el primer contacto con la fiesta. Debe:</p>
<ul>
<li>Reflejar la temática elegida</li>
<li>Incluir dress code claro</li>
<li>Generar expectativa y emoción</li>
</ul>
<p>Opciones: invitación digital animada, tarjeta física temática, video invitación.</p>`,
      daysBeforeEvent: 21,
      priority: "medium",
      checklists: [
        "Diseñar invitación acorde a la temática",
        "Incluir todos los datos (fecha, hora, lugar, dress code)",
        "Enviar invitaciones",
        "Crear evento en redes o grupo de WhatsApp",
        "Sistema de confirmación de asistencia",
      ],
    },
    {
      title: "Planificar entretenimiento",
      description: "Organizar actividades y momentos especiales durante la fiesta.",
      htmlContent: `<p>Una buena fiesta tiene momentos planificados:</p>
<ul>
<li><strong>Recepción:</strong> Cóctel de bienvenida, photobooth</li>
<li><strong>Momento especial:</strong> Video sorpresa, discursos, juegos</li>
<li><strong>Torta:</strong> Momento del happy birthday</li>
<li><strong>Baile:</strong> Primera canción especial</li>
<li><strong>Cierre:</strong> Último tema, foto grupal</li>
</ul>`,
      daysBeforeEvent: 14,
      priority: "medium",
      checklists: [
        "Definir timeline del evento",
        "Preparar video sorpresa con mensajes",
        "Organizar photobooth con props temáticos",
        "Planificar juegos o actividades",
        "Seleccionar canción para el momento de la torta",
      ],
    },
    {
      title: "Compras y preparativos finales",
      description: "Adquirir todos los elementos necesarios.",
      htmlContent: `<p>Lista de compras típica:</p>
<ul>
<li>Decoración (globos, guirnaldas, centros de mesa)</li>
<li>Cotillón y accesorios para invitados</li>
<li>Velas para la torta</li>
<li>Bolsas de regalo o souvenirs</li>
<li>Elementos para photobooth</li>
</ul>`,
      daysBeforeEvent: 7,
      priority: "medium",
      checklists: [
        "Comprar decoración",
        "Adquirir cotillón temático",
        "Preparar souvenirs o bolsitas de regalo",
        "Verificar stock de bebidas",
        "Imprimir cartelería necesaria",
      ],
    },
    {
      title: "Montaje y coordinación",
      description: "Preparar el venue y coordinar el día del evento.",
      htmlContent: `<p>El día anterior o el mismo día temprano:</p>
<ul>
<li>Montar decoración</li>
<li>Hacer prueba de sonido</li>
<li>Verificar iluminación</li>
<li>Preparar mesa de regalos</li>
<li>Briefing con proveedores</li>
</ul>`,
      daysBeforeEvent: 1,
      priority: "high",
      checklists: [
        "Coordinar horario de montaje con venue",
        "Supervisar instalación de decoración",
        "Prueba de sonido con DJ",
        "Verificar catering y bebidas",
        "Repasar timeline con todos los involucrados",
      ],
    },
  ],
};

// ============================================
// 4. CORPORATIVO - Lanzamiento de Producto
// ============================================
const CORPORATE_TEMPLATE = {
  name: "Lanzamiento de Producto/Marca",
  eventType: "corporate" as const,
  description: "Template profesional para organizar lanzamientos de productos, inauguraciones o eventos corporativos de alto impacto.",
  defaultBudget: 50000,
  isGlobal: true,
  tasks: [
    {
      title: "Definición estratégica del evento",
      description: "Establecer objetivos, público objetivo y mensajes clave.",
      htmlContent: `<p>Todo evento corporativo debe responder a objetivos claros:</p>
<ul>
<li><strong>Awareness:</strong> Dar a conocer el producto/marca</li>
<li><strong>Engagement:</strong> Generar conexión emocional</li>
<li><strong>Conversión:</strong> Generar ventas o leads</li>
<li><strong>PR:</strong> Cobertura mediática</li>
</ul>
<p>Define KPIs medibles: asistentes, menciones en redes, leads generados, cobertura de prensa.</p>`,
      daysBeforeEvent: 60,
      priority: "high",
      checklists: [
        "Definir objetivos SMART del evento",
        "Identificar público objetivo",
        "Establecer mensajes clave",
        "Definir KPIs de éxito",
        "Aprobar presupuesto con dirección",
      ],
    },
    {
      title: "Selección de venue y fecha",
      description: "Elegir ubicación estratégica y fecha óptima.",
      htmlContent: `<p>El venue debe reflejar los valores de la marca:</p>
<ul>
<li><strong>Innovación:</strong> Espacios modernos, galerías, lofts industriales</li>
<li><strong>Lujo:</strong> Hoteles 5 estrellas, rooftops exclusivos</li>
<li><strong>Sustentabilidad:</strong> Espacios verdes, venues eco-friendly</li>
<li><strong>Tecnología:</strong> Centros de convenciones con infraestructura AV</li>
</ul>
<p>Considera: accesibilidad, estacionamiento, capacidad técnica, exclusividad.</p>`,
      daysBeforeEvent: 45,
      priority: "high",
      checklists: [
        "Shortlist de 5 venues potenciales",
        "Visitas técnicas con equipo de producción",
        "Verificar capacidad técnica (electricidad, internet, AV)",
        "Negociar exclusividad y condiciones",
        "Firmar contrato",
      ],
    },
    {
      title: "Diseño de experiencia",
      description: "Crear el concepto creativo y journey del asistente.",
      htmlContent: `<p>Diseña cada touchpoint de la experiencia:</p>
<ul>
<li><strong>Pre-evento:</strong> Invitación, teaser en redes, registro</li>
<li><strong>Llegada:</strong> Acreditación, welcome drink, primera impresión</li>
<li><strong>Contenido:</strong> Presentaciones, demos, activaciones</li>
<li><strong>Networking:</strong> Espacios de interacción</li>
<li><strong>Cierre:</strong> Call to action, gift bag, follow up</li>
</ul>`,
      daysBeforeEvent: 35,
      priority: "high",
      checklists: [
        "Desarrollar concepto creativo",
        "Diseñar customer journey del evento",
        "Definir momentos wow",
        "Planificar activaciones interactivas",
        "Crear guión del evento",
      ],
    },
    {
      title: "Gestión de invitados y prensa",
      description: "Estrategia de convocatoria y relaciones públicas.",
      htmlContent: `<p>Segmenta tu lista de invitados:</p>
<ul>
<li><strong>VIP:</strong> Clientes top, influencers clave, directivos</li>
<li><strong>Prensa:</strong> Periodistas especializados, medios target</li>
<li><strong>Influencers:</strong> Creadores de contenido relevantes</li>
<li><strong>Clientes:</strong> Base de datos segmentada</li>
<li><strong>Partners:</strong> Socios estratégicos</li>
</ul>`,
      daysBeforeEvent: 28,
      priority: "high",
      checklists: [
        "Crear base de datos de invitados segmentada",
        "Diseñar invitación premium",
        "Enviar save the date",
        "Preparar press kit",
        "Contactar medios y confirmar cobertura",
        "Gestionar influencers y acuerdos",
      ],
    },
    {
      title: "Producción técnica",
      description: "Coordinar todos los aspectos técnicos del evento.",
      htmlContent: `<p>Elementos técnicos críticos:</p>
<ul>
<li><strong>Audio:</strong> Sistema de sonido profesional, microfonía</li>
<li><strong>Video:</strong> Pantallas LED, proyección, streaming</li>
<li><strong>Iluminación:</strong> Diseño de luces acorde a la marca</li>
<li><strong>Conectividad:</strong> WiFi de alta capacidad</li>
<li><strong>Escenografía:</strong> Diseño de escenario y branding</li>
</ul>`,
      daysBeforeEvent: 21,
      priority: "high",
      checklists: [
        "Contratar empresa de producción AV",
        "Definir rider técnico",
        "Diseñar escenografía y branding",
        "Coordinar streaming si aplica",
        "Planificar ensayo técnico",
      ],
    },
    {
      title: "Contenido y speakers",
      description: "Preparar presentaciones y coordinar oradores.",
      htmlContent: `<p>El contenido es el corazón del evento:</p>
<ul>
<li>Presentación principal del producto/servicio</li>
<li>Testimoniales de clientes o casos de éxito</li>
<li>Demo en vivo</li>
<li>Q&A con el público</li>
</ul>
<p>Prepara a los speakers con ensayos y coaching si es necesario.</p>`,
      daysBeforeEvent: 14,
      priority: "high",
      checklists: [
        "Finalizar presentaciones",
        "Ensayar con speakers",
        "Preparar demos del producto",
        "Crear contenido para redes sociales",
        "Preparar materiales para prensa",
      ],
    },
    {
      title: "Logística y catering",
      description: "Coordinar servicios de alimentación y logística general.",
      htmlContent: `<p>La experiencia gastronómica debe alinearse con la marca:</p>
<ul>
<li>Cóctel de recepción con branding</li>
<li>Estaciones de comida temáticas</li>
<li>Opciones para restricciones alimentarias</li>
<li>Bebidas premium o signature cocktails</li>
</ul>`,
      daysBeforeEvent: 10,
      priority: "medium",
      checklists: [
        "Confirmar menú final con catering",
        "Coordinar branding en alimentos/bebidas",
        "Organizar gift bags",
        "Confirmar transporte VIP si aplica",
        "Preparar acreditaciones",
      ],
    },
    {
      title: "Ensayo general",
      description: "Prueba completa de todos los elementos del evento.",
      htmlContent: `<p>El ensayo general es crucial para detectar problemas:</p>
<ul>
<li>Prueba de sonido completa</li>
<li>Verificación de todas las presentaciones</li>
<li>Ensayo de tiempos con speakers</li>
<li>Prueba de iluminación</li>
<li>Simulación de registro de invitados</li>
</ul>`,
      daysBeforeEvent: 2,
      priority: "high",
      checklists: [
        "Realizar prueba técnica completa",
        "Ensayo con todos los speakers",
        "Verificar flujo de registro",
        "Confirmar staff y roles",
        "Preparar plan B para contingencias",
      ],
    },
    {
      title: "Día del evento",
      description: "Ejecución y coordinación en tiempo real.",
      htmlContent: `<p>El día del evento, el equipo debe estar sincronizado:</p>
<ul>
<li>Llegada temprana para verificación final</li>
<li>Briefing con todo el equipo</li>
<li>Monitoreo constante de cada área</li>
<li>Comunicación por radio/WhatsApp</li>
<li>Documentación fotográfica y de video</li>
</ul>`,
      daysBeforeEvent: 0,
      priority: "high",
      checklists: [
        "Verificación final de todos los elementos",
        "Briefing con equipo completo",
        "Recibir y ubicar a VIPs",
        "Monitorear redes sociales en tiempo real",
        "Coordinar cobertura de prensa",
        "Gestionar imprevistos",
      ],
    },
    {
      title: "Post-evento y seguimiento",
      description: "Acciones de cierre y medición de resultados.",
      htmlContent: `<p>El evento no termina cuando se van los invitados:</p>
<ul>
<li>Enviar agradecimiento a asistentes</li>
<li>Compartir fotos y videos</li>
<li>Seguimiento a leads generados</li>
<li>Clipping de prensa</li>
<li>Análisis de KPIs y reporte final</li>
</ul>`,
      daysAfterEvent: 3,
      priority: "medium",
      checklists: [
        "Enviar email de agradecimiento",
        "Compartir galería de fotos",
        "Recopilar cobertura de prensa",
        "Analizar métricas de redes sociales",
        "Preparar reporte de resultados",
        "Seguimiento comercial a leads",
      ],
    },
  ],
};

// ============================================
// 5. SOCIAL - Gala Benéfica
// ============================================
const SOCIAL_TEMPLATE = {
  name: "Gala Benéfica Elegante",
  eventType: "social" as const,
  description: "Template para organizar galas de recaudación de fondos, eventos de caridad o cenas benéficas con alto impacto social.",
  defaultBudget: 35000,
  isGlobal: true,
  tasks: [
    {
      title: "Definir causa y objetivos",
      description: "Establecer la causa benéfica y metas de recaudación.",
      htmlContent: `<p>Una gala exitosa necesita una causa clara y emotiva:</p>
<ul>
<li><strong>Causa:</strong> ¿Qué problema social se busca resolver?</li>
<li><strong>Beneficiario:</strong> ¿Quién recibirá los fondos?</li>
<li><strong>Meta:</strong> ¿Cuánto se busca recaudar?</li>
<li><strong>Impacto:</strong> ¿Qué se logrará con los fondos?</li>
</ul>
<p>La historia debe ser compelling y fácil de comunicar.</p>`,
      daysBeforeEvent: 90,
      priority: "high",
      checklists: [
        "Definir causa y organización beneficiaria",
        "Establecer meta de recaudación",
        "Crear storytelling de la causa",
        "Identificar testimonios o casos de impacto",
        "Definir cómo se usarán los fondos",
      ],
    },
    {
      title: "Formar comité organizador",
      description: "Reunir un equipo de personas influyentes comprometidas.",
      htmlContent: `<p>El comité es clave para el éxito de la gala:</p>
<ul>
<li><strong>Presidente/a:</strong> Figura pública que dé prestigio</li>
<li><strong>Tesorero/a:</strong> Manejo transparente de fondos</li>
<li><strong>Relaciones públicas:</strong> Contactos con medios e influencers</li>
<li><strong>Sponsors:</strong> Conexiones con empresas</li>
<li><strong>Logística:</strong> Coordinación operativa</li>
</ul>`,
      daysBeforeEvent: 75,
      priority: "high",
      checklists: [
        "Identificar candidatos para el comité",
        "Invitar y confirmar miembros",
        "Definir roles y responsabilidades",
        "Establecer reuniones periódicas",
        "Crear grupo de comunicación",
      ],
    },
    {
      title: "Conseguir sponsors y padrinos",
      description: "Asegurar patrocinios que cubran costos y maximicen recaudación.",
      htmlContent: `<p>Niveles típicos de patrocinio:</p>
<ul>
<li><strong>Platinum:</strong> Sponsor principal, máxima visibilidad</li>
<li><strong>Gold:</strong> Co-sponsor, beneficios premium</li>
<li><strong>Silver:</strong> Sponsor de categoría específica</li>
<li><strong>Colaborador:</strong> Donación de productos/servicios</li>
</ul>
<p>Prepara un deck de patrocinio profesional con beneficios claros.</p>`,
      daysBeforeEvent: 60,
      priority: "high",
      checklists: [
        "Crear propuesta de patrocinio",
        "Listar empresas target",
        "Contactar y presentar propuesta",
        "Negociar y cerrar acuerdos",
        "Firmar contratos de patrocinio",
      ],
    },
    {
      title: "Planificar venue y experiencia",
      description: "Seleccionar ubicación y diseñar la experiencia de la gala.",
      htmlContent: `<p>La gala debe ser una experiencia memorable:</p>
<ul>
<li><strong>Venue:</strong> Lugar elegante y con capacidad adecuada</li>
<li><strong>Decoración:</strong> Sofisticada, acorde a la causa</li>
<li><strong>Dress code:</strong> Formal o black tie</li>
<li><strong>Programa:</strong> Cena, subasta, entretenimiento, testimonios</li>
</ul>`,
      daysBeforeEvent: 45,
      priority: "high",
      checklists: [
        "Seleccionar y reservar venue",
        "Definir concepto de decoración",
        "Planificar programa de la noche",
        "Contratar catering de alta gama",
        "Reservar entretenimiento (banda, DJ)",
      ],
    },
    {
      title: "Organizar subasta y donaciones",
      description: "Conseguir items para subasta y planificar mecánicas de donación.",
      htmlContent: `<p>La subasta es el corazón de la recaudación:</p>
<ul>
<li><strong>Subasta silenciosa:</strong> Items exhibidos, pujas escritas</li>
<li><strong>Subasta en vivo:</strong> Conducida por subastador profesional</li>
<li><strong>Donación directa:</strong> Paddle raise o donación digital</li>
<li><strong>Rifa:</strong> Tickets para premio mayor</li>
</ul>
<p>Consigue items únicos: experiencias, viajes, arte, encuentros con celebridades.</p>`,
      daysBeforeEvent: 30,
      priority: "high",
      checklists: [
        "Crear lista de items deseados para subasta",
        "Contactar donantes potenciales",
        "Conseguir experiencias exclusivas",
        "Fotografiar y catalogar items",
        "Definir precios base",
        "Contratar subastador si es subasta en vivo",
      ],
    },
    {
      title: "Venta de entradas y mesas",
      description: "Comercializar el evento y gestionar reservas.",
      htmlContent: `<p>Estrategia de venta:</p>
<ul>
<li><strong>Mesas corporativas:</strong> Empresas que compran mesa completa</li>
<li><strong>Entradas individuales:</strong> Asistentes particulares</li>
<li><strong>Early bird:</strong> Descuento por compra anticipada</li>
<li><strong>VIP:</strong> Acceso a experiencias exclusivas</li>
</ul>`,
      daysBeforeEvent: 21,
      priority: "high",
      checklists: [
        "Definir precios de entradas y mesas",
        "Crear sistema de venta online",
        "Lanzar campaña de venta",
        "Seguimiento a compradores potenciales",
        "Gestionar seating chart",
      ],
    },
    {
      title: "Comunicación y prensa",
      description: "Difundir el evento y generar cobertura mediática.",
      htmlContent: `<p>La comunicación amplifica el impacto:</p>
<ul>
<li>Comunicado de prensa</li>
<li>Campaña en redes sociales</li>
<li>Invitación a medios</li>
<li>Entrevistas con voceros</li>
<li>Cobertura en vivo del evento</li>
</ul>`,
      daysBeforeEvent: 14,
      priority: "medium",
      checklists: [
        "Preparar comunicado de prensa",
        "Crear contenido para redes sociales",
        "Invitar a medios y confirmar cobertura",
        "Coordinar entrevistas previas",
        "Preparar voceros",
      ],
    },
    {
      title: "Preparativos finales",
      description: "Últimos detalles antes de la gala.",
      htmlContent: `<p>La semana previa es crucial:</p>
<ul>
<li>Confirmar todos los proveedores</li>
<li>Preparar materiales (programas, paddles, etc.)</li>
<li>Ensayar programa con presentadores</li>
<li>Verificar sistema de donaciones</li>
<li>Briefing con voluntarios</li>
</ul>`,
      daysBeforeEvent: 7,
      priority: "high",
      checklists: [
        "Confirmar asistencia final",
        "Imprimir programas y materiales",
        "Preparar sistema de subasta",
        "Ensayo con presentadores y testimonios",
        "Capacitar voluntarios",
        "Verificar sistema de pagos/donaciones",
      ],
    },
    {
      title: "Día de la gala",
      description: "Ejecución impecable del evento.",
      htmlContent: `<p>El día de la gala todo debe fluir perfectamente:</p>
<ul>
<li>Montaje temprano y verificación</li>
<li>Recepción de invitados VIP</li>
<li>Ejecución del programa</li>
<li>Subasta y paddle raise</li>
<li>Agradecimientos y cierre emotivo</li>
</ul>`,
      daysBeforeEvent: 0,
      priority: "high",
      checklists: [
        "Supervisar montaje final",
        "Recibir y ubicar a VIPs",
        "Coordinar programa en tiempo real",
        "Monitorear subasta y donaciones",
        "Documentar con fotos y video",
        "Anunciar monto recaudado",
      ],
    },
    {
      title: "Cierre y agradecimientos",
      description: "Post-evento: agradecer, reportar y entregar fondos.",
      htmlContent: `<p>El cierre es tan importante como el evento:</p>
<ul>
<li>Agradecer a todos los involucrados</li>
<li>Comunicar monto total recaudado</li>
<li>Entregar fondos a beneficiarios</li>
<li>Compartir impacto logrado</li>
<li>Documentar para futuras ediciones</li>
</ul>`,
      daysAfterEvent: 7,
      priority: "medium",
      checklists: [
        "Enviar agradecimientos personalizados",
        "Publicar monto recaudado",
        "Entregar cheque/transferencia a beneficiarios",
        "Compartir fotos y video del evento",
        "Preparar reporte para sponsors",
        "Documentar aprendizajes",
      ],
    },
  ],
};

// ============================================
// 6. OTRO - Festival Gastronómico
// ============================================
const OTHER_TEMPLATE = {
  name: "Festival Gastronómico",
  eventType: "other" as const,
  description: "Template para organizar festivales de comida, ferias gastronómicas o eventos culinarios con múltiples participantes y experiencias.",
  defaultBudget: 80000,
  isGlobal: true,
  tasks: [
    {
      title: "Conceptualización del festival",
      description: "Definir el concepto, temática y propuesta de valor del festival.",
      htmlContent: `<p>Un festival gastronómico exitoso necesita un concepto diferenciador:</p>
<ul>
<li><strong>Temática:</strong> Cocina regional, street food, vegano, mariscos, etc.</li>
<li><strong>Formato:</strong> Food trucks, stands, pop-ups de restaurantes</li>
<li><strong>Experiencias:</strong> Clases de cocina, catas, competencias</li>
<li><strong>Entretenimiento:</strong> Música en vivo, shows, actividades</li>
</ul>
<p>Define qué hace único a tu festival y por qué la gente querrá asistir.</p>`,
      daysBeforeEvent: 120,
      priority: "high",
      checklists: [
        "Definir concepto y temática",
        "Investigar festivales similares",
        "Identificar diferenciadores",
        "Definir público objetivo",
        "Establecer objetivos (asistentes, ventas, etc.)",
      ],
    },
    {
      title: "Selección de sede y permisos",
      description: "Encontrar ubicación y gestionar autorizaciones necesarias.",
      htmlContent: `<p>La ubicación es crítica para un festival:</p>
<ul>
<li><strong>Espacio:</strong> Parque, plaza, predio ferial, estacionamiento</li>
<li><strong>Capacidad:</strong> Suficiente para stands, circulación y servicios</li>
<li><strong>Accesibilidad:</strong> Transporte público, estacionamiento</li>
<li><strong>Servicios:</strong> Electricidad, agua, sanitarios</li>
</ul>
<p>Los permisos pueden tomar semanas, comienza temprano.</p>`,
      daysBeforeEvent: 90,
      priority: "high",
      checklists: [
        "Identificar sedes potenciales",
        "Visitar y evaluar opciones",
        "Negociar y reservar espacio",
        "Solicitar permisos municipales",
        "Gestionar habilitación de alimentos",
        "Contratar seguro del evento",
      ],
    },
    {
      title: "Convocatoria de participantes",
      description: "Reclutar restaurantes, food trucks y productores.",
      htmlContent: `<p>La calidad de los participantes define el festival:</p>
<ul>
<li><strong>Restaurantes:</strong> Reconocidos y emergentes</li>
<li><strong>Food trucks:</strong> Con propuestas originales</li>
<li><strong>Productores:</strong> Artesanales, locales</li>
<li><strong>Chefs invitados:</strong> Para demos y clases</li>
<li><strong>Bebidas:</strong> Cervecerías, viñedos, bartenders</li>
</ul>`,
      daysBeforeEvent: 75,
      priority: "high",
      checklists: [
        "Crear convocatoria atractiva",
        "Definir requisitos y costos de participación",
        "Contactar restaurantes y food trucks",
        "Invitar chefs reconocidos",
        "Gestionar productores artesanales",
        "Confirmar participantes de bebidas",
      ],
    },
    {
      title: "Diseño del layout y experiencias",
      description: "Planificar distribución del espacio y actividades.",
      htmlContent: `<p>El layout debe facilitar el flujo y la experiencia:</p>
<ul>
<li><strong>Zona de comida:</strong> Stands organizados por tipo</li>
<li><strong>Zona de bebidas:</strong> Bares y estaciones</li>
<li><strong>Escenario:</strong> Para shows y demos</li>
<li><strong>Área de talleres:</strong> Clases y actividades</li>
<li><strong>Zona de descanso:</strong> Mesas, sombra, áreas verdes</li>
<li><strong>Servicios:</strong> Sanitarios, primeros auxilios, info</li>
</ul>`,
      daysBeforeEvent: 60,
      priority: "high",
      checklists: [
        "Diseñar plano del festival",
        "Asignar ubicaciones a participantes",
        "Planificar flujo de visitantes",
        "Definir programa de actividades",
        "Diseñar señalética",
        "Planificar áreas de servicio",
      ],
    },
    {
      title: "Producción y logística",
      description: "Coordinar infraestructura y servicios técnicos.",
      htmlContent: `<p>La producción de un festival es compleja:</p>
<ul>
<li><strong>Estructuras:</strong> Carpas, stands, escenario</li>
<li><strong>Electricidad:</strong> Generadores, distribución</li>
<li><strong>Agua:</strong> Conexiones para participantes</li>
<li><strong>Mobiliario:</strong> Mesas, sillas, sombrillas</li>
<li><strong>Sonido e iluminación:</strong> Para escenario y ambiente</li>
</ul>`,
      daysBeforeEvent: 45,
      priority: "high",
      checklists: [
        "Contratar empresa de producción",
        "Alquilar estructuras y carpas",
        "Coordinar instalación eléctrica",
        "Gestionar suministro de agua",
        "Contratar mobiliario",
        "Reservar equipos de sonido e iluminación",
      ],
    },
    {
      title: "Marketing y venta de entradas",
      description: "Promocionar el festival y gestionar ticketing.",
      htmlContent: `<p>Estrategia de marketing multicanal:</p>
<ul>
<li><strong>Redes sociales:</strong> Contenido atractivo, influencers foodie</li>
<li><strong>Prensa:</strong> Notas en medios gastronómicos</li>
<li><strong>Alianzas:</strong> Con apps de delivery, tarjetas de crédito</li>
<li><strong>Venta:</strong> Early bird, general, VIP</li>
</ul>`,
      daysBeforeEvent: 30,
      priority: "high",
      checklists: [
        "Crear identidad visual del festival",
        "Lanzar campaña en redes sociales",
        "Activar sistema de venta de entradas",
        "Gestionar alianzas y canjes",
        "Coordinar con influencers gastronómicos",
        "Enviar comunicados a prensa",
      ],
    },
    {
      title: "Coordinación con participantes",
      description: "Briefing y preparación de todos los involucrados.",
      htmlContent: `<p>Todos los participantes deben estar alineados:</p>
<ul>
<li>Manual del participante con reglas y horarios</li>
<li>Requisitos de bromatología</li>
<li>Horarios de montaje y desmontaje</li>
<li>Precios sugeridos y métodos de pago</li>
<li>Contactos de emergencia</li>
</ul>`,
      daysBeforeEvent: 14,
      priority: "medium",
      checklists: [
        "Enviar manual del participante",
        "Confirmar menús y precios",
        "Verificar permisos sanitarios",
        "Coordinar horarios de carga",
        "Realizar reunión de coordinación",
      ],
    },
    {
      title: "Montaje del festival",
      description: "Instalación de toda la infraestructura.",
      htmlContent: `<p>El montaje suele tomar 2-3 días:</p>
<ul>
<li>Día -2: Estructuras principales, electricidad</li>
<li>Día -1: Stands, mobiliario, decoración</li>
<li>Día 0 AM: Ingreso de participantes, pruebas</li>
</ul>`,
      daysBeforeEvent: 3,
      priority: "high",
      checklists: [
        "Supervisar montaje de estructuras",
        "Verificar instalaciones eléctricas",
        "Coordinar ingreso de participantes",
        "Instalar señalética",
        "Prueba de sonido",
        "Verificar servicios sanitarios",
      ],
    },
    {
      title: "Operación del festival",
      description: "Gestión durante los días del evento.",
      htmlContent: `<p>Durante el festival, el equipo debe estar en constante comunicación:</p>
<ul>
<li>Centro de operaciones con radios</li>
<li>Rondas de supervisión constantes</li>
<li>Atención a participantes y visitantes</li>
<li>Gestión de emergencias</li>
<li>Monitoreo de redes sociales</li>
</ul>`,
      daysBeforeEvent: 0,
      priority: "high",
      checklists: [
        "Briefing diario con equipo",
        "Monitorear ingreso de visitantes",
        "Supervisar operación de stands",
        "Coordinar programa de actividades",
        "Gestionar incidentes",
        "Documentar con fotos y videos",
      ],
    },
    {
      title: "Desmontaje y cierre",
      description: "Desmontar infraestructura y cerrar el evento.",
      htmlContent: `<p>El desmontaje debe ser ordenado:</p>
<ul>
<li>Retiro de participantes según cronograma</li>
<li>Desmontaje de estructuras</li>
<li>Limpieza del predio</li>
<li>Devolución de equipos alquilados</li>
<li>Cierre con autoridades</li>
</ul>`,
      daysAfterEvent: 1,
      priority: "medium",
      checklists: [
        "Coordinar salida de participantes",
        "Supervisar desmontaje",
        "Verificar limpieza del predio",
        "Devolver equipos alquilados",
        "Cerrar con municipalidad",
        "Pagar a proveedores",
      ],
    },
    {
      title: "Evaluación y reporte",
      description: "Analizar resultados y documentar aprendizajes.",
      htmlContent: `<p>La evaluación es clave para futuras ediciones:</p>
<ul>
<li>Encuesta a visitantes y participantes</li>
<li>Análisis de ventas y asistencia</li>
<li>Recopilación de feedback</li>
<li>Documentación de problemas y soluciones</li>
<li>Reporte para sponsors</li>
</ul>`,
      daysAfterEvent: 14,
      priority: "medium",
      checklists: [
        "Enviar encuesta de satisfacción",
        "Recopilar datos de asistencia",
        "Analizar ventas de entradas",
        "Preparar reporte para sponsors",
        "Documentar aprendizajes",
        "Planificar mejoras para próxima edición",
      ],
    },
  ],
};

// ============================================
// FUNCIÓN PRINCIPAL DE SEED
// ============================================

const ALL_TEMPLATES = [
  PRE_WEDDING_TEMPLATE,
  POST_WEDDING_TEMPLATE,
  BIRTHDAY_TEMPLATE,
  CORPORATE_TEMPLATE,
  SOCIAL_TEMPLATE,
  OTHER_TEMPLATE,
];

async function seedAllTemplates() {
  console.log("🌱 Seeding All Event Templates...\n");
  console.log("=".repeat(50));

  let totalTasks = 0;
  let totalChecklists = 0;

  for (const templateData of ALL_TEMPLATES) {
    // Check if template already exists
    const existing = await db
      .select({ id: eventTemplates.id })
      .from(eventTemplates)
      .where(eq(eventTemplates.name, templateData.name))
      .limit(1);

    if (existing.length > 0) {
      console.log(`⚠️  "${templateData.name}" already exists. Skipping...`);
      continue;
    }

    // Create event template
    const [template] = await db.insert(eventTemplates).values({
      organizationId: null,
      name: templateData.name,
      eventType: templateData.eventType,
      description: templateData.description,
      defaultBudget: templateData.defaultBudget.toString(),
      isGlobal: templateData.isGlobal,
      isActive: true,
    }).returning();

    console.log(`\n✅ ${template.name}`);
    console.log(`   Type: ${templateData.eventType} | Budget: $${templateData.defaultBudget.toLocaleString()}`);

    // Create task templates with checklists
    for (let i = 0; i < templateData.tasks.length; i++) {
      const task = templateData.tasks[i];

      const [taskTpl] = await db.insert(taskTemplates).values({
        eventTemplateId: template.id,
        title: task.title,
        description: task.description,
        htmlContent: task.htmlContent,
        daysBeforeEvent: task.daysBeforeEvent || null,
        daysAfterEvent: (task as any).daysAfterEvent || null,
        priority: task.priority,
        sortOrder: i,
      }).returning();

      totalTasks++;

      // Create checklist items
      for (let j = 0; j < task.checklists.length; j++) {
        await db.insert(taskTemplateChecklists).values({
          taskTemplateId: taskTpl.id,
          title: task.checklists[j],
          sortOrder: j,
        });
        totalChecklists++;
      }
    }

    console.log(`   📋 ${templateData.tasks.length} tasks | ✓ ${templateData.tasks.reduce((a, t) => a + t.checklists.length, 0)} checklist items`);
  }

  console.log("\n" + "=".repeat(50));
  console.log(`\n🎉 Seeding completed!`);
  console.log(`   Templates created: ${ALL_TEMPLATES.length}`);
  console.log(`   Total tasks: ${totalTasks}`);
  console.log(`   Total checklist items: ${totalChecklists}`);

  process.exit(0);
}

seedAllTemplates().catch((error) => {
  console.error("❌ Error seeding templates:", error);
  process.exit(1);
});
