// Survey/Poll transport DTOs — Story 10.15 (Task 5; AC3/AC5/AC6/AC7).
//
// Pure Zod, `.strict()` throughout, snake_case wire. ⛔ NO `@twt/domain` import (the RN Metro bundle
// boundary). ⚠ Watch the camelCase-domain / snake_case-wire drift — this project's most repeated bug
// class ([[feedback_story_validate_footguns]]): `valid_from`/`validFrom`, `body_hi`/`bodyHi`,
// `response_threshold`/`responseThreshold`.
//
// ⭐ ONE PLACE WHERE THERE IS NO DRIFT TO WATCH: the `questions` and `answers` structures. Their
// inner keys are snake_case on BOTH sides (the domain's `surveys/types.ts` declares them that way on
// purpose), so they cross the boundary unmapped and byte-for-byte. A round-trip sync-guard test pins
// that, because the moment someone "tidies" the domain types to camelCase the JSONB column and the
// wire silently disagree.
//
// ── Two audiences, two shapes ────────────────────────────────────────────────────────────────
// `SurveyResponse` is the ADMIN console shape: the full authoring row plus the derived display state.
// `MemberSurveyResponse` is the member-app shape and deliberately carries NO actor ids, NO
// tone-signoff fields, NO `audience_scope_value`, NO `status` and NO `response_threshold` — a member
// answering a survey has no business knowing who authored it, who reviewed it, which cohort it was
// aimed at, or what count somebody hoped to reach. (That last omission is LBD-1 in DTO form: showing
// a member a threshold invites them to read the survey as a vote that passes or fails.)
//
// ── ⛔ THE AGGREGATE + FREE-TEXT SHAPES CANNOT CARRY A MEMBER ID (LBD-3) ──────────────────────
// Not "do not populate one" — there is no field. `.strict()` means an extra key is a parse failure,
// so a server that tried to add one could not.

import { z } from 'zod';

import { Iso8601Datetime, UuidString } from '../_common/primitives.js';
import {
  MAX_FREE_TEXT_ANSWER,
  MAX_OPTIONS_PER_QUESTION,
  MAX_OPTION_TEXT,
  MAX_QUESTIONS_PER_SURVEY,
  MAX_QUESTION_TEXT,
  SurveyAudienceScope,
  SurveyDisplayState,
  SurveyQuestionType,
  SurveyStatus,
} from './enums.js';

/** Copy length bounds — a survey's chrome, sized like a banner's rather than an article's. */
const Title = z.string().min(1).max(200);
const Body = z.string().min(1).max(2_000);
const AudienceScopeValue = z.string().min(1).max(120);

/** The scopes that need a discriminator value. ⚠ `public` is NOT here — it is rejected outright. */
const AUDIENCE_SCOPES_REQUIRING_VALUE: readonly SurveyAudienceScope[] = ['state', 'role', 'cohort'];

/**
 * Ties `audience_scope_value` to `audience_scope`: required for the scopes that discriminate, and
 * forbidden for `public`/`members-all` (a stray value there is a copy-paste leftover from a scope
 * change or a client bug). Only checked when `audience_scope` is present in THIS request.
 *
 * ⚠ This does NOT reject `public` / `role` / `cohort` as unusable scopes — that rejection is the
 * DOMAIN's (`assertAudienceAuthorable`, a typed 422 that explains why). Duplicating it here would put
 * the reason in two places and let them drift; the wire's job is shape, the domain's is meaning.
 */
function checkAudienceScopeValue(
  val: { audience_scope?: SurveyAudienceScope; audience_scope_value?: string | null },
  ctx: z.RefinementCtx,
): void {
  if (val.audience_scope === undefined) return;
  const requiresValue = AUDIENCE_SCOPES_REQUIRING_VALUE.includes(val.audience_scope);
  if (requiresValue && !val.audience_scope_value) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['audience_scope_value'],
      message: `audience_scope_value is required when audience_scope is '${val.audience_scope}'`,
    });
  }
  if (!requiresValue && val.audience_scope_value != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['audience_scope_value'],
      message: `audience_scope_value must be omitted when audience_scope is '${val.audience_scope}'`,
    });
  }
}

