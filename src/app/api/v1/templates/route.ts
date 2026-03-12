import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { eventTemplates } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const GET = withApiAuth(
  async (_request: NextRequest, { session }) => {
    const templates = await db.select().from(eventTemplates)
      .where(eq(eventTemplates.organizationId, session.organizationId))
      .orderBy(desc(eventTemplates.createdAt));

    return { data: { object: "list", data: templates.map((t) => ({ object: "template", ...t })), url: "/api/v1/templates" } };
  },
  { scope: "templates:read" }
);
