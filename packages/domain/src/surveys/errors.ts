// Survey typed domain errors — Story 10.15 (Task 2; AC1–AC6).
//
// @twt/domain owns these typed errors; the HTTP mapping lands in the apps/api error-mapping
// middleware (the news-blog / banners / helpdesk precedent). Surfaced at the @twt/domain top level
// (../index.ts) so the middleware imports the class + code constant from `@twt/domain` directly.
//
// ⚠ EVERY error declared here MUST be wired into `apps/api/src/middleware/error-mapping/index.ts`.
// An UNMAPPED domain error becomes a 500 — that was the Story 10.8 Pass-3 finding, and it is not
// being repeated here.
//
// The tone-review DENY path reuses the shipped `ToneReviewRequiredError` (409) — it is NOT
// re-declared here, so the gate's structured denial reaches the client unchanged.
//
// ── Why the validation errors carry a `question_id` and a named bound ─────────────────────────
// AC3 requires "a typed 422 NAMING THE VIOLATED BOUND, never a generic parse error", and AC6 the
// same for answers, "naming the offending `question_id`". A tenant author and a member on a phone
// are the two audiences; neither can act on `invalid payload`. Every 422 below therefore carries
// enough structure for an editor to point at the offending row.

import type { ErrorResponseShape } from '../errors.js';

/** Namespaced error code for an absent survey (HTTP 404 at transport). */
export const SURVEY_NOT_FOUND_CODE = 'survey.not_found';

/**
 * Thrown when a `survey_id` does not resolve in the active Pariwar. → HTTP 404.
 *
 * ⚠ Also the MEMBER-path answer for a survey that exists but is not visible to this member (another
 * tenant's, an unpublished draft) — 404, never 403 (AC6). A 403 would confirm the row exists.
 */