// ── The questionnaire (LBD-4) ──────────────────────────────────────────────────

/**
 * One selectable option. `option_id` is CLIENT-SUPPLIED and stable — ⛔ never a positional index: a
 * stored answer references the option it selected, and a positional reference would re-point the
 * moment a draft reorders.
 */
export const SurveyQuestionOption = z
  .object({
    option_id: UuidString,
    option_text: z.string().min(1).max(MAX_OPTION_TEXT),
    option_text_hi: z.string().min(1).max(MAX_OPTION_TEXT),
  })
  .strict();
export type SurveyQuestionOption = z.output<typeof SurveyQuestionOption>;

/**
 * One authored question. `.strict()` is load-bearing here: it is what refuses the forbidden
 * constructs (a `branch_to`, a `weight`, a `required` flag, an `allows_other`) at the edge rather than
 * letting them ride along in JSONB where no reviewer would see them again.
 *
 * The type-conditional rules (`free_text` must not carry options; a choice question needs at least 2)
 * are enforced by the DOMAIN's `validateQuestionnaire`, which produces a typed 422 naming the
 * violated bound. Expressing them here as a refinement chain would produce exactly the generic parse
 * error AC3 forbids.
 */
export const SurveyQuestion = z
  .object({
    question_id: UuidString,
    question_text: z.string().min(1).max(MAX_QUESTION_TEXT),
    question_text_hi: z.string().min(1).max(MAX_QUESTION_TEXT),
    type: SurveyQuestionType,
    options: z.array(SurveyQuestionOption).max(MAX_OPTIONS_PER_QUESTION).optional(),
  })
  .strict();
export type SurveyQuestion = z.output<typeof SurveyQuestion>;

export const SurveyQuestionnaire = z.array(SurveyQuestion).max(MAX_QUESTIONS_PER_SURVEY);

/**
 * One member's answer to one question. Exactly one payload field applies, selected by the QUESTION'S
 * type — the domain's `validateAnswers` decides which and 422s naming the `question_id`.
 *
 * ⚠ `answer_text` is member-authored free text: PII tier 3 at best (LBD-3). Capped here and never
 * echoed into an error.
 */
export const SurveyAnswer = z
  .object({
    question_id: UuidString,
    selected_option_ids: z.array(UuidString).optional(),
    answer_text: z.string().min(1).max(MAX_FREE_TEXT_ANSWER).optional(),
  })
  .strict();
export type SurveyAnswer = z.output<typeof SurveyAnswer>;

// ── Requests ───────────────────────────────────────────────────────────────────

/**
 * Create a survey draft (POST …/surveys). The author is the session actor (never client-supplied).
 * Copy and questions are OPTIONAL — a draft is authored incrementally; all four copy fields and at
 * least one question become mandatory at publish (AC3/AC4). The window is mandatory from the start:
 * it is what the DB CHECK constrains, and a row without it could not exist.
 */
export const CreateSurveyRequest = z
  .object({
    title: Title.nullish(),
    body: Body.nullish(),
    title_hi: Title.nullish(),
    body_hi: Body.nullish(),
    questions: SurveyQuestionnaire.optional(),
    audience_scope: SurveyAudienceScope,
    audience_scope_value: AudienceScopeValue.nullish(),
    valid_from: Iso8601Datetime,
    valid_until: Iso8601Datetime,
    /** FR-58's "optional quorum threshold", RENAMED (LBD-1). ⚠ INFORMATIONAL — it gates nothing. */
    response_threshold: z.number().int().min(1).nullish(),
  })
  .strict()
  .superRefine(checkAudienceScopeValue);
export type CreateSurveyRequest = z.output<typeof CreateSurveyRequest>;

/**
 * Edit a survey (PATCH …/surveys/{surveyId}).
 *
 * ⚠ On a PUBLISHED survey the ONLY field that may move is `valid_until`, and only UPWARDS (LBD-5 +
 * AC4). Everything else is a typed 409 naming the frozen field. That rule is enforced SERVER-side
 * rather than by splitting this into two request shapes, because the freeze depends on the row's
 * current status — which this payload does not know and must not be trusted to assert.
 */
