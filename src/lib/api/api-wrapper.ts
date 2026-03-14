import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, requireScope, PROVIDER_ALLOWED_SCOPES, type ApiKeySession, type ApiScope } from "./api-auth";
import { checkRateLimit, rateLimitHeaders, rateLimitResponse } from "./api-rate-limit";
import { ApiError, internalError, featureNotAvailableError } from "./api-errors";
import { isFeatureAvailable } from "./api-feature-flags";
import { generateRequestId, getClientIp, apiHeaders, toSnakeCaseObject } from "./api-utils";
import { logApiRequest } from "./api-keys";
import { checkIdempotencyKey, saveIdempotencyKey } from "./api-idempotency";
import { CURRENT_API_VERSION } from "./api-versioning";

// ============================================
// Handler types
// ============================================

export interface ApiContext {
  session: ApiKeySession;
  requestId: string;
  params: Record<string, string>;
}

export type ApiHandler = (
  request: NextRequest,
  context: ApiContext
) => Promise<NextResponse | { status?: number; data: unknown }>;

// ============================================
// Wrapper options
// ============================================

export interface ApiWrapperOptions {
  scope: ApiScope;
  idempotent?: boolean; // Enable idempotency key check (for POST/PATCH)
  requiredFeature?: string; // Feature flag key required for this endpoint
}

// ============================================
// Universal API wrapper
// ============================================

export function withApiAuth(
  handler: ApiHandler,
  options: ApiWrapperOptions
) {
  return async (
    request: NextRequest,
    routeContext?: { params?: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    let session: ApiKeySession | null = null;
    let statusCode = 500;

    try {
      // 1. Authenticate API key
      session = await authenticateApiKey(request);

      // 2. Check scope
      requireScope(session, options.scope);

      // 2.1. Enforce provider scope restrictions
      if (session.orgType === "provider") {
        const isAllowed = PROVIDER_ALLOWED_SCOPES.includes(options.scope);
        if (!isAllowed) {
          throw new ApiError(
            "authorization_error",
            "scope_not_allowed_for_provider",
            `Provider accounts cannot access scope '${options.scope}'. Allowed: ${PROVIDER_ALLOWED_SCOPES.join(", ")}`,
            403
          );
        }
      }

      // 2.5. Check feature flag
      if (options.requiredFeature) {
        const planSlug = session.plan?.slug || "starter";
        if (!isFeatureAvailable(planSlug, options.requiredFeature)) {
          throw featureNotAvailableError(options.requiredFeature);
        }
      }

      // 3. Rate limiting
      const rlResult = await checkRateLimit(session.apiKeyId, session.rateLimit);
      if (!rlResult.allowed) {
        statusCode = 429;
        return rateLimitResponse(rlResult, requestId);
      }

      // 4. Idempotency check (POST/PATCH only)
      if (options.idempotent && (request.method === "POST" || request.method === "PATCH")) {
        const idempotencyKey = request.headers.get("idempotency-key");
        if (idempotencyKey) {
          const cached = await checkIdempotencyKey(
            idempotencyKey,
            session.apiKeyId,
            request.nextUrl.pathname
          );
          if (cached) {
            statusCode = cached.responseCode;
            const response = NextResponse.json(cached.responseBody, {
              status: cached.responseCode,
              headers: {
                ...apiHeaders(requestId),
                ...rateLimitHeaders(rlResult),
                "Idempotency-Replayed": "true",
              },
            });
            return response;
          }
        }
      }

      // 5. Resolve route params
      const params = routeContext?.params ? await routeContext.params : {};

      // 6. Execute handler
      const result = await handler(request, {
        session,
        requestId,
        params,
      });

      // 7. Build response
      let response: NextResponse;
      if (result instanceof NextResponse) {
        response = result;
        statusCode = response.status;
      } else {
        statusCode = result.status || 200;
        const snakeCaseData = toSnakeCaseObject(result.data);
        response = NextResponse.json(snakeCaseData, {
          status: statusCode,
          headers: {
            ...apiHeaders(requestId),
            ...rateLimitHeaders(rlResult),
          },
        });
      }

      // Add standard headers to any response
      response.headers.set("X-Request-Id", requestId);
      response.headers.set("X-HubEnts-Version", CURRENT_API_VERSION);
      for (const [key, value] of Object.entries(rateLimitHeaders(rlResult))) {
        response.headers.set(key, value);
      }

      // 8. Save idempotency key if applicable
      if (options.idempotent && (request.method === "POST" || request.method === "PATCH")) {
        const idempotencyKey = request.headers.get("idempotency-key");
        if (idempotencyKey && statusCode >= 200 && statusCode < 300) {
          const body = await responseToJson(response);
          saveIdempotencyKey(
            idempotencyKey,
            session.apiKeyId,
            request.nextUrl.pathname,
            statusCode,
            body
          ).catch(() => {});
        }
      }

      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        statusCode = error.statusCode;
        const response = error.toResponse(requestId);
        response.headers.set("X-Request-Id", requestId);
        return response;
      }

      console.error(`[API ${requestId}] Unhandled error:`, error);
      statusCode = 500;
      const err = internalError();
      return err.toResponse(requestId);
    } finally {
      // 9. Log request (fire-and-forget)
      if (session) {
        const responseTime = Date.now() - startTime;
        logApiRequest({
          apiKeyId: session.apiKeyId,
          method: request.method,
          path: request.nextUrl.pathname,
          statusCode,
          responseTimeMs: responseTime,
          ipAddress: getClientIp(request),
          userAgent: request.headers.get("user-agent") || undefined,
          requestId,
          errorCode: statusCode >= 400 ? `http_${statusCode}` : undefined,
        }).catch(() => {});
      }
    }
  };
}

// ============================================
// Helper to clone response body for idempotency storage
// ============================================

async function responseToJson(response: NextResponse): Promise<unknown> {
  try {
    const cloned = response.clone();
    return await cloned.json();
  } catch {
    return null;
  }
}
