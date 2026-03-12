import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { rateLimitError } from "./api-errors";
import { generateRequestId } from "./api-utils";

// ============================================
// Rate limiter singleton (lazy init)
// ============================================

let _ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (_ratelimit) return _ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("[API Rate Limit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured. Rate limiting disabled.");
    return null;
  }

  _ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(100, "1 m"),
    analytics: true,
    prefix: "hubents:api",
  });

  return _ratelimit;
}

// ============================================
// Rate limit check
// ============================================

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // unix timestamp in seconds
}

export async function checkRateLimit(
  apiKeyId: number,
  customLimit?: number
): Promise<RateLimitResult> {
  const rl = getRatelimit();

  // If Redis not configured, allow all (dev mode)
  if (!rl) {
    return { allowed: true, limit: customLimit || 100, remaining: 99, reset: Math.floor(Date.now() / 1000) + 60 };
  }

  const identifier = `apikey:${apiKeyId}`;

  // Use custom rate limit if provided (per-key override)
  let limiter = rl;
  if (customLimit && customLimit !== 100) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
      limiter = new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(customLimit, "1 m"),
        prefix: `hubents:api:custom:${customLimit}`,
      });
    }
  }

  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  return {
    allowed: success,
    limit,
    remaining: Math.max(0, remaining),
    reset: Math.floor(reset / 1000),
  };
}

// ============================================
// Rate limit headers
// ============================================

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  };
}

// ============================================
// Rate limit response (429)
// ============================================

export function rateLimitResponse(result: RateLimitResult, requestId: string): NextResponse {
  const retryAfter = Math.max(1, result.reset - Math.floor(Date.now() / 1000));
  const err = rateLimitError(retryAfter);

  return NextResponse.json(
    {
      error: {
        type: err.type,
        code: err.code,
        message: err.message,
        request_id: requestId,
      },
    },
    {
      status: 429,
      headers: {
        ...rateLimitHeaders(result),
        "Retry-After": retryAfter.toString(),
        "X-Request-Id": requestId,
      },
    }
  );
}