export const UpdateSurveyRequest = z
  .object({
    title: Title.nullish(),
    body: Body.nullish(),
    title_hi: Title.nullish(),
    body_hi: Body.nullish(),
    questions: SurveyQuestionnaire.optional(),
    audience_scope: SurveyAudienceScope.optional(),
    audience_scope_value: AudienceScopeValue.nullish(),
    valid_from: Iso8601Datetime.optional(),
    valid_until: Iso8601Datetime.optional(),
    response_threshold: z.number().int().min(1).nullish(),
  })
  .strict()
  .superRefine(checkAudienceScopeValue);
export type UpdateSurveyRequest = z.output<typeof UpdateSurveyRequest>;

/** Publish (POST …/surveys/{surveyId}/publish). The publisher is the session actor; no body fields. */
export const PublishSurveyRequest = z.object({}).strict();
export type PublishSurveyRequest = z.output<typeof PublishSurveyRequest>;

/** Close (POST …/surveys/{surveyId}/close). Terminal — there is no reopen. No body fields. */
export const CloseSurveyRequest = z.object({}).strict();
export type CloseSurveyRequest = z.output<typeof CloseSurveyRequest>;

/**
 * Submit a member's response (POST …/member/surveys/{surveyId}/responses).
 *
 * ⚠ ONE per member, FINAL (LBD-6). A second submission is a typed 409; a replay carrying the same
 * `Idempotency-Key` header returns the original 201. The member id comes from the session — ⛔ never
 * from this body.
 */
export const SubmitSurveyResponseRequest = z
  .object({ answers: z.array(SurveyAnswer).min(1).max(MAX_QUESTIONS_PER_SURVEY) })
  .strict();
export type SubmitSurveyResponseRequest = z.output<typeof SubmitSurveyResponseRequest>;

// ── Responses ────────────────────────────────────────────────────────────────────

/** The full ADMIN survey DTO (the authoring console read). */
export const SurveyResponse = z
  .object({
    survey_id: UuidString,
    pariwar_id: UuidString,
    title: Title.nullable(),
    body: Body.nullable(),
    title_hi: Title.nullable(),
    body_hi: Body.nullable(),
    questions: SurveyQuestionnaire,
    audience_scope: SurveyAudienceScope,
    audience_scope_value: AudienceScopeValue.nullable(),
    valid_from: Iso8601Datetime,
    valid_until: Iso8601Datetime,
    response_threshold: z.number().int().positive().nullable(),
    status: SurveyStatus,
    /**
     * The DERIVED display state at the moment the server answered (AC2). Computed, never stored — a
     * client that caches this DTO across a window boundary sees a stale value, which is correct and
     * expected: the authority is the server's `now`, not the client's.
     */
    display_state: SurveyDisplayState,
    created_by_actor_id: UuidString,
    tone_signoff_content_hash: z.string().nullable(),
    tone_signoff_reviewed_at: Iso8601Datetime.nullable(),
    tone_signoff_reviewed_by: UuidString.nullable(),
    published_at: Iso8601Datetime.nullable(),
    closed_at: Iso8601Datetime.nullable(),
    created_at: Iso8601Datetime,
    updated_at: Iso8601Datetime,
  })
  .strict();
export type SurveyResponse = z.output<typeof SurveyResponse>;

/** The paginated admin list response. `next_offset` is null when the page is the last. */
export const SurveyListResponse = z
  .object({
    items: z.array(SurveyResponse),
    next_offset: z.number().int().nonnegative().nullable(),
  })
  .strict();
export type SurveyListResponse = z.output<typeof SurveyListResponse>;

/**
 * The MEMBER-facing survey DTO. Bilingual copy + the questionnaire + the closing instant, and
 * nothing else.
 *
 * ⛔ Deliberately absent: actor ids, tone-signoff fields, `audience_scope`/`audience_scope_value`,
 * `status`, and `response_threshold`. The last is LBD-1 in DTO form — showing a member a target count
 * invites them to read the survey as a vote that passes or fails, which is precisely what a survey is
 * not. `answered` tells the member whether THEY have responded; it says nothing about anyone else.
 */
