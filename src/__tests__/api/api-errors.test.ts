import { describe, it, expect } from "vitest";
import {
  ApiError,
  authenticationError,
  authorizationError,
  rateLimitError,
  notFoundError,
  validationError,
  conflictError,
  idempotencyError,
  internalError,
  subscriptionRequiredError,
  featureNotAvailableError,
  apiKeyExpiredError,
  apiKeyRevokedError,
} from "@/lib/api/api-errors";

describe("ApiError", () => {
  it("creates error with all properties", () => {
    const err = new ApiError("validation_error", "invalid_params", "Bad request", 400, "name");
    expect(err.type).toBe("validation_error");
    expect(err.code).toBe("invalid_params");
    expect(err.message).toBe("Bad request");
    expect(err.statusCode).toBe(400);
    expect(err.param).toBe("name");
    expect(err.name).toBe("ApiError");
  });

  it("generates correct response", () => {
    const err = new ApiError("not_found_error", "resource_not_found", "Not found", 404);
    const response = err.toResponse("req_test123");

    expect(response.status).toBe(404);
  });

  it("is an instance of Error", () => {
    const err = new ApiError("internal_error", "internal_error", "Oops", 500);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });
});

describe("Error factories", () => {
  it("authenticationError defaults to 401", () => {
    const err = authenticationError();
    expect(err.statusCode).toBe(401);
    expect(err.type).toBe("authentication_error");
    expect(err.code).toBe("invalid_api_key");
  });

  it("authorizationError includes scope in message", () => {
    const err = authorizationError("events:read");
    expect(err.statusCode).toBe(403);
    expect(err.message).toContain("events:read");
    expect(err.param).toBe("scope");
  });

  it("rateLimitError returns 429", () => {
    const err = rateLimitError(30);
    expect(err.statusCode).toBe(429);
    expect(err.message).toContain("30");
  });

  it("notFoundError includes resource and id", () => {
    const err = notFoundError("Event", "evt_123");
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain("Event");
    expect(err.message).toContain("evt_123");
    expect(err.param).toBe("event_id");
  });

  it("validationError returns 400", () => {
    const err = validationError("Name is required", "name");
    expect(err.statusCode).toBe(400);
    expect(err.param).toBe("name");
  });

  it("conflictError returns 409", () => {
    const err = conflictError("Already exists");
    expect(err.statusCode).toBe(409);
  });

  it("idempotencyError returns 422", () => {
    const err = idempotencyError("Key mismatch");
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe("idempotency_mismatch");
  });

  it("internalError returns 500", () => {
    const err = internalError();
    expect(err.statusCode).toBe(500);
    expect(err.type).toBe("internal_error");
  });

  it("subscriptionRequiredError returns 403", () => {
    const err = subscriptionRequiredError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("subscription_required");
  });

  it("featureNotAvailableError includes feature name", () => {
    const err = featureNotAvailableError("public_api");
    expect(err.statusCode).toBe(403);
    expect(err.message).toContain("public_api");
  });

  it("apiKeyExpiredError returns 401", () => {
    const err = apiKeyExpiredError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("api_key_expired");
  });

  it("apiKeyRevokedError returns 401", () => {
    const err = apiKeyRevokedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("api_key_revoked");
  });
});
