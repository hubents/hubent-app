// Wrapper for API routes that adds automatic monitoring, timing, and error reporting
// Replaces manual try/catch blocks in route handlers

import { NextRequest, NextResponse } from "next/server";
import { logger } from "./logger";
import { reportError } from "./error-reporter";

export interface MonitoringContext {
  requestId: string;
  startTime: number;
}

export interface MonitorOptions {
  name: string; // e.g. "GET /api/events"
  critical?: boolean; // If true, errors are reported as "critical" level
}

type RouteHandler = (
  request: NextRequest,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse>;

function generateRequestId(): string {
  return `mon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function extractUserContext(request: NextRequest): { userId?: string; orgId?: string } {
  return {
    userId: request.headers.get("x-user-id") || undefined,
    orgId: request.headers.get("x-organization-id") || undefined,
  };
}

export function withMonitoring(handler: RouteHandler, options: MonitorOptions): RouteHandler {
  return async (
    request: NextRequest,
    routeContext?: { params?: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    const { userId, orgId } = extractUserContext(request);
    const method = request.method;
    const path = request.nextUrl.pathname;

    try {
      const response = await handler(request, routeContext);
      const durationMs = Date.now() - startTime;
      const statusCode = response.status;

      // Log slow requests (>3s)
      if (durationMs > 3000) {
        logger.warn(`Slow request: ${options.name}`, {
          requestId,
          userId,
          orgId,
          path,
          method,
          statusCode,
          durationMs,
        });
      }

      // Log 4xx/5xx responses
      if (statusCode >= 500) {
        const level = options.critical ? "critical" : "error";
        // Fire-and-forget: don't await ticket creation to avoid slowing down response
        reportError(level, `Server error in ${options.name}`, {
          requestId,
          userId,
          orgId,
          path,
          method,
          statusCode,
          durationMs,
        }).catch(() => {});
      } else if (statusCode >= 400 && statusCode !== 401 && statusCode !== 403 && statusCode !== 404) {
        logger.warn(`Client error in ${options.name}`, {
          requestId,
          userId,
          orgId,
          path,
          method,
          statusCode,
          durationMs,
        });
      }

      // Add monitoring headers
      response.headers.set("X-Request-Id", requestId);
      response.headers.set("X-Response-Time", `${durationMs}ms`);

      return response;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      const message = error instanceof Error ? error.message : "Internal server error";
      const isAuthError = message.includes("Unauthorized") || message.includes("Not authenticated");
      const isForbidden = message.includes("Forbidden") || message.includes("Missing permission");
      const isSubscriptionError = message.includes("SubscriptionInactive");
      const isLimitError = message.includes("LimitExceeded");

      let statusCode = 500;
      let errorCode = "INTERNAL_ERROR";
      let userMessage = "An unexpected error occurred";

      if (isAuthError) {
        statusCode = 401; errorCode = "UNAUTHORIZED"; userMessage = message;
      } else if (isForbidden) {
        statusCode = 403; errorCode = "FORBIDDEN"; userMessage = message;
      } else if (isSubscriptionError) {
        statusCode = 403; errorCode = "SUBSCRIPTION_INACTIVE"; userMessage = message;
      } else if (isLimitError) {
        statusCode = 403; errorCode = "LIMIT_EXCEEDED"; userMessage = message;
      }

      // Only report real server errors (500) — skip expected business errors
      if (statusCode === 500) {
        const level = options.critical ? "critical" : "error";
        reportError(level, `Unhandled exception in ${options.name}`, {
          requestId,
          userId,
          orgId,
          path,
          method,
          statusCode,
          durationMs,
          error,
        }).catch(() => {});
      }

      const response = NextResponse.json(
        {
          success: false,
          error: {
            code: errorCode,
            message: userMessage,
            requestId,
          },
        },
        { status: statusCode }
      );

      response.headers.set("X-Request-Id", requestId);
      response.headers.set("X-Response-Time", `${durationMs}ms`);

      return response;
    }
  };
}
