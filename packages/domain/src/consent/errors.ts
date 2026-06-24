// Consent registry typed domain errors — Story 2.7 (Task 2).
//
// @twt/domain owns these typed errors; the HTTP mapping lands at the CONSUMER route
// (Epic 3 signup / Epic 6 claim — 2.7 has no route of its own), mirror
// niyamavali/errors.ts + terms-and-conditions/errors.ts: `ConsentNotFoundError` →
// 404, `ConsentStateError` (illegal transition, e.g. double-revoke) → 409. Surfaced
// at the @twt/domain top level (../index.ts) so a consumer-route error-mapping
// middleware imports the class AND the code constant directly — the middleware
// matches on the code constant (`switch`/`if`), not the class instance, so
// exporting only the class would break that pattern.

import type { ErrorResponseShape } from '../errors.js';

/** Namespaced error code for an absent consent record (HTTP 404 at transport). */
export const CONSENT_NOT_FOUND_CODE = 'consent.not_found';

/**
 * Thrown by `revokeConsent` when no consent record with the given `consent_id`
 * exists for the Pariwar (the revoke guard's `resolveConsentById` returned null).
 * The consumer route maps this → HTTP 404.
 */
export class ConsentNotFoundError extends Error {
  public readonly name = 'ConsentNotFoundError';
  public readonly code = CONSENT_NOT_FOUND_CODE;
  public constructor(
    public readonly pariwarId: string,
    public readonly consentId: string,
  ) {
    super(`no consent record '${consentId}' exists for this Pariwar`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { consent_id: this.consentId },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for an illegal consent state transition (HTTP 409). */
export const CONSENT_INVALID_STATE_CODE = 'consent.invalid_state';

/**
 * Thrown by `revokeConsent` when the transition is illegal for the record's current
 * state — specifically, revoking an ALREADY-revoked consent (`revoked_at` is already
 * set). The consumer route maps this → HTTP 409 (a conflict with current resource
 * state). Mirror `TcStateError`.
 */
export class ConsentStateError extends Error {
  public readonly name = 'ConsentStateError';
  public readonly code = CONSENT_INVALID_STATE_CODE;
  public constructor(
    public readonly consentId: string,
    public readonly detail: string,
  ) {
    super(`consent record '${consentId}': ${detail}`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { consent_id: this.consentId },
        request_id: requestId,
      },
    };
  }
}
