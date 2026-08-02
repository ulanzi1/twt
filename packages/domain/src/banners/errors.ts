// Banner typed domain errors — Story 10.9 (AC1, AC4, AC6).
//
// @twt/domain owns these typed errors; the HTTP mapping lands in the apps/api error-mapping
// middleware (the news-blog / helpdesk precedent). Surfaced at the @twt/domain top level
// (../index.ts) so the middleware imports the class + code constant from `@twt/domain` directly.
//
// ⚠ EVERY error declared here MUST be wired into `apps/api/src/middleware/error-mapping/index.ts`.
// An UNMAPPED domain error becomes a 500 — that was the Story 10.8 Pass-3 finding, and it is not
// being repeated here.
//
// The tone-review DENY path reuses the shipped `ToneReviewRequiredError` (409) — it is NOT
// re-declared here, so the gate's structured denial reaches the client unchanged whether it was
// raised at publish or at a copy revision (Decision 5).

import type { ErrorResponseShape } from '../errors.js';

/** Namespaced error code for an absent banner (HTTP 404 at transport). */
export const BANNER_NOT_FOUND_CODE = 'banner.not_found';

/** Thrown when a `banner_id` does not resolve in the active Pariwar. → HTTP 404. */
export class BannerNotFoundError extends Error {
  public readonly name = 'BannerNotFoundError';
  public readonly code = BANNER_NOT_FOUND_CODE;
  public constructor(
    public readonly pariwarId: string,
    public readonly bannerId: string,
  ) {
    super(`no banner '${bannerId}' exists for this Pariwar`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { banner_id: this.bannerId },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for an illegal banner state transition / edit (HTTP 409). */
export const BANNER_INVALID_STATE_CODE = 'banner.invalid_state';

/**
 * Thrown when a banner action is illegal for its current status — an illegal lifecycle transition
 * (`nextBannerStatus` returned null, e.g. `publish` a retracted banner, re-`publish` a published
 * one) OR an edit on a terminal (`retracted`) banner. The route maps this → HTTP 409 (a conflict
 * with current resource state — the 10.4 `nextTicketState` / 10.5 `nextPostStatus` guard discipline).
 */
export class BannerStateError extends Error {
  public readonly name = 'BannerStateError';
  public readonly code = BANNER_INVALID_STATE_CODE;
  public constructor(
    public readonly bannerId: string,
    public readonly currentStatus: string,
    public readonly detail: string,
  ) {
    super(`banner '${bannerId}' (status=${currentStatus}): ${detail}`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { banner_id: this.bannerId, current_status: this.currentStatus },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for an undismissable popup (HTTP 422). */
export const BANNER_POPUP_MUST_BE_DISMISSIBLE_CODE = 'banner.popup_must_be_dismissible';

/**
 * Thrown when a write would produce `display_mode = 'popup' ∧ dismissible = false` — the PRD FR-58B
 * "no member trapped by an undismissable surface" invariant (AC4). This is the DOMAIN half; the
 * `banners_popup_must_be_dismissible` DB CHECK (migration 0090) is the structural half, so the
 * invariant holds on every write path including a raw SQL one.
 *
 * A NON-dismissible `banner` (`display_mode = 'banner'`) is explicitly PERMITTED — the UX spec's
 * Pattern 9 allows one for a blocking system state — so this never fires for the strip mode.
 * The route maps this → HTTP 422.
 */
export class BannerPopupMustBeDismissibleError extends Error {
  public readonly name = 'BannerPopupMustBeDismissibleError';
  public readonly code = BANNER_POPUP_MUST_BE_DISMISSIBLE_CODE;
  public constructor(public readonly bannerId: string | null) {
    super(
      `a popup must always be dismissible (no member may be trapped by an undismissable surface); ` +
        `set dismissible=true or use display_mode='banner'`,
    );
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { banner_id: this.bannerId },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for missing bilingual copy at publish (HTTP 422). */
export const BANNER_BILINGUAL_REQUIRED_CODE = 'banner.bilingual_required';

/**
 * Thrown at PUBLISH when any of the four copy fields (`title`/`body`/`title_hi`/`body_hi`) is
 * absent or blank — FR-58B/FR-68 require Hindi AND English variants on member-facing copy (AC6).
 * Unlike 10.5's scope-conditional rule, ALL FOUR are required here for EVERY audience scope: a
 * banner is member-facing chrome with no "internal" variant. A draft may be incomplete; publishing
 * one may not. The route maps this → HTTP 422.
 */
export class BannerBilingualRequiredError extends Error {
  public readonly name = 'BannerBilingualRequiredError';
  public readonly code = BANNER_BILINGUAL_REQUIRED_CODE;
  public constructor(
    public readonly bannerId: string,
    public readonly missingFields: readonly string[],
  ) {
    super(
      `banner '${bannerId}' requires Hindi + English copy before publishing; ` +
        `missing: ${missingFields.join(', ')}`,
    );
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { banner_id: this.bannerId, missing: this.missingFields },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for an empty/inverted visibility window (HTTP 422). */
export const BANNER_WINDOW_INVALID_CODE = 'banner.window_invalid';

/**
 * Thrown when a write would produce `valid_until <= valid_from` (AC1/AC2). The domain half of the
 * `banners_window_non_empty` DB CHECK. A zero/negative window is a banner that can never be visible
 * — authoring nonsense rather than a legitimate state, so it is rejected up front with a message the
 * admin editor can render, instead of surfacing as a raw constraint violation. → HTTP 422.
 */
export class BannerWindowInvalidError extends Error {
  public readonly name = 'BannerWindowInvalidError';
  public readonly code = BANNER_WINDOW_INVALID_CODE;
  public constructor(
    public readonly bannerId: string | null,
    public readonly validFrom: string,
    public readonly validUntil: string,
  ) {
    super(`valid_until (${validUntil}) must be strictly after valid_from (${validFrom})`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { banner_id: this.bannerId, valid_from: this.validFrom, valid_until: this.validUntil },
        request_id: requestId,
      },
    };
  }
}
