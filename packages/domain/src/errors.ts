// Domain-level error types for the pariwar-scope session-variable contract +
// the RBAC authorization guard (Story 1.8).
//
// @twt/domain owns these typed errors; transport-level mapping to an HTTP 500
// (or 4xx where appropriate) lives at apps/api per architecture §3.2 line
// 1819-1830 + Story 1.4's _common/errors.ts ErrorResponse envelope. Keeping
// the error types in @twt/domain lets every consumer (apps/api middleware at
// Story 1.9, apps/jobs at Story 1.12, integration tests) catch the same class.
//
// Type-only imports from ./rbac/scope.js (erased at runtime — no module cycle:
// scope.ts imports nothing from here) so the authorization-denial shape carries
// the precise ScopeDimension / TargetLocator types.

import type { ScopeDimension, TargetLocator } from './rbac/scope.js';

/** Thrown when application code reads/receives a pariwar_id that is not a valid UUID. */
export class InvalidPariwarScopeError extends Error {
  public readonly name = 'InvalidPariwarScopeError';
  public constructor(public readonly received: string) {
    super(`Invalid pariwar_id scope value: ${JSON.stringify(received)}`);
  }
}

/** Thrown when assertPariwarScopeSet() finds the `app.pariwar_id` session variable unset. */
export class PariwarScopeMissingError extends Error {
  public readonly name = 'PariwarScopeMissingError';
  public constructor() {
    super(
      'app.pariwar_id session variable is unset — the scope-resolution middleware ' +
        'did not run, or this connection was opened outside the named ' +
        'cross-tenant operations module (packages/domain/src/cross-tenant/).',
    );
  }
}

// ── RBAC authorization (Story 1.8, AC-4 + AC-5) ──────────────────────────────

/**
 * Domain-local mirror of the transport `ErrorResponse` envelope shape
 * (packages/contracts/src/_common/errors.ts). Referenced by SHAPE, not by hard
 * import: `@twt/domain` must NOT import `@twt/contracts` (turbo cycle — contracts
 * depends on domain, never the reverse). The HTTP adapter (Story 1.9) maps a
 * thrown `AuthorizationDeniedError` to this envelope at the 403 boundary.
 */
export interface ErrorResponseShape {
  error: {
    code: string;
    message: string;
    details?: unknown;
    request_id: string;
  };
}

/**
 * The structured authorization-denial value (AC-5). Carries exactly the four
 * fields the epic requires — `{ actorId, permissionKey, requiredScope,
 * targetLocator }` — for the 403 `details` payload AND for the FR-47 audit seam
 * (the injectable `onAuthorizationDenied` hook in rbac/check.ts; the actual audit
 * sink is Story 1.10, NOT built here).
 */
export interface AuthorizationDenial {
  /** The acting subject (user) id. */
  actorId: string;
  /** The permission key that was required and not satisfied. */
  permissionKey: string;
  /** The scope dimension the action was required at. */
  requiredScope: ScopeDimension;
  /** The resource the action targeted (dimension + concrete node). */
  targetLocator: TargetLocator;
}

/**
 * The namespaced error code for an authorization denial (`<domain>.<action>` per
 * architecture §3.2 L1829-1830). Maps to HTTP 403 at the transport boundary.
 */
export const AUTHORIZATION_DENIED_CODE = 'authz.forbidden';

/**
 * Thrown by `requirePermission` (rbac/check.ts) when the actor's grants do not
 * carry the required permission key at the required scope. Fail-closed: an absent
 * grant, unknown key, scope mismatch, or unresolved locator all raise this. The
 * message is intentionally non-sensitive (no values beyond the key/scope); the
 * structured `denial` carries the full context for the 403 `details` + audit seam.
 */
export class AuthorizationDeniedError extends Error {
  public readonly name = 'AuthorizationDeniedError';
  /** The namespaced error code (HTTP 403 at transport). */
  public readonly code = AUTHORIZATION_DENIED_CODE;
  public constructor(public readonly denial: AuthorizationDenial) {
    super(
      `Authorization denied: permission '${denial.permissionKey}' required at ` +
        `scope '${denial.requiredScope}'`,
    );
  }

  /**
   * Project this denial into the transport `ErrorResponse` envelope shape. The
   * HTTP adapter (Story 1.9) calls this at the 403 boundary, supplying the
   * request-correlation id. Kept here (not at the contracts layer) so the domain
   * guard owns its error end-to-end without inverting the package layering.
   */
  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.denial,
        request_id: requestId,
      },
    };
  }
}
