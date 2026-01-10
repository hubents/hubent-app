import { streamText } from "ai";
import { getGeminiModel, defaultChatConfig } from "@/lib/ai/gemini";
import { buildSystemPrompt, INITIAL_SUGGESTIONS } from "@/lib/ai/system-prompt";
import { createAITools } from "@/lib/ai/tools";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { 
  aiConversations, 
  aiMessages, 
  organizationMembers, 
  organizations, 
  roles 
} from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { messages, sessionId, context } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Mensajes inválidos" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Obtener información del usuario y organización
    const userInfo = await getUserContext(session.user.id);

    // Construir el system prompt
    const systemPrompt = buildSystemPrompt({
      userName: session.user.name || undefined,
      organizationName: userInfo?.organizationName,
      userRole: userInfo?.role,
      context: context || "dashboard",
    });

    // Obtener el modelo Gemini
    const model = getGeminiModel();

    // Crear o actualizar conversación
    const conversationSessionId = sessionId || crypto.randomUUID();
    const userId = session.user.id;
    
    await saveConversation(
      conversationSessionId,
      userId,
      userInfo?.organizationId,
      messages
    );

    // Crear tools si hay contexto de organización
    const tools = userInfo?.organizationId 
      ? createAITools({
          userId,
          organizationId: userInfo.organizationId,
          role: userInfo.role || "viewer",
        })
      : undefined;

    // Generar respuesta con streaming
    const result = streamText({
      model,
      system: systemPrompt,
      messages,
      tools,
      temperature: defaultChatConfig.temperature,
      onFinish: async ({ text, usage }) => {
        // Guardar mensaje del asistente
        await saveAssistantMessage(
          conversationSessionId,
          userId,
          text,
          usage?.totalTokens
        );
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error en chat AI:", error);
    return new Response(
      JSON.stringify({ 
        error: "Error al procesar la solicitud",
        details: error instanceof Error ? error.message : "Error desconocido"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// GET para obtener sugerencias iniciales
export async function GET(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const context = url.searchParams.get("context") || "general";

    const suggestions = INITIAL_SUGGESTIONS[context as keyof typeof INITIAL_SUGGESTIONS] 
      || INITIAL_SUGGESTIONS.general;

    return new Response(JSON.stringify({ suggestions }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error obteniendo sugerencias:", error);
    return new Response(
      JSON.stringify({ suggestions: INITIAL_SUGGESTIONS.general }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
}

// Helpers
async function getUserContext(userId: string) {
  try {
    const memberData = await db
      .select({
        organizationId: organizationMembers.organizationId,
        organizationName: organizations.name,
        roleSlug: roles.slug,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .innerJoin(roles, eq(roles.id, organizationMembers.roleId))
      .where(eq(organizationMembers.userId, userId))
      .limit(1);

    if (memberData.length === 0) return null;

    return {
      organizationId: memberData[0].organizationId,
      organizationName: memberData[0].organizationName,
      role: memberData[0].roleSlug,
    };
  } catch (error) {
    console.error("Error obteniendo contexto del usuario:", error);
    return null;
  }
}

async function saveConversation(
  sessionId: string,
  userId: string,
  organizationId: number | undefined,
  messages: { role: string; content: string }[]
) {
  try {
    // Buscar conversación existente
    const existing = await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.sessionId, sessionId))
      .limit(1);

    if (existing.length === 0) {
      // Crear nueva conversación
      const title = messages[0]?.content?.slice(0, 100) || "Nueva conversación";
      await db.insert(aiConversations).values({
        sessionId,
        userId,
        organizationId,
        title,
        messageCount: messages.length,
      });
    } else {
      // Actualizar contador de mensajes
      await db
        .update(aiConversations)
        .set({ 
          messageCount: messages.length,
          updatedAt: new Date(),
        })
        .where(eq(aiConversations.sessionId, sessionId));
    }

    // Guardar último mensaje del usuario
    const lastUserMessage = messages.filter(m => m.role === "user").pop();
    if (lastUserMessage) {
      const conv = await db
        .select({ id: aiConversations.id })
        .from(aiConversations)
        .where(eq(aiConversations.sessionId, sessionId))
        .limit(1);

      if (conv.length > 0) {
        await db.insert(aiMessages).values({
          conversationId: conv[0].id,
          role: "user",
          content: lastUserMessage.content,
        });
      }
    }
  } catch (error) {
    console.error("Error guardando conversación:", error);
  }
}

async function saveAssistantMessage(
  sessionId: string,
  userId: string,
  content: string,
  tokenCount?: number
) {
  try {
    const conv = await db
      .select({ id: aiConversations.id })
      .from(aiConversations)
      .where(eq(aiConversations.sessionId, sessionId))
      .limit(1);

    if (conv.length > 0) {
      await db.insert(aiMessages).values({
        conversationId: conv[0].id,
        role: "assistant",
        content,
        tokenCount,
      });
    }
  } catch (error) {
    console.error("Error guardando mensaje del asistente:", error);
  }
}
