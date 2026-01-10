import { createGoogleGenerativeAI } from "@ai-sdk/google";

// Configuración del cliente Gemini - se lee en RUNTIME
function getGoogleAI() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY no está configurada");
  }

  return createGoogleGenerativeAI({
    apiKey,
  });
}

// Modelo por defecto: Gemini 2.0 Flash
export function getGeminiModel(modelId: string = "gemini-2.0-flash") {
  const google = getGoogleAI();
  return google(modelId);
}

// Configuración por defecto para el chat
export const defaultChatConfig = {
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.95,
};

// Modelos disponibles
export const availableModels = [
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", description: "Rápido y eficiente" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", description: "Balance velocidad/calidad" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "Mayor capacidad de razonamiento" },
] as const;
