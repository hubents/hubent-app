import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { apiHandler, ok } from "@/lib/api-handler";

function buildCalToken(orgId: number): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "hubents-ical";
  const hmac = createHmac("sha256", secret).update(String(orgId)).digest("hex").slice(0, 20);
  return `${orgId}-${hmac}`;
}

export async function GET() {
  return apiHandler(async () => {
    const session = await requireAuth();
    const token = buildCalToken(session.organizationId);
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return ok({ url: `${base}/api/calendar/ical/${token}/events.ics` });
  }, "GET /api/calendar/ical-url");
}

export { buildCalToken };
