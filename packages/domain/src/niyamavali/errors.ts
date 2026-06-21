// Niyamavali registry typed domain errors — Story 2.3 (Task 6, AC3).
//
// @twt/domain owns these typed errors; the HTTP mapping lands at the Story 2.4
// admin route (Dev Notes §"409 ownership"): `ClauseIdConflictError` → HTTP 409,
// `ClauseNotFoundError` → HTTP 404. 2.3 delivers the typed domain conflict + the
// DB `unique (pariwar_id, clause_id, version)` guard; it does NOT build an HTTP
// handler. Surfaced at the @twt/domain top level (../index.ts) so the apps/api
// error-mapping middleware imports the class + code directly — mirroring
// `AuthorizationDeniedError` / `ToneReviewRequiredError`.

import type { ErrorResponseShape } from '../errors.js';

/** Namespaced error code for a clause-id allocation conflict (HTTP 409 at transport). */
export const CLAUSE_ID_CONFLICT_CODE = 'niyamavali.clause_id_conflict';

/**
 * Thrown by `createClause` when a `clause_id` is already allocated for the Pariwar
 * (AC3: "allocated by the trustee … immutable … allocation conflicts rejected").
 * Fail-closed: raised either by the in-transaction pre-check OR by mapping the
 * DB unique-violation (23505) on the race. The 2.4 route maps this → HTTP 409.
 */
export class ClauseIdConflictError extends Error {
  public readonly name = 'ClauseIdConflictError';
  public readonly code = CLAUSE_ID_CONFLICT_CODE;
  public constructor(
    public readonly pariwarId: string,
    public readonly clauseId: string,
  ) {
    super(
      `clause_id '${clauseId}' is already allocated for this Pariwar — ` +
        `clause ids are immutable and never reused (AC3)`,
    );
  }

  /** Project into the transport ErrorResponse envelope (the 2.4 route supplies requestId). */
  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { clause_id: this.clauseId },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for an absent clause (HTTP 404 at transport). */
export const CLAUSE_NOT_FOUND_CODE = 'niyamavali.clause_not_found';

/**
 * Thrown by `amendClause` / `deprecateClause` when no version of the given
 * `clause_id` exists for the Pariwar (cannot amend/deprecate what was never
 * created). The 2.4 route maps this → HTTP 404.
 */
export class ClauseNotFoundError extends Error {
  public readonly name = 'ClauseNotFoundError';
  public readonly code = CLAUSE_NOT_FOUND_CODE;
  public constructor(
    public readonly pariwarId: string,
    public readonly clauseId: string,
  ) {
    super(`no clause_id '${clauseId}' exists for this Pariwar`);
  }
}
