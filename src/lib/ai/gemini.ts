import { gateway } from "ai";

// Modelo por defecto usando Vercel AI Gateway
// En Vercel deployments, usa OIDC automático (no requiere API key)
// En local, usar `vercel dev` o configurar AI_GATEWAY_API_KEY
export const DEFAULT_MODEL = "google/gemini-2.0-flash";

// Obtener modelo a través de AI Gateway
export function getGeminiModel(modelId: string = DEFAULT_MODEL) {
  return gateway(modelId);
}

// Configuración por defecto para el chat
export const defaultChatConfig = {
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.95,
};

// Modelos disponibles a través de AI Gateway
// Formato: provider/model-name
export const availableModels = [
  // Google
  { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash", description: "Rápido y eficiente", provider: "google" },
  { id: "google/gemini-1.5-flash", name: "Gemini 1.5 Flash", description: "Balance velocidad/calidad", provider: "google" },
  { id: "google/gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "Mayor capacidad", provider: "google" },
  // OpenAI
  { id: "openai/gpt-4o", name: "GPT-4o", description: "Multimodal avanzado", provider: "openai" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", description: "Rápido y económico", provider: "openai" },
  // Anthropic
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", description: "Excelente razonamiento", provider: "anthropic" },
  // Meta
  { id: "meta/llama-3.3-70b", name: "Llama 3.3 70B", description: "Open source potente", provider: "meta" },
] as const;
