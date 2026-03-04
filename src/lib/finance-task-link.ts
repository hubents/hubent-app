import { db } from "@/db";
import { tasks, taskParticipants, taskAttachments } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Auto-link a financial document to a task in the same event that has 
 * the vendor as participant. Creates a "link" attachment in the task.
 * This is non-blocking — errors are silently logged.
 */
export async function linkDocumentToTask(
  organizationId: number,
  documentId: number,
  documentType: string,
  documentNumber: string,
  eventId: number,
  vendorId: number
) {
  try {
    const matchingTasks = await db
      .select({ taskId: tasks.id })
      .from(tasks)
      .innerJoin(taskParticipants, eq(tasks.id, taskParticipants.taskId))
      .where(
        and(
          eq(tasks.organizationId, organizationId),
          eq(tasks.eventId, eventId),
          eq(taskParticipants.vendorId, vendorId)
        )
      )
      .limit(1);

    if (matchingTasks.length === 0) return;

    const taskId = matchingTasks[0].taskId;
    const typeName = documentType === "invoice" ? "Factura" : documentType === "quote" ? "Presupuesto" : documentType === "proforma" ? "Proforma" : "Documento";

    const existing = await db
      .select({ id: taskAttachments.id })
      .from(taskAttachments)
      .where(
        and(
          eq(taskAttachments.taskId, taskId),
          eq(taskAttachments.name, `${typeName} ${documentNumber}`)
        )
      )
      .limit(1);

    if (existing.length > 0) return;

    await db.insert(taskAttachments).values({
      taskId,
      type: "link",
      name: `${typeName} ${documentNumber}`,
      url: `/api/finance/documents/${documentId}/pdf`,
    });
  } catch (err) {
    console.error("linkDocumentToTask failed (non-blocking):", err);
  }
}
