// T&C registry typed domain errors — Story 2.6 (Task 3).
//
// @twt/domain owns these typed errors; the HTTP mapping lands at the Story 2.6
// trustee route (mirror niyamavali/errors.ts): `TcVersionNotFoundError` → 404,
// `TcStateError` (illegal transition) → 409, `TcVersionConflictError` (concurrent
// create race) → 409, `TcPinnedClauseNotFoundError` (a pin references a clause
// version that is absent / cross-tenant) → 422. Surfaced at the @twt/domain top
// level (../index.ts) so the apps/api error-mapping middleware imports the class +
// code directly — mirroring `ClauseNotFoundError` / `ClauseIdConflictError`.

import type { ErrorResponseShape } from '../errors.js';

/** Namespaced error code for an absent T&C version (HTTP 404 at transport). */
export const TC_VERSION_NOT_FOUND_CODE = 'terms_and_conditions.version_not_found';

/**
 * Thrown by `approveTcVersion` / `supersedeTcVersion` when no T&C version with the
 * given `tc_version_id` exists for the Pariwar. The route maps this → HTTP 404.
 */
export class TcVersionNotFoundError extends Error {
  public readonly name = 'TcVersionNotFoundError';
  public readonly code = TC_VERSION_NOT_FOUND_CODE;
  public constructor(
    public readonly pariwarId: string,
    public readonly tcVersionId: string,
  ) {
    super(`no T&C version '${tcVersionId}' exists for this Pariwar`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { tc_version_id: this.tcVersionId },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for a concurrent create race on `createTcVersion` (HTTP 409). */
export const TC_VERSION_CONFLICT_CODE = 'terms_and_conditions.version_conflict';

/**
 * Thrown by `createTcVersion` when a Postgres unique-violation (23505) occurs on
 * either the `(pariwar_id, version)` index or the partial-unique
 * `(pariwar_id) WHERE effective_until IS NULL` — both indicate a concurrent create
 * race. The route maps this → HTTP 409. Mirror `ClauseIdConflictError`.
 */
export class TcVersionConflictError extends Error {
  public readonly name = 'TcVersionConflictError';
  public readonly code = TC_VERSION_CONFLICT_CODE;
  public constructor(public readonly pariwarId: string) {
    super(
      `concurrent T&C version creation conflict for this Pariwar — retry the request`,
    );
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: {},
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for an invalid T&C state transition (HTTP 409). */
export const TC_INVALID_STATE_CODE = 'terms_and_conditions.invalid_state';

/**
 * Thrown when a legal-review transition is illegal for the version's current
 * status (e.g. approving an already-`superseded` version, or superseding one that
 * is already `superseded`). The route maps this → HTTP 409 (a conflict with
 * current resource state).
 */
export class TcStateError extends Error {
  public readonly name = 'TcStateError';
  public readonly code = TC_INVALID_STATE_CODE;
  public constructor(
    public readonly tcVersionId: string,
    public readonly currentStatus: string,
    public readonly detail: string,
  ) {
    super(`T&C version '${tcVersionId}' (status=${currentStatus}): ${detail}`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { tc_version_id: this.tcVersionId, current_status: this.currentStatus },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for a pin that references an absent/cross-tenant clause (HTTP 422). */
export const TC_PINNED_CLAUSE_NOT_FOUND_CODE = 'terms_and_conditions.pinned_clause_not_found';

/**
 * Thrown by `createTcVersion` when a pinned `clause_version_id` does not resolve in
 * the Pariwar — either it does not exist (caught by the domain pre-check or the FK
 * 23503) or it belongs to a DIFFERENT Pariwar (caught by the same-tenant pre-check:
 * `resolveByClauseVersionId` returns a row only when `pariwar_id` matches). The FK
 * alone cannot catch the cross-tenant case (it targets the global PK), so the
 * pre-check is NOT optional. The route maps this → HTTP 422 (unprocessable entity:
 * the request references a resource that is not a valid pin target).
 */
export class TcPinnedClauseNotFoundError extends Error {
  public readonly name = 'TcPinnedClauseNotFoundError';
  public readonly code = TC_PINNED_CLAUSE_NOT_FOUND_CODE;
  public constructor(
    public readonly pariwarId: string,
    public readonly clauseVersionId: string,
  ) {
    super(
      `pinned clause version '${clauseVersionId}' does not exist in this Pariwar — ` +
        `a T&C version may only pin clause versions of its own Pariwar`,
    );
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { clause_version_id: this.clauseVersionId },
        request_id: requestId,
      },
    };
  }
}
