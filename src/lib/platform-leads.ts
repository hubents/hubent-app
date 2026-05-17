import { db } from "@/db";
import { users, organizations, contacts, leads, leadStages, contactActivities } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

const PLATFORM_EMAIL = "hello@hubents.com";

let _platformOrgId: number | null = null;
let _platformUserId: string | null = null;

async function getPlatformOrg(): Promise<{ orgId: number; userId: string } | null> {
  if (_platformOrgId && _platformUserId) {
    return { orgId: _platformOrgId, userId: _platformUserId };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, PLATFORM_EMAIL),
  });
  if (!user) return null;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.ownerId, user.id),
  });
  if (!org) return null;

  _platformOrgId = org.id;
  _platformUserId = user.id;
  return { orgId: org.id, userId: user.id };
}

async function getDefaultStageId(orgId: number): Promise<number | undefined> {
  const defaultStage = await db.query.leadStages.findFirst({
    where: and(
      eq(leadStages.organizationId, orgId),
      eq(leadStages.isDefault, true)
    ),
  });
  if (defaultStage) return defaultStage.id;

  const firstStage = await db.query.leadStages.findFirst({
    where: eq(leadStages.organizationId, orgId),
    orderBy: [asc(leadStages.sortOrder)],
  });
  return firstStage?.id;
}

function formatDateTime(d: Date): string {
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
}

/**
 * Creates a contact + lead + activity note in the hello@hubents.com pipeline.
 * Always fire-and-forget — call with .catch(() => {}) so failures never block
 * the user-facing response.
 *
 * createdByName / createdByOrgName: who triggered the action.
 *   - new_user: the user themselves (auto-registration)
 *   - new_provider: the planner/provider who added the contact
 */
export async function trackPlatformLead(data: {
  kind: "new_user" | "new_provider";
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  orgType?: "tenant" | "provider" | string;
  createdByName?: string;
  createdByOrgName?: string;
}) {
  const platform = await getPlatformOrg();
  if (!platform) {
    console.warn("trackPlatformLead: hello@hubents.com not found — skipping");
    return;
  }

  const { orgId, userId } = platform;
  const stageId = await getDefaultStageId(orgId);
  const now = new Date();
  const nowFormatted = formatDateTime(now);

  const contactName = data.companyName || data.name;
  const isCompany = !!data.companyName;

  // ── Build the activity note text ─────────────────────────────────────────
  let noteLines: string[];

  if (data.kind === "new_user") {
    const typeLabel = data.orgType === "provider" ? "Proveedor" : "Planner";
    noteLines = [
      `📅 ${nowFormatted}`,
      `👤 Registro propio — ${typeLabel}`,
      `✉️ ${data.email || "sin email"}`,
      data.phone ? `📞 ${data.phone}` : "",
      data.companyName && data.name !== data.companyName
        ? `🏢 Empresa: ${data.companyName} · Persona: ${data.name}`
        : "",
    ];
  } else {
    const by = data.createdByName || "Desconocido";
    const byOrg = data.createdByOrgName ? ` (${data.createdByOrgName})` : "";
    noteLines = [
      `📅 ${nowFormatted}`,
      `👤 Creado por: ${by}${byOrg}`,
      `✉️ ${data.email || "sin email"}`,
      data.phone ? `📞 ${data.phone}` : "",
    ];
  }

  const noteText = noteLines.filter(Boolean).join("\n");

  // ── Contact ───────────────────────────────────────────────────────────────
  const [contact] = await db
    .insert(contacts)
    .values({
      organizationId: orgId,
      type: isCompany ? "company" : "person",
      name: contactName,
      email: data.email,
      phone: data.phone,
      source: "website",
      isLead: true,
      createdBy: userId,
    })
    .returning({ id: contacts.id });

  // ── Lead ──────────────────────────────────────────────────────────────────
  const typeLabel = data.kind === "new_user"
    ? (data.orgType === "provider" ? "Proveedor registrado" : "Planner registrado")
    : "Proveedor creado por tercero";

  const leadDescription = data.kind === "new_user"
    ? `Registro automático el ${nowFormatted}. Email: ${data.email || "—"}. Tipo: ${data.orgType === "provider" ? "Proveedor" : "Planner"}.`
    : `Añadido por ${data.createdByName || "desconocido"}${data.createdByOrgName ? ` de ${data.createdByOrgName}` : ""} el ${nowFormatted}.`;

  await db.insert(leads).values({
    organizationId: orgId,
    title: `${typeLabel}: ${contactName}`,
    description: leadDescription,
    contactId: contact.id,
    stageId,
    source: data.kind === "new_user" ? "website" : "referral",
    status: "new",
    assignedTo: userId,
    createdBy: userId,
  });

  // ── Activity note (visible en el timeline del contacto) ───────────────────
  await db.insert(contactActivities).values({
    contactId: contact.id,
    type: "note",
    title: typeLabel,
    description: noteText,
    metadata: {
      kind: data.kind,
      orgType: data.orgType,
      createdByName: data.createdByName,
      createdByOrgName: data.createdByOrgName,
      source: "platform_auto",
    },
    createdBy: userId,
    createdAt: now,
  });
}
