import { NextResponse } from "next/server";
import { CURRENT_API_VERSION } from "@/lib/api/api-versioning";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: CURRENT_API_VERSION,
    timestamp: new Date().toISOString(),
    services: {
      api: "operational",
      database: "operational",
    },
  }, {
    headers: {
      "Cache-Control": "no-cache",
    },
  });
}