export class SurveyNotFoundError extends Error {
  public readonly name = 'SurveyNotFoundError';
  public readonly code = SURVEY_NOT_FOUND_CODE;
  public constructor(
    public readonly pariwarId: string,
    public readonly surveyId: string,
  ) {
    super(`no survey '${surveyId}' exists for this Pariwar`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { survey_id: this.surveyId },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for an illegal survey state transition / edit (HTTP 409). */
export const SURVEY_INVALID_STATE_CODE = 'survey.invalid_state';

/**
 * Thrown when a survey action is illegal for its current status — an illegal lifecycle transition
 * (`nextSurveyStatus` returned null: `publish` a closed survey, re-`publish` a published one, any
 * reopen) OR an edit on a terminal (`closed`) survey. → HTTP 409 (a conflict with current resource
 * state — the 10.4/10.5/10.9 reducer-guard discipline).
 */
export class SurveyStateError extends Error {
  public readonly name = 'SurveyStateError';
  public readonly code = SURVEY_INVALID_STATE_CODE;
  public constructor(
    public readonly surveyId: string,
    public readonly currentStatus: string,
    public readonly detail: string,
  ) {
    super(`survey '${surveyId}' (status=${currentStatus}): ${detail}`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { survey_id: this.surveyId, current_status: this.currentStatus },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for a mutation of a post-publish frozen field (HTTP 409). */
export const SURVEY_FROZEN_FIELD_CODE = 'survey.frozen_field';

/**
 * Thrown when an update touches a field frozen by publish (LBD-5): `questions`,
 * `response_threshold`, `audience_scope` or `audience_scope_value`. → HTTP 409, NAMING the field.
 *
 * ⭐ WHY THIS IS A 409 AND NOT A 422: the payload is not malformed — the same payload would have been
 * perfectly valid one transition earlier. The conflict is with the resource's CURRENT STATE, which is
 * exactly what 409 means. (`SurveyWindowInvalidError` below is the 422 sibling for a payload that is
 * wrong at any status.)
 *
 * The reason the freeze exists, stated because a future reader will be tempted to relax it: a
 * response is an answer TO A QUESTION. Change the question and every stored answer silently becomes
 * an answer to something nobody asked — the exact re-interpretation failure
 * [[feedback_supersede_never_reinterpret]] exists to prevent. To change the questions: close the
 * survey and publish a new one.
 */
export class SurveyFrozenFieldError extends Error {
  public readonly name = 'SurveyFrozenFieldError';
  public readonly code = SURVEY_FROZEN_FIELD_CODE;
  public constructor(
    public readonly surveyId: string,
    public readonly frozenFields: readonly string[],
  ) {
    super(
      `survey '${surveyId}' is published; ${frozenFields.join(', ')} cannot be changed. ` +
        `To ask a different question, close this survey and publish a new one.`,
    );
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { survey_id: this.surveyId, frozen_fields: this.frozenFields },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for an empty/inverted response window (HTTP 422). */
export const SURVEY_WINDOW_INVALID_CODE = 'survey.window_invalid';

/**
 * Thrown when a write would produce `valid_until <= valid_from` (AC1/AC2), OR when a published
 * survey's `valid_until` would be SHORTENED (AC4).
 *
 * The domain half of the `surveys_window_non_empty` DB CHECK. A zero/negative window is a survey
 * that can never be answered — authoring nonsense rather than a legitimate state.
 *
 * ⭐ The shortening case is here rather than in `SurveyFrozenFieldError` on purpose: `valid_until` is
 * NOT frozen (extending it is the one permitted post-publish mutation), so the rejection is about the
 * DIRECTION of the change, not the field's mutability. Shortening a live window is a `close`, and
 * `close` is the transition that exists for it — the message says so, because an admin who tried to
 * shorten a window wants the survey to stop, and there is a correct way to do that.
 */
export class SurveyWindowInvalidError extends Error {
  public readonly name = 'SurveyWindowInvalidError';
  public readonly code = SURVEY_WINDOW_INVALID_CODE;
  public constructor(
    public readonly surveyId: string | null,
    public readonly validFrom: string,
    public readonly validUntil: string,
    public readonly detail = 'valid_until must be strictly after valid_from',
  ) {
    super(`${detail} (valid_from=${validFrom}, valid_until=${validUntil})`);
  }

  /** The AC4 shortening case, phrased so the admin console can render the remedy. */
  public static shortening(surveyId: string, currentValidUntil: string, requestedValidUntil: string): SurveyWindowInvalidError {
    return new SurveyWindowInvalidError(
      surveyId,
      currentValidUntil,
      requestedValidUntil,
      `a published survey's valid_until may only be EXTENDED, never shortened; to stop collecting now, close the survey`,
    );
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { survey_id: this.surveyId, valid_from: this.validFrom, valid_until: this.validUntil },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for missing bilingual copy at publish (HTTP 422). */
export const SURVEY_BILINGUAL_REQUIRED_CODE = 'survey.bilingual_required';

/**
 * Thrown at PUBLISH when any of the four copy fields (`title`/`body`/`title_hi`/`body_hi`) is absent
 * or blank — FR-68 requires Hindi AND English variants on member-facing copy (AC4). A draft may be
 * incomplete; publishing one may not. → HTTP 422.
 *
 * ⚠ This covers the survey's own CHROME copy only. The bilingual requirement on QUESTION and OPTION
 * text is enforced by `validateQuestionnaire` (`SurveyQuestionnaireInvalidError`), because a missing
 * `question_text_hi` must name the offending question rather than the survey.
 */
export class SurveyBilingualRequiredError extends Error {
  public readonly name = 'SurveyBilingualRequiredError';
  public readonly code = SURVEY_BILINGUAL_REQUIRED_CODE;
  public constructor(
    public readonly surveyId: string,
    public readonly missingFields: readonly string[],
  ) {
    super(`survey '${surveyId}' requires Hindi + English copy before publishing; missing: ${missingFields.join(', ')}`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { survey_id: this.surveyId, missing: this.missingFields },
        request_id: requestId,
      },
    };
  }
}

/**
 * The closed vocabulary of questionnaire-validation failures (AC3). Each names a DISTINCT authoring
 * mistake, so an admin editor can point at the offending question rather than reprinting a schema.
 * ⛔ Do not add a catch-all member: a generic reason is what AC3 forbids.
 */
export const SURVEY_QUESTIONNAIRE_VIOLATIONS = [
  'too_many_questions',
  'duplicate_question_id',
  'unknown_question_type',
  'question_text_missing',
  'question_text_too_long',
  'free_text_must_not_have_options',
  'choice_must_have_options',
  'too_few_options',
  'too_many_options',
  'duplicate_option_id',
  'option_text_missing',
  'option_text_too_long',
  'no_questions_to_publish',
] as const;
export type SurveyQuestionnaireViolation = (typeof SURVEY_QUESTIONNAIRE_VIOLATIONS)[number];

/** Namespaced error code for an invalid questionnaire (HTTP 422). */
export const SURVEY_QUESTIONNAIRE_INVALID_CODE = 'survey.questionnaire_invalid';

/**
 * Thrown by `validateQuestionnaire` — on every create/update AND again at publish (AC3). Carries the
 * closed-vocabulary `violation`, the offending `question_id` where one exists, and the BOUND that was
 * violated where one applies, so the 422 names what was wrong instead of that something was.
 *
 * ⚠ `no_questions_to_publish` is the one violation that fires only at PUBLISH: a zero-question DRAFT
 * is a perfectly legitimate work-in-progress (that is what a draft is), while a zero-question
 * PUBLISHED survey is authoring nonsense that would collect nothing and mean nothing.
 */
export class SurveyQuestionnaireInvalidError extends Error {
  public readonly name = 'SurveyQuestionnaireInvalidError';
  public readonly code = SURVEY_QUESTIONNAIRE_INVALID_CODE;
  public constructor(
    public readonly violation: SurveyQuestionnaireViolation,
    public readonly detail: string,
    public readonly questionId: string | null = null,
    public readonly bound: number | null = null,
  ) {
    super(detail);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: {
          violation: this.violation,
          question_id: this.questionId,
          bound: this.bound,
        },
        request_id: requestId,
      },
    };
  }
}

/**
 * The closed vocabulary of answer-validation failures (AC6). Same discipline as the questionnaire
 * vocabulary above: a member on a phone cannot act on "invalid payload".
 */
export const SURVEY_ANSWER_VIOLATIONS = [
  'unknown_question_id',
  'duplicate_answer',
  'missing_answer',
  'unknown_option_id',
  'multiple_options_on_single_choice',
  'no_options_selected',
  'options_on_free_text_question',
  'free_text_missing',
  'free_text_too_long',
] as const;
export type SurveyAnswerViolation = (typeof SURVEY_ANSWER_VIOLATIONS)[number];

/** Namespaced error code for an invalid answer set (HTTP 422). */
export const SURVEY_ANSWER_INVALID_CODE = 'survey.answer_invalid';

/**
 * Thrown by `validateAnswers` (AC6), naming the offending `question_id`.
 *
 * ⛔ The message and the details NEVER echo `answer_text`. A validation error on a free-text answer
 * reports the LENGTH and the BOUND, never the content: an error response is a log line and a client
 * breadcrumb, and free text is PII tier 3 (LBD-3).
 */
export class SurveyAnswerInvalidError extends Error {
  public readonly name = 'SurveyAnswerInvalidError';
  public readonly code = SURVEY_ANSWER_INVALID_CODE;
  public constructor(
    public readonly violation: SurveyAnswerViolation,
    public readonly detail: string,
    public readonly questionId: string | null = null,
    public readonly bound: number | null = null,
  ) {
    super(detail);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: {
          violation: this.violation,
          question_id: this.questionId,
          bound: this.bound,
        },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for a duplicate response (HTTP 409). */
export const SURVEY_ALREADY_RESPONDED_CODE = 'survey.already_responded';

/**
 * Thrown when a member who has already answered submits again (LBD-6). → HTTP 409.
 *
 * ⭐ Raised from an INSERT's unique-violation, not from a pre-read: a check-then-insert races, and the
 * composite PK is the real invariant. ⛔ This is NOT to be "conveniently" turned into an upsert —
 * submission is final, and an editable answer makes the aggregate a moving target. A member who
 * submitted by mistake raises a helpdesk ticket (Story 10.2), a human path that already exists and
 * leaves a record.
 *
 * ⚠ Distinct from an `Idempotency-Key` REPLAY, which is not an error at all: the same key returns the
 * original 201 (AC6). This fires only for a genuine second submission.
 */
export class SurveyAlreadyRespondedError extends Error {
  public readonly name = 'SurveyAlreadyRespondedError';
  public readonly code = SURVEY_ALREADY_RESPONDED_CODE;
  public constructor(public readonly surveyId: string) {
    super(`a response to survey '${surveyId}' has already been recorded for this member`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { survey_id: this.surveyId },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for an audience scope that cannot resolve (HTTP 422). */
export const SURVEY_AUDIENCE_UNSUPPORTED_CODE = 'survey.audience_unsupported';

/**
 * Thrown at the domain WRITE path when `audience_scope` is one that can never resolve to a survey
 * audience (AC5): `public`, `role` or `cohort`.
 *
 * ⭐ `public` is the interesting one, and its rejection is DELIBERATE AND OPPOSITE to 10.9 (LBD-7).
 * `isMemberInBannerAudience` resolves `public → true` because a public banner WIDENS who else may see
 * it. A survey is not a banner: there is no unauthenticated survey surface, and RESPONDING REQUIRES A
 * MEMBER SESSION BY DEFINITION. `public` remains in the enum only so the vocabulary stays legible
 * beside its two siblings — and a scope that can be authored but can never resolve is a TRAP, which
 * is why the write path rejects it rather than letting an admin publish a survey nobody can see.
 *
 * `role`/`cohort` are rejected for a different reason: there is no member `role` or `cohort` attribute
 * at ANY layer and no story owns one (Decision `2026-08-13-103`, D8).
 */
export class SurveyAudienceUnsupportedError extends Error {
  public readonly name = 'SurveyAudienceUnsupportedError';
  public readonly code = SURVEY_AUDIENCE_UNSUPPORTED_CODE;
  public constructor(
    public readonly audienceScope: string,
    public readonly detail: string,
  ) {
    super(`audience_scope '${audienceScope}' cannot target a survey audience: ${detail}`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { audience_scope: this.audienceScope },
        request_id: requestId,
      },
    };
  }
}

/** Namespaced error code for a state-scoped survey with no scope value (HTTP 422). */
export const SURVEY_AUDIENCE_VALUE_REQUIRED_CODE = 'survey.audience_value_required';

/**
 * Thrown when `audience_scope = 'state'` is written without an `audience_scope_value` (AC5).
 *
 * The read-time predicate already fails CLOSED for this case (a state-scoped survey with no value
 * matches nobody), but failing closed at read time means a survey that publishes successfully, fans
 * out to nobody, and collects nothing — with no error anywhere. The write-path rejection is what
 * makes the mistake visible to the admin who made it.
 */
export class SurveyAudienceValueRequiredError extends Error {
  public readonly name = 'SurveyAudienceValueRequiredError';
  public readonly code = SURVEY_AUDIENCE_VALUE_REQUIRED_CODE;
  public constructor(public readonly audienceScope: string) {
    super(`audience_scope '${audienceScope}' requires an audience_scope_value`);
  }

  public toErrorResponse(requestId: string): ErrorResponseShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: { audience_scope: this.audienceScope },
        request_id: requestId,
      },
    };
  }
}
