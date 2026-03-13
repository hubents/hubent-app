import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";

export const MVP_TOOLKITS = ["gmail", "whatsapp"] as const;
export type ComposioToolkit = (typeof MVP_TOOLKITS)[number];

export const TOOLKIT_META: Record<
  ComposioToolkit,
  {
    name: string;
    description: string;
    icon: string;
    requiresBusiness?: boolean;
    helpUrl?: string;
    helpTooltip?: string;
  }
> = {
  gmail: {
    name: "Gmail",
    description: "Enviar y recibir emails desde tu cuenta de Google",
    icon: "/icons/gmail.svg",
  },
  whatsapp: {
    name: "WhatsApp Business",
    description: "Enviar mensajes vía WhatsApp Business API",
    icon: "/icons/whatsapp.svg",
    requiresBusiness: true,
    helpUrl:
      "https://business.facebook.com/latest/whatsapp_manager/getting_started",
    helpTooltip:
      "Requiere cuenta WhatsApp Business verificada con Meta Business Suite. Si no tenés una, hacé click para configurarla.",
  },
};

export interface ComingSoonApp {
  slug: string;
  name: string;
  description: string;
  category: string;
  logoUrl: string;
}

export const COMING_SOON_APPS: ComingSoonApp[] = [
  {
    slug: "googlecalendar",
    name: "Google Calendar",
    description: "Sincronizá eventos y reuniones con tu calendario",
    category: "Calendario",
    logoUrl: "https://composio.dev/toolkits/logos/hero/googlecalendar.svg",
  },
  {
    slug: "slack",
    name: "Slack",
    description: "Notificaciones y mensajes de equipo en tiempo real",
    category: "Comunicación",
    logoUrl: "https://composio.dev/toolkits/logos/hero/slack.svg",
  },
  {
    slug: "zoom",
    name: "Zoom",
    description: "Reuniones virtuales con clientes y proveedores",
    category: "Video",
    logoUrl: "https://composio.dev/toolkits/logos/hero/zoom.svg",
  },
  {
    slug: "stripe",
    name: "Stripe",
    description: "Procesá cobros y gestioná facturación online",
    category: "Pagos",
    logoUrl: "https://composio.dev/toolkits/logos/hero/stripe.svg",
  },
  {
    slug: "googlesheets",
    name: "Google Sheets",
    description: "Exportá listas de invitados, reportes y datos",
    category: "Productividad",
    logoUrl: "https://composio.dev/toolkits/logos/hero/googlesheets.svg",
  },
  {
    slug: "notion",
    name: "Notion",
    description: "Documentación y notas compartidas del equipo",
    category: "Gestión",
    logoUrl: "https://composio.dev/toolkits/logos/hero/notion.svg",
  },
  {
    slug: "googledrive",
    name: "Google Drive",
    description: "Almacená y compartí documentos del evento",
    category: "Storage",
    logoUrl: "https://composio.dev/toolkits/logos/hero/googledrive.svg",
  },
  {
    slug: "outlook",
    name: "Outlook",
    description: "Email corporativo y calendario de Microsoft",
    category: "Email",
    logoUrl: "https://composio.dev/toolkits/logos/hero/outlook.svg",
  },
];

function getComposioApiKey(): string {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    throw new Error("[Composio] COMPOSIO_API_KEY is not set. Add it to environment variables.");
  }
  return apiKey;
}

function getComposioClient() {
  return new Composio({
    apiKey: getComposioApiKey(),
    provider: new VercelProvider(),
  });
}

export function isComposioConfigured(): boolean {
  return !!process.env.COMPOSIO_API_KEY;
}

export function composioEntityId(orgId: number): string {
  return `hubents_org_${orgId}`;
}

export async function createComposioSession(
  orgId: number,
  toolkits?: ComposioToolkit[]
) {
  const composio = getComposioClient();
  return composio.create(composioEntityId(orgId), {
    toolkits: toolkits || [...MVP_TOOLKITS],
    manageConnections: false,
  });
}

export async function getComposioTools(orgId: number) {
  const session = await createComposioSession(orgId);
  return session.tools();
}

export async function getOrgToolkitStatus(orgId: number) {
  const session = await createComposioSession(orgId);
  const toolkits = await session.toolkits();
  return toolkits.items
    .filter((tk) => MVP_TOOLKITS.includes(tk.slug as ComposioToolkit))
    .map((tk) => ({
      slug: tk.slug,
      name: tk.name,
      isConnected: !!tk.connection?.connectedAccount,
      connectedAccountId: tk.connection?.connectedAccount?.id || null,
    }));
}

export async function authorizeToolkit(
  orgId: number,
  toolkit: ComposioToolkit,
  callbackUrl: string
) {
  const session = await createComposioSession(orgId, [toolkit]);
  const connectionRequest = await session.authorize(toolkit, { callbackUrl });
  return { redirectUrl: connectionRequest.redirectUrl };
}

export async function executeComposioTool(
  orgId: number,
  toolSlug: string,
  args: Record<string, unknown>
) {
  const composio = getComposioClient();
  const entityId = composioEntityId(orgId);
  const result = await composio.tools.execute(toolSlug, {
    userId: entityId,
    arguments: args,
  });
  return result;
}

export async function getConnectedAccountDetails(connectedAccountId: string) {
  try {
    const composio = getComposioClient();
    const account = await composio.connectedAccounts.get(connectedAccountId);
    return {
      status: account.status,
      toolkit: account.toolkit?.slug || null,
      metadata: account.state?.val || null,
    };
  } catch (error) {
    console.error("[Composio] Error fetching connected account details:", error);
    return null;
  }
}
