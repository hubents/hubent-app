import { NextResponse } from "next/server";
import { generateOpenApiSpec } from "@/lib/api/openapi-spec";

export async function GET() {
  const spec = generateOpenApiSpec();
  return NextResponse.json(spec, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
