// Member-moderation typed domain errors — Story 10.10 (AC2, AC3, AC4).
//
// @twt/domain owns these typed errors; the HTTP mapping lands in the apps/api error-mapping
// middleware (the banners / news-blog / helpdesk precedent). Surfaced at the @twt/domain top level
// (../../index.ts) so the middleware imports the class + code constant from `@twt/domain` directly.
//
// ⚠ EVERY error declared here MUST be wired into `apps/api/src/middleware/error-mapping/index.ts`.
// An UNMAPPED domain error becomes a 500 — that was the Story 10.8 Pass-3 finding, and Story 10.9
// called it out explicitly. It is not being repeated here.

import type { ErrorResponseShape } from '../../errors.js';

/** Namespaced error code for an illegal moderation transition (HTTP 409). */
export const MODERATION_INVALID_STATE_CODE = 'member_moderation.invalid_state';

/**
 * Thrown when the requested action is illegal from the member's CURRENT moderation status —
 * `nextModerationStatus` returned `null`. Raised BEFORE any write (AC2), so a no-op never returns
 * 200. Covers `none --terminate-->` (Decision 2), a re-suspend of an already-suspended member, a
 * restore of an unmoderated member, and every other non-arm.
 */
export class ModerationStateError extends Error {
  public readonly name = 'ModerationStateError';
  public readonly code = MODERATION_INVALID_STATE_CODE;
  public constructor(
    public readonly memberId: string,
    public readonly currentStatus: string,
    public readonly action: string,
  ) {
    super(
      `member '${memberId}' is '${currentStatus}': '${action}' is not a legal moderation transition`,
    );
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { current_status: this.currentStatus, action: this.action },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for a reason code that cannot justify the requested action (HTTP 422). */
export const MODERATION_REASON_CODE_INVALID_CODE = 'member_moderation.reason_code_invalid';

/**
 * Thrown when the reason code is not in the registry, or its `appliesTo` does not include the
 * requested action (AC3) — e.g. a restore code offered to justify a termination.
 */
export class ModerationReasonCodeInvalidError extends Error {
  public readonly name = 'ModerationReasonCodeInvalidError';
  public readonly code = MODERATION_REASON_CODE_INVALID_CODE;
  public constructor(
    public readonly reasonCode: string,
    public readonly action: string,
  ) {
    super(`reason code '${reasonCode}' cannot justify a '${action}' action`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { reason_code: this.reasonCode, action: this.action },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for a missing / whitespace-only rationale (HTTP 422). */
export const MODERATION_RATIONALE_REQUIRED_CODE = 'member_moderation.rationale_required';

/**
 * Thrown when the free-text rationale is absent, empty or whitespace-only. The rationale is
 * REQUIRED on EVERY action (AC3) — not only on an "other" code. This is deliberately STRICTER than
 * the UX `<ReasonCodeDropdown>` `other-text-required` state (`ux-design-specification.md:2067`):
 * a structured code alone can never explain a suspension to the member who receives it.
 */
export class ModerationRationaleRequiredError extends Error {
  public readonly name = 'ModerationRationaleRequiredError';
  public readonly code = MODERATION_RATIONALE_REQUIRED_CODE;
  public constructor(public readonly action: string) {
    super(`a free-text rationale is required for every moderation action ('${action}')`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { action: this.action },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for an actor with no resolvable display name (HTTP 422). */
export const MODERATION_ACTOR_DISPLAY_MISSING_CODE = 'member_moderation.actor_display_missing';

/**
 * Thrown when the acting admin has no `users.display_name` to snapshot into
 * `member_moderation_actions.actor_display`. The action is BLOCKED — there is NO email-derived
 * fallback ([[project_admin_display_name_attribution]], Story 6.11 R5): an unattributable
 * suspension is worse than a refused one, and the member is entitled to know who acted.
 */
export class ModerationActorDisplayMissingError extends Error {
  public readonly name = 'ModerationActorDisplayMissingError';
  public readonly code = MODERATION_ACTOR_DISPLAY_MISSING_CODE;
  public constructor(public readonly actorId: string) {
    super(
      `actor '${actorId}' has no display name on record — a moderation action cannot be attributed`,
    );
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { actor_id: this.actorId },
        request_id: requestId,
      },
    };
  }
}
