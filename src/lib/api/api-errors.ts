import { NextResponse } from "next/server";

// ============================================
// Stripe-grade error types
// ============================================

export type ApiErrorType =
  | "authentication_error"
  | "authorization_error"
  | "invalid_request_error"
  | "rate_limit_error"
  | "not_found_error"
  | "conflict_error"
  | "validation_error"
  | "internal_error";

export interface ApiErrorBody {
  error: {
    type: ApiErrorType;
    code: string;
    message: string;
    param?: string;
    request_id: string;
  };
}

export class ApiError extends Error {
  public readonly type: ApiErrorType;
  public readonly code: string;
  public readonly statusCode: number;
  public readonly param?: string;

  constructor(
    type: ApiErrorType,
    code: string,
    message: string,
    statusCode: number,
    param?: string
  ) {
    super(message);
    this.name = "ApiError";
    this.type = type;
    this.code = code;
    this.statusCode = statusCode;
    this.param = param;
  }

  toResponse(requestId: string): NextResponse<ApiErrorBody> {
    return NextResponse.json(
      {
        error: {
          type: this.type,
          code: this.code,
          message: this.message,
          ...(this.param ? { param: this.param } : {}),
          request_id: requestId,
        },
      },
      { status: this.statusCode }
    );
  }
}

// ============================================
// Factory helpers
// ============================================

export function authenticationError(message = "Invalid API key provided."): ApiError {
  return new ApiError("authentication_error", "invalid_api_key", message, 401);
}

export function authorizationError(scope: string): ApiError {
  return new ApiError(
    "authorization_error",
    "insufficient_scope",
    `API key does not have the required scope: ${scope}`,
    403,
    "scope"
  );
}

export function rateLimitError(retryAfter: number): ApiError {
  const err = new ApiError(
    "rate_limit_error",
    "rate_limit_exceeded",
    `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
    429
  );
  return err;
}

export function notFoundError(resource: string, id: string): ApiError {
  return new ApiError(
    "not_found_error",
    "resource_not_found",
    `${resource} with ID '${id}' not found.`,
    404,
    `${resource.toLowerCase()}_id`
  );
}

export function validationError(message: string, param?: string): ApiError {
  return new ApiError("validation_error", "invalid_params", message, 400, param);
}

export function conflictError(message: string): ApiError {
  return new ApiError("conflict_error", "resource_conflict", message, 409);
}

export function idempotencyError(message: string): ApiError {
  return new ApiError("conflict_error", "idempotency_mismatch", message, 422);
}

export function internalError(message = "An internal error occurred."): ApiError {
  return new ApiError("internal_error", "internal_error", message, 500);
}

export function subscriptionRequiredError(): ApiError {
  return new ApiError(
    "authorization_error",
    "subscription_required",
    "Active subscription required to use the API.",
    403
  );
}

export function featureNotAvailableError(feature: string): ApiError {
  return new ApiError(
    "authorization_error",
    "feature_not_available",
    `Feature '${feature}' is not available on your current plan.`,
    403
  );
}

export function apiKeyExpiredError(): ApiError {
  return new ApiError(
    "authentication_error",
    "api_key_expired",
    "This API key has expired.",
    401
  );
}

export function apiKeyRevokedError(): ApiError {
  return new ApiError(
    "authentication_error",
    "api_key_revoked",
    "This API key has been revoked.",
    401
  );
}
