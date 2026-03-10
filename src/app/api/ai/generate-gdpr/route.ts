import { generateText } from "ai";
import { getGeminiModel } from "@/lib/ai/gemini";
import { auth } from "@/lib/auth";
import { z, ZodError } from "zod";

export const maxDuration = 30;

const requestSchema = z.object({
  formName: z.string().min(1).max(200),
  formDescription: z.string().max(500).optional(),
  fieldTypes: z.array(z.string()).optional(),
});

const GDPR_PROMPT = `Eres un experto legal en protección de datos (GDPR/RGPD y LOPD).

Genera un texto CORTO de consentimiento para un formulario web de una empresa de gestión de eventos.

Requisitos:
- Máximo 2-3 oraciones
- En español
- Menciona que los datos se usarán para la finalidad del formulario
- Menciona que pueden ejercer derechos ARCO (acceso, rectificación, cancelación, oposición)
- Tono profesional pero cercano
- NO uses jerga legal excesiva
- NO incluyas links (esos se configuran aparte)

Información del formulario:
- Nombre: {formName}
- Descripción: {formDescription}
- Tipos de datos recopilados: {fieldTypes}

Responde SOLO con el texto de consentimiento, sin explicaciones ni comillas.`;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { formName, formDescription, fieldTypes } = requestSchema.parse(body);

    const fieldTypeLabels: Record<string, string> = {
      name: "Nombre",
      email: "Email",
      phone: "Teléfono",
      partner_name: "Nombre de pareja",
      partner_email: "Email de pareja",
      event_date: "Fecha del evento",
      event_venue: "Lugar del evento",
      guest_count: "Cantidad de invitados",
      budget: "Presupuesto",
      message: "Mensaje",
      short_text: "Texto libre",
      long_text: "Texto libre",
    };

    const dataTypes = (fieldTypes || [])
      .map((t) => fieldTypeLabels[t] || t)
      .filter(Boolean)
      .join(", ") || "datos generales";

    const prompt = GDPR_PROMPT
      .replace("{formName}", formName)
      .replace("{formDescription}", formDescription || "Formulario de recopilación de datos")
      .replace("{fieldTypes}", dataTypes);

    const model = getGeminiModel();
    const { text } = await generateText({
      model,
      prompt,
      temperature: 0.5,
      maxOutputTokens: 300,
    });

    return new Response(
      JSON.stringify({ success: true, text: text.trim() }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return new Response(
        JSON.stringify({ success: false, error: error.issues[0]?.message || "Datos inválidos" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    console.error("Error generating GDPR text:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Error al generar texto" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
