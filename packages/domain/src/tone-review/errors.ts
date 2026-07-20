// Tone-review gate error type — Story 2.2 (AC3).
//
// Mirrors `AuthorizationDeniedError` (../errors.ts / ../rbac/check.ts): a typed,
// framework-agnostic domain error carrying a structured denial, with a
// `toErrorResponse(requestId)` projector into the transport `ErrorResponse`
// envelope. The HTTP adapter (the apps/api error-mapping middleware) catches the
// throw and maps it to HTTP 409 `tone_review.required` — the symmetric move to the
// RBAC guard's 403 `authz.forbidden`.
//
// FRAMEWORK-AGNOSTIC. No Fastify/HTTP import (the rbac/check.ts precedent). The
// message is intentionally non-sensitive — it names the reason + the resource
// locator, NEVER the reviewed copy or its content hash. The structured `denial`
// carries the full context for the 409 `details` payload + the audit seam.

import type { ErrorResponseShape } from '../errors.js';

/**
 * Why a tone-review publish was denied. The two fail-closed invariants:
 *   - `signoff-missing`   — no recorded sign-off (or a sign-off with no reviewer).
 *   - `author-is-reviewer`— a sign-off exists but `reviewedBy === authoredBy`
 *     (the non-author invariant — an author cannot tone-review their own copy).
 */
export type ToneReviewDenialReason = 'signoff-missing' | 'author-is-reviewer';

/**
 * The structured tone-review denial. Carries exactly the non-sensitive context the
 * 409 `details` payload + the `tone_review.publish_blocked` audit line need — the
 * publish target's resource locator, the actor who authored the copy, and (when a
 * sign-off was present but rejected) the reviewer it carried. NO raw copy material.
 */
export interface ToneReviewDenial {
  /** Which fail-closed invariant tripped. */
  reason: ToneReviewDenialReason;
  /** The publish target's resource locator (e.g. `niyamavali:clause:7`). */
  resourceLocator: string;
  /** The actor who authored the copy being published. */
  authoredBy: string;
  /** The reviewer on the rejected sign-off, or `null` when none was present. */
  reviewedBy: string | null;
}

/**
 * The namespaced error code for a tone-review denial (`<domain>.<action>` per
 * architecture §3.2). Maps to HTTP 409 at the transport boundary (matches Story
 * 2.4's `tone_review.required` publish contract).
 */
export const TONE_REVIEW_REQUIRED_CODE = 'tone_review.required';

/**
 * Thrown by the apps/api tone-review pre-handler when a publish is attempted without
 * a recorded non-author tone-review sign-off. Fail-closed: an absent sign-off, an
 * empty reviewer, or an author-reviews-own-copy attempt all raise this. The HTTP
 * adapter maps it to a 409 via `toErrorResponse(requestId)`.
 */
export class ToneReviewRequiredError extends Error {
  public readonly name = 'ToneReviewRequiredError';
  /** The namespaced error code (HTTP 409 at transport). */
  public readonly code = TONE_REVIEW_REQUIRED_CODE;
  public constructor(public readonly denial: ToneReviewDenial) {
    super(
      `Tone review required: ${denial.reason} for resource '${denial.resourceLocator}'`,
    );
  }

  /**
   * Project this denial into the transport `ErrorResponse` envelope shape. The HTTP
   * adapter calls this at the 409 boundary, supplying the request-correlation id.
   * Kept here (not at the contracts layer) so the domain gate owns its error
   * end-to-end without inverting the package layering — the rbac precedent.
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
