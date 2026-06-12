// apps/api transport-error hierarchy.
//
// `ApiError` is the base every handler throws; the error-mapping middleware
// (Task 1.4) projects it into the `_common/errors.ts` `ErrorResponse` envelope
// (`{ error: { code, message, details?, request_id } }`). Codes are namespaced
// `<domain>.<action>` per architecture §3.2 L1829-1830. Messages are
// non-sensitive (no secret material, no plaintext email, no token) — the
// structured `details` carries only safe context.
//
// Domain errors (`AuthorizationDeniedError`, `InvalidPariwarScopeError`, …) are
// mapped separately by the middleware (they already own their codes); ApiError is
// for the transport surface's own failures.

import type { ErrorResponseShape } from '@twt/domain';

export class ApiError extends Error {
  public constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details !== undefined ? { details: this.details } : {}),
        request_id: requestId,
      },
    };
  }
}

/** 400 — malformed input the Zod validator did not already reject. */
export class BadRequestError extends ApiError {
  public constructor(message: string, code = 'request.invalid', details?: unknown) {
    super(400, code, message, details);
  }
}

/** 401 — first/second factor not satisfied. Deliberately generic to avoid oracles. */
export class UnauthorizedError extends ApiError {
  public constructor(message = 'Authentication required', code = 'auth.unauthorized', details?: unknown) {
    super(401, code, message, details);
  }
}

/** 403 — authenticated but not permitted (non-RBAC; RBAC uses AuthorizationDeniedError). */
export class ForbiddenError extends ApiError {
  public constructor(message = 'Forbidden', code = 'auth.forbidden', details?: unknown) {
    super(403, code, message, details);
  }
}

/** 404 — resource (or Pariwar membership) not found. */
export class NotFoundError extends ApiError {
  public constructor(message = 'Not found', code = 'request.not_found', details?: unknown) {
    super(404, code, message, details);
  }
}

/** 409 — state conflict (e.g. ≤2-device cap, already-consumed code). */
export class ConflictError extends ApiError {
  public constructor(message: string, code = 'request.conflict', details?: unknown) {
    super(409, code, message, details);
  }
}

/** 423 — account locked (lockout). Escalation policy in ADR-0009. */
export class LockedError extends ApiError {
  public constructor(message = 'Account locked', code = 'auth.locked', details?: unknown) {
    super(423, code, message, details);
  }
}

/** 429 — rate limit exceeded (step-up per-actor/per-IP abuse budget). */
export class TooManyRequestsError extends ApiError {
  public constructor(message = 'Too many requests', code = 'request.rate_limited', details?: unknown) {
    super(429, code, message, details);
  }
}

/**
 * The structured "step-up required" response (AC-4). A step-up-gated action with
 * no fresh elevated context returns this; the client then drives the OTP
 * request/verify flow and retries. 403 with a distinct code so the client can
 * distinguish it from a permission denial.
 */
export class StepUpRequiredError extends ApiError {
  public constructor(actionContext: string) {
    super(403, 'auth.step_up_required', 'Fresh step-up verification required', {
      action: actionContext,
    });
  }
}
