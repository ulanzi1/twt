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

/**
 * 409 — Story 6.11 (R5): the authenticated admin has no `users.display_name`, so their controlled
 * staff-attribution snapshot cannot be resolved and adjudication is BLOCKED fail-closed BEFORE any
 * event/decision row is written. NO fallback (never the email, UUID, role/district label, placeholder,
 * or client input). The distinct machine code tells ops to provision the display name (via
 * setAdminDisplayName / repo.updateDisplayName). A 409 (not 400) — the request is well-formed; the
 * server-side account state is the blocker.
 */
export class AdminDisplayNameMissingError extends ApiError {
  public constructor(public readonly actorId: string) {
    super(
      409,
      'admin.display_name_missing',
      'Your admin account has no display name configured; adjudication is blocked until it is provisioned.',
      { actorId },
    );
  }
}

/**
 * 409 — Story 6.12 (R1/AC2): a MANUAL shepherd reassignment targets an admin with a display name but NO
 * usable contact channel (neither `contact_phone` nor `contact_whatsapp`). FR-41 promises the family a
 * REACHABLE human, so an un-contactable shepherd is blocked fail-closed BEFORE any event/row is written —
 * NO fallback, no placeholder. The distinct machine code tells ops to provision a contact channel (via
 * repo.updateShepherdContact). A 409 (not 400): the request is well-formed; the target account state is
 * the blocker. (The automatic + AR-61 fallback paths never hit this — they SKIP an uncontactable candidate.)
 */
export class ShepherdNotContactableError extends ApiError {
  public constructor(public readonly targetActorId: string) {
    super(
      409,
      'shepherd.not_contactable',
      'The chosen shepherd has no usable contact channel configured; reassignment is blocked until one is provisioned.',
      { targetActorId },
    );
  }
}

/**
 * 403 — Story 6.12 review finding: a MANUAL shepherd reassignment targets a user who is NOT an active
 * `district_admin` at the claim's server-derived district (or not in the claim's tenant at all). Unlike
 * `AdminDisplayNameMissingError`/`ShepherdNotContactableError` (a real district admin missing an
 * attribution field), this target is not authorized to be a shepherd for this claim at all — routing a
 * claim's family contact to an arbitrary user id is blocked fail-closed BEFORE any event/row is written.
 */
export class ShepherdTargetNotEligibleError extends ApiError {
  public constructor(public readonly targetActorId: string) {
    super(
      403,
      'shepherd.target_not_eligible',
      'The chosen target is not an authorized district admin for this claim’s district.',
      { targetActorId },
    );
  }
}

/**
 * 410 — the resource existed but is permanently gone. Story 3.11's data-export download uses this for
 * a one-time artifact already consumed (`data_export.consumed`) or past its 24h window
 * (`data_export.expired`) — a distinct signal from 404 (never existed) or 409 (not ready yet).
 */
export class GoneError extends ApiError {
  public constructor(message: string, code = 'request.gone', details?: unknown) {
    super(410, code, message, details);
  }
}

/** 413 — request entity too large (e.g. an uploaded claim document over the byte cap). */
export class PayloadTooLargeError extends ApiError {
  public constructor(message = 'Payload too large', code = 'request.too_large', details?: unknown) {
    super(413, code, message, details);
  }
}

/** 415 — unsupported media type (e.g. an upload MIME outside the allowlist). */
export class UnsupportedMediaTypeError extends ApiError {
  public constructor(message = 'Unsupported media type', code = 'request.unsupported_media_type', details?: unknown) {
    super(415, code, message, details);
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

/** 502 — an upstream dependency (e.g. the Dokploy deploy API) failed or was unreachable. */
export class BadGatewayError extends ApiError {
  public constructor(message = 'Upstream dependency failed', code = 'upstream.bad_gateway', details?: unknown) {
    super(502, code, message, details);
  }
}

/**
 * 503 — a required server-side resource is not provisioned/available yet (NOT a client error).
 * Story 3.5's medical ima-list GET returns this when the per-Pariwar Niyamavali registry has no
 * `niy.medical.ima-list` / `niy.concealment.r14` clause — the screen renders a graceful
 * "disclosure unavailable" state. (The SUBMIT path returns 409 per AC6 — 503 is GET-only.)
 */
export class ServiceUnavailableError extends ApiError {
  public constructor(message = 'Service unavailable', code = 'request.unavailable', details?: unknown) {
    super(503, code, message, details);
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
