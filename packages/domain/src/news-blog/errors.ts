// News/Blog typed domain errors — Story 10.5 (AC1, AC2, AC7).
//
// @twt/domain owns these typed errors; the HTTP mapping lands at the apps/api news route (the
// niyamavali/helpdesk precedent). Surfaced at the @twt/domain top level (../index.ts) so the
// apps/api error-mapping middleware imports the class + code directly. The tone-review DENY path
// reuses the shipped `ToneReviewRequiredError` (409) — it is NOT re-declared here.

import type { ErrorResponseShape } from '../errors.js';

/** Namespaced error code for an absent post (HTTP 404 at transport). */
export const NEWS_POST_NOT_FOUND_CODE = 'news.post_not_found';

/** Thrown when a `post_id` does not resolve in the active Pariwar. → HTTP 404. */
export class NewsPostNotFoundError extends Error {
  public readonly name = 'NewsPostNotFoundError';
  public readonly code = NEWS_POST_NOT_FOUND_CODE;
  public constructor(
    public readonly pariwarId: string,
    public readonly postId: string,
  ) {
    super(`no news post '${postId}' exists for this Pariwar`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { post_id: this.postId },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for an illegal post state transition / edit-locked post (HTTP 409). */
export const NEWS_POST_INVALID_STATE_CODE = 'news.post_invalid_state';

/**
 * Thrown when a post action is illegal for the post's current status — an illegal lifecycle
 * transition (`nextPostStatus` returned null, e.g. `approve` a `draft`, `publish` a `submitted`) OR
 * an edit on a non-`draft` post (draft edits are `draft`-only, AC1). The route maps this → HTTP 409
 * (a conflict with current resource state — the 10.4 `nextTicketState` guard discipline).
 */
export class NewsPostStateError extends Error {
  public readonly name = 'NewsPostStateError';
  public readonly code = NEWS_POST_INVALID_STATE_CODE;
  public constructor(
    public readonly postId: string,
    public readonly currentStatus: string,
    public readonly detail: string,
  ) {
    super(`news post '${postId}' (status=${currentStatus}): ${detail}`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { post_id: this.postId, current_status: this.currentStatus },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for an author≡reviewer / author≡approver violation (HTTP 403). */
export const NEWS_POST_AUTHOR_REVIEWER_CODE = 'news.author_is_reviewer';

/**
 * Thrown when the SAME actor would be both author and reviewer/approver of a post (AC2 — identity-
 * based fairness, enforced at the API layer, distinct from the `news.manage` RBAC gate which BOTH
 * author and reviewer hold). Raised by `submitForReview` (reviewer_id == author_actor_id) and
 * `approve` (approver == author_actor_id). The route maps this → HTTP 403.
 */
export class NewsPostAuthorReviewerError extends Error {
  public readonly name = 'NewsPostAuthorReviewerError';
  public readonly code = NEWS_POST_AUTHOR_REVIEWER_CODE;
  public constructor(
    public readonly postId: string,
    public readonly actorId: string,
    public readonly detail: string,
  ) {
    super(`news post '${postId}': ${detail} (actor ${actorId})`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { post_id: this.postId },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for scheduling a post in the past (HTTP 422). */
export const NEWS_POST_SCHEDULE_IN_PAST_CODE = 'news.schedule_in_past';

/**
 * Thrown when `schedule(post_id, at)` is called with `at` at or before the current time — "schedule"
 * implies a FUTURE fire time; a past/now timestamp would fire near-immediately via the pg-boss
 * delayed job, silently masquerading as a scheduled post when it is really an immediate publish. The
 * route maps this → HTTP 422.
 */
export class NewsPostScheduleInPastError extends Error {
  public readonly name = 'NewsPostScheduleInPastError';
  public readonly code = NEWS_POST_SCHEDULE_IN_PAST_CODE;
  public constructor(
    public readonly postId: string,
    public readonly scheduledPublishAt: string,
    public readonly now: string,
  ) {
    super(`news post '${postId}': scheduled_publish_at (${scheduledPublishAt}) must be after now (${now})`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { post_id: this.postId, scheduled_publish_at: this.scheduledPublishAt },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for missing bilingual copy on a public/members-all post (HTTP 422). */
export const NEWS_POST_BILINGUAL_REQUIRED_CODE = 'news.bilingual_required';

/**
 * Thrown at submit/approve when a `public`/`members-all` post is missing its Hindi copy
 * (`title_hi`/`body_markdown_hi`) — FR-51 "Hindi + English required for public/members-all
 * scoping" (AC7). For `state`/`role`/`cohort` the Hindi field is optional (Pariwar-locale-
 * dependent), so this never fires for those scopes. The route maps this → HTTP 422.
 */
export class NewsPostBilingualRequiredError extends Error {
  public readonly name = 'NewsPostBilingualRequiredError';
  public readonly code = NEWS_POST_BILINGUAL_REQUIRED_CODE;
  public constructor(
    public readonly postId: string,
    public readonly audienceScope: string,
    public readonly missingFields: readonly string[],
  ) {
    super(
      `news post '${postId}' (audience=${audienceScope}) requires Hindi + English copy; ` +
        `missing: ${missingFields.join(', ')}`,
    );
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { post_id: this.postId, audience_scope: this.audienceScope, missing: this.missingFields },
        request_id: requestId,
      },
    };
  }
}
