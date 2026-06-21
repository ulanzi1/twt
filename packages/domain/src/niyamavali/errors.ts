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

// ── Draft-store errors (Story 2.4) ───────────────────────────────────────────
// The draft accessors (niyamavali/drafts.ts) own a small state machine; these
// typed errors let the 2.4 route map them to stable HTTP envelopes without 500ing
// on a legitimate out-of-order request. Mirrors the ClauseId* projector shape.

/** Namespaced error code for an absent draft (HTTP 404 at transport). */
export const DRAFT_NOT_FOUND_CODE = 'niyamavali.draft_not_found';

/** Thrown when a `draft_id` does not resolve in the active Pariwar. → HTTP 404. */
export class DraftNotFoundError extends Error {
  public readonly name = 'DraftNotFoundError';
  public readonly code = DRAFT_NOT_FOUND_CODE;
  public constructor(
    public readonly pariwarId: string,
    public readonly draftId: string,
  ) {
    super(`no draft '${draftId}' exists for this Pariwar`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { draft_id: this.draftId },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for an invalid draft state transition (HTTP 409). */
export const DRAFT_INVALID_STATE_CODE = 'niyamavali.draft_invalid_state';

/**
 * Thrown when a draft state transition is illegal for the draft's current status
 * (e.g. editing a published draft, signing off a draft not in review, publishing
 * an unsigned draft). The 2.4 route maps this → HTTP 409 (a conflict with current
 * resource state, retryable once the precondition holds).
 */
export class DraftStateError extends Error {
  public readonly name = 'DraftStateError';
  public readonly code = DRAFT_INVALID_STATE_CODE;
  public constructor(
    public readonly draftId: string,
    public readonly currentStatus: string,
    public readonly detail: string,
  ) {
    super(`draft '${draftId}' (status=${currentStatus}): ${detail}`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { draft_id: this.draftId, current_status: this.currentStatus },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for a self-review sign-off attempt (HTTP 409). */
export const DRAFT_SELF_REVIEW_CODE = 'niyamavali.draft_self_review';

/**
 * Thrown by `recordDraftSignoff` when the would-be reviewer authored the draft —
 * an author cannot tone-review their own copy (AC1d; defense-in-depth alongside the
 * publish gate's invariant 3). The 2.4 route maps this → HTTP 409.
 */
export class DraftSelfReviewError extends Error {
  public readonly name = 'DraftSelfReviewError';
  public readonly code = DRAFT_SELF_REVIEW_CODE;
  public constructor(public readonly draftId: string) {
    super(`draft '${draftId}': the author cannot tone-review their own draft`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { draft_id: this.draftId },
        request_id: requestId,
      },
    };
  }
}
