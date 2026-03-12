import { db } from "@/db";
import { idempotencyKeys } from "@/db/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import { idempotencyError } from "./api-errors";

// ============================================
// Idempotency Key TTL: 24 hours
// ============================================

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

// ============================================
// Check if an idempotency key exists and return cached response
// ============================================

export async function checkIdempotencyKey(
  key: string,
  apiKeyId: number,
  requestPath: string
): Promise<{ responseCode: number; responseBody: unknown } | null> {
  const [existing] = await db
    .select({
      requestPath: idempotencyKeys.requestPath,
      responseCode: idempotencyKeys.responseCode,
      responseBody: idempotencyKeys.responseBody,
      expiresAt: idempotencyKeys.expiresAt,
    })
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.key, key),
        eq(idempotencyKeys.apiKeyId, apiKeyId)
      )
    )
    .limit(1);

  if (!existing) return null;

  // Check if expired
  if (existing.expiresAt && new Date(existing.expiresAt) < new Date()) {
    return null;
  }

  // Verify same endpoint
  if (existing.requestPath !== requestPath) {
    throw idempotencyError(
      `Idempotency key '${key}' was already used for a different endpoint (${existing.requestPath}).`
    );
  }

  // If we have a stored response, return it
  if (existing.responseCode !== null) {
    return {
      responseCode: existing.responseCode,
      responseBody: existing.responseBody,
    };
  }

  // Key exists but no response yet (concurrent request)
  throw idempotencyError(
    "A request with this idempotency key is currently being processed."
  );
}

// ============================================
// Save idempotency key with response
// ============================================

export async function saveIdempotencyKey(
  key: string,
  apiKeyId: number,
  requestPath: string,
  responseCode: number,
  responseBody: unknown
): Promise<void> {
  const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);

  try {
    await db
      .insert(idempotencyKeys)
      .values({
        key,
        apiKeyId,
        requestPath,
        responseCode,
        responseBody,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: [idempotencyKeys.key, idempotencyKeys.apiKeyId],
        set: {
          responseCode,
          responseBody,
          expiresAt,
        },
      });
  } catch (error) {
    console.error("[API] Failed to save idempotency key:", error);
  }
}

// ============================================
// Cleanup expired idempotency keys (for cron job)
// ============================================

export async function cleanupExpiredIdempotencyKeys(): Promise<number> {
  const result = await db
    .delete(idempotencyKeys)
    .where(lt(idempotencyKeys.expiresAt, sql`now()`))
    .returning({ id: idempotencyKeys.id });

  return result.length;
}
