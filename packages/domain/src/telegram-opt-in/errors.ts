// Member Telegram opt-in typed domain errors — Story 5.5 (Task 3).
//
// @twt/domain owns these typed errors; the HTTP mapping lands at the CONSUMER route (the apps/api member
// opt-in routes / the worker). Mirror wa-opt-in/errors.ts: `TelegramOptInNotFoundError` → 404,
// `TelegramOptInPendingExistsError` → 409 (a PENDING is already outstanding), `TelegramOptInStateError` → 409
// (illegal transition). Surfaced at the @twt/domain top level so the error-mapping middleware imports the
// class AND the code constant (it matches on the code constant, not the instance).

import type { ErrorResponseShape } from '../errors.js';

/** Namespaced code for an absent opt-in row (HTTP 404 at transport). */
export const TELEGRAM_OPT_IN_NOT_FOUND_CODE = 'telegram_opt_in.not_found';

/** Thrown when no opt-in row with the given id/member exists for the Pariwar. Maps → HTTP 404. */
export class TelegramOptInNotFoundError extends Error {
  public readonly name = 'TelegramOptInNotFoundError';
  public readonly code = TELEGRAM_OPT_IN_NOT_FOUND_CODE;
  public constructor(
    public readonly pariwarId: string,
    public readonly locator: string,
  ) {
    super(`no Telegram opt-in '${locator}' exists for this Pariwar`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: { code: this.code, message: this.message, request_id: requestId },
    };
  }
}

/** Namespaced code for a still-outstanding PENDING opt-in (HTTP 409). */
export const TELEGRAM_OPT_IN_PENDING_EXISTS_CODE = 'telegram_opt_in.pending_exists';

/**
 * Thrown by `createPendingOptIn` when a PENDING opt-in is already outstanding for `(pariwar_id, member_id)`
 * — a member re-tapping the toggle re-uses / re-issues the existing PENDING, never duplicates it. The
 * consumer route catches this and returns the existing PENDING's deep-link (re-use), so it carries the
 * existing row's id + code for that convenience.
 */
export class TelegramOptInPendingExistsError extends Error {
  public readonly name = 'TelegramOptInPendingExistsError';
  public readonly code = TELEGRAM_OPT_IN_PENDING_EXISTS_CODE;
  public constructor(
    public readonly pariwarId: string,
    public readonly optInId: string,
    public readonly verificationCode: string,
  ) {
    super(`a PENDING Telegram opt-in is already outstanding for this member`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: { code: this.code, message: this.message, request_id: requestId },
    };
  }
}

/** Namespaced code for an illegal opt-in state transition (HTTP 409). */
export const TELEGRAM_OPT_IN_INVALID_STATE_CODE = 'telegram_opt_in.invalid_state';

/**
 * Thrown by `activateOptIn` / `revokeOptIn` when the transition is illegal for the row's current state (e.g.
 * activating a non-PENDING row, or revoking a terminal row). Maps → HTTP 409. Guards the state machine's
 * legal edges so a webhook replay or a double-action can never drive an illegal transition.
 */
export class TelegramOptInStateError extends Error {
  public readonly name = 'TelegramOptInStateError';
  public readonly code = TELEGRAM_OPT_IN_INVALID_STATE_CODE;
  public constructor(
    public readonly optInId: string,
    public readonly detail: string,
  ) {
    super(`Telegram opt-in '${optInId}': ${detail}`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: { code: this.code, message: this.message, request_id: requestId },
    };
  }
}
