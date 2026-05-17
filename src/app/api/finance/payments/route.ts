import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import {
  getPaymentRecords,
  createPaymentRecord,
  getPaymentSchedules,
  createPaymentSchedule,
  markSchedulePaid,
} from "@/lib/finance";
import { apiHandler, ok, created, badRequest, paginated } from "@/lib/api-handler";

// GET /api/finance/payments - List payment records or schedules
export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("finance:read");
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type"); // "records" or "schedules"
    const documentId = searchParams.get("documentId");
    const taskId = searchParams.get("taskId");
    const eventId = searchParams.get("eventId");
    const vendorId = searchParams.get("vendorId");
    const direction = searchParams.get("direction");
    const scope =
      (searchParams.get("scope") as "standalone" | "event" | "all") ||
      undefined;

    if (type === "schedules") {
      const schedules = await getPaymentSchedules(session, {
        taskId: taskId ? parseInt(taskId, 10) : undefined,
        eventId: eventId ? parseInt(eventId, 10) : undefined,
        vendorId: vendorId ? parseInt(vendorId, 10) : undefined,
        scope,
      });

      return ok(schedules);
    }

    // Default to records
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const contactId = searchParams.get("contactId");
    const statusFilter = searchParams.get("status");

    const result = await getPaymentRecords(session, {
      documentId: documentId ? parseInt(documentId, 10) : undefined,
      taskId: taskId ? parseInt(taskId, 10) : undefined,
      eventId: eventId ? parseInt(eventId, 10) : undefined,
      contactId: contactId ? parseInt(contactId, 10) : undefined,
      direction: direction || undefined,
      status: statusFilter || undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      scope,
    });

    return paginated(result.data, result.meta);
  }, "GET /api/finance/payments");
}

// POST /api/finance/payments - Create payment record or schedule
export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("finance:create");
    const body = await request.json();

    const { type } = body;

    if (type === "schedule") {
      const { name, amount, dueDate, taskId, eventId, vendorId, notes } = body;

      if (!name || !amount || !dueDate) {
        return badRequest("Name, amount, and dueDate are required");
      }

      const schedule = await createPaymentSchedule(session, {
        name,
        amount,
        dueDate: new Date(dueDate),
        taskId,
        eventId,
        vendorId,
        notes,
      });

      return created(schedule);
    }

    // Default to payment record
    const {
      amount,
      documentId,
      taskId,
      vendorId,
      contactId,
      eventId,
      bankAccountId,
      currency,
      direction,
      paymentDate,
      paymentMethod,
      reference,
      stripePaymentId,
      notes,
      status: paymentStatus,
      attachmentUrl,
      attachmentName,
    } = body;

    if (!amount) {
      return badRequest("Amount is required");
    }

    const record = await createPaymentRecord(session, {
      amount,
      documentId,
      taskId,
      vendorId,
      contactId,
      eventId,
      bankAccountId,
      currency,
      direction,
      paymentDate: paymentDate ? new Date(paymentDate) : undefined,
      paymentMethod,
      reference,
      stripePaymentId,
      notes,
      status: paymentStatus,
      attachmentUrl,
      attachmentName,
    });

    return created(record);
  }, "POST /api/finance/payments");
}

// PATCH /api/finance/payments - Mark schedule as paid
export async function PATCH(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("finance:create");
    const body = await request.json();

    const { scheduleId, paymentRecordId } = body;

    if (!scheduleId || !paymentRecordId) {
      return badRequest("scheduleId and paymentRecordId are required");
    }

    const updated = await markSchedulePaid(session, scheduleId, paymentRecordId);

    return ok(updated);
  }, "PATCH /api/finance/payments");
}
