import { requirePlatformAdmin } from "@/lib/session";
import { db } from "@/db";
import { organizationIntegrations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    await requirePlatformAdmin();
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      return badRequest("ID inválido");
    }

    await db
      .update(organizationIntegrations)
      .set({
        status: "disconnected",
        composioConnectedAccountId: null,
        connectedEmail: null,
        updatedAt: new Date(),
      })
      .where(eq(organizationIntegrations.id, id));

    return ok(null);
  }, "POST /api/admin/integrations/[id]/disconnect");
}
