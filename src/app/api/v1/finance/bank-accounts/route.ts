import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { bankAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";

export const GET = withApiAuth(
  async (_request: NextRequest, { session }) => {
    const accounts = await db.select().from(bankAccounts)
      .where(eq(bankAccounts.organizationId, session.organizationId));

    return { data: { object: "list", data: accounts.map((a) => ({ object: "bank_account", ...a })), url: "/api/v1/finance/bank-accounts" } };
  },
  { scope: "finance:read" }
);
