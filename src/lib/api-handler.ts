import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: true, data, ...extra }, { status });
}

export function paginated<T>(
  data: T,
  meta: { page?: number; limit?: number; total: number; totalPages?: number }
) {
  return NextResponse.json({ success: true, data, meta });
}

export function created<T>(data: T) {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function notFound(message: string) {
  return NextResponse.json(
    { success: false, error: { code: "NOT_FOUND", message } },
    { status: 404 }
  );
}

export function badRequest(message: string, code = "VALIDATION_ERROR") {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status: 400 }
  );
}

export function serverError(message: string) {
  return NextResponse.json(
    { success: false, error: { code: "ERROR", message } },
    { status: 500 }
  );
}

export function conflict(message: string, code = "CONFLICT") {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status: 409 }
  );
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json(
    { success: false, error: { code: "FORBIDDEN", message } },
    { status: 403 }
  );
}

export async function apiHandler(
  fn: () => Promise<NextResponse>,
  label?: string
): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    if (label) console.error(`[${label}]`, error);
    const message = error instanceof Error ? error.message : "Error";
    const status = message.includes("Unauthorized") ? 401
      : message.includes("Forbidden") ? 403
      : 500;
    return NextResponse.json(
      { success: false, error: { code: "ERROR", message } },
      { status }
    );
  }
}