export const MemberSurveyResponse = z
  .object({
    survey_id: UuidString,
    title: Title.nullable(),
    body: Body.nullable(),
    title_hi: Title.nullable(),
    body_hi: Body.nullable(),
    questions: SurveyQuestionnaire,
    valid_until: Iso8601Datetime,
    answered: z.boolean(),
  })
  .strict();
export type MemberSurveyResponse = z.output<typeof MemberSurveyResponse>;

/**
 * THE member surface read (AC6): the member's open, in-audience surveys, each with its own flag.
 * `next_offset` is null when the page is the last (code review of 10-15-survey-poll, 2026-08-17:
 * this was previously unpaginated, mirroring the admin list's `{items, next_offset}` shape now).
 */
export const MemberSurveyListResponse = z
  .object({
    items: z.array(MemberSurveyResponse),
    next_offset: z.number().int().nonnegative().nullable(),
  })
  .strict();
export type MemberSurveyListResponse = z.output<typeof MemberSurveyListResponse>;

/** The submit acknowledgement. Echoes no answer content — the member's client already has it. */
export const SubmitSurveyResponseResult = z
  .object({ survey_id: UuidString, submitted_at: Iso8601Datetime })
  .strict();
export type SubmitSurveyResponseResult = z.output<typeof SubmitSurveyResponseResult>;

// ── The aggregate (AC7, LBD-3) ────────────────────────────────────────────────

/** Per-option selection count. ⛔ A count, never a list of who. */
export const SurveyOptionCount = z
  .object({ option_id: UuidString, count: z.number().int().nonnegative() })
  .strict();
export type SurveyOptionCount = z.output<typeof SurveyOptionCount>;

/**
 * Per-question aggregate. Every declared option appears even at `count: 0` — a reader must be able to
 * tell "nobody chose this" apart from "this option does not exist".
 */
export const SurveyQuestionAggregate = z
  .object({
    question_id: UuidString,
    type: SurveyQuestionType,
    option_counts: z.array(SurveyOptionCount),
    answered_count: z.number().int().nonnegative(),
  })
  .strict();
export type SurveyQuestionAggregate = z.output<typeof SurveyQuestionAggregate>;

/**
 * The whole-survey aggregate.
 *
 * ⛔ NO FIELD HERE COULD CARRY A MEMBER IDENTIFIER, and `.strict()` means one cannot be added at
 * runtime either. That is the LBD-3 shield in its final form.
 *
 * ⚠ `threshold_met` is TRI-STATE and INFORMATIONAL (LBD-1). `null` means no threshold was authored
 * and must not render as "not met"; and even when set, it gates nothing — no status, no read, no job,
 * no decision. A survey INFORMS a decision and never MAKES one.
 */
export const SurveyAggregateResponse = z
  .object({
    survey_id: UuidString,
    response_count: z.number().int().nonnegative(),
    response_threshold: z.number().int().positive().nullable(),
    threshold_met: z.boolean().nullable(),
    questions: z.array(SurveyQuestionAggregate),
  })
  .strict();
export type SurveyAggregateResponse = z.output<typeof SurveyAggregateResponse>;

/**
 * One UNATTRIBUTED free-text answer (AC7, LBD-3).
 *
 * ⛔ Two fields, and every absence is deliberate: no member id, no row id, no `question_id` echo, and
 * no ordinal — a stable per-respondent ordinal would let two reads of two different questions be
 * aligned row-for-row, reconstructing one member's whole submission. `.strict()` is what makes the
 * absences enforceable rather than aspirational.
 */
export const SurveyFreeTextAnswer = z
  .object({ answer_text: z.string().max(MAX_FREE_TEXT_ANSWER), submitted_at: Iso8601Datetime })
  .strict();
export type SurveyFreeTextAnswer = z.output<typeof SurveyFreeTextAnswer>;

/** The paginated free-text read. Reading it writes a `survey.responses_viewed` audit line — carrying
 *  the survey id and a COUNT, ⛔ never the answer content. */
export const SurveyFreeTextListResponse = z
  .object({
    items: z.array(SurveyFreeTextAnswer),
    next_offset: z.number().int().nonnegative().nullable(),
  })
  .strict();
export type SurveyFreeTextListResponse = z.output<typeof SurveyFreeTextListResponse>;
