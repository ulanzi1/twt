// Survey/Poll wire enums + limit mirrors — Story 10.15 (Task 5; AC3/AC5).
//
// The status, audience-scope and question-type tuples, the derived display states, the targetable
// scope list, and the five questionnaire caps. ALL RE-DECLARED here (⛔ NOT imported from
// @twt/domain) for the RN Metro bundle boundary ([[project_contracts_domain_bundle_boundary]] — a
// domain import leaks `pg` into the mobile bundle). `packages/domain/src/schema/surveys.ts` and
// `packages/domain/src/surveys/limits.ts` own the source tuples and constants, and a TEST-ONLY
// sync-guard (tests/surveys.test.ts) imports both sides and asserts they never drift.
//
// ⚠ A SURVEY IS ADVISORY AND HAS NO GOVERNANCE EFFECT (LBD-1). The word `quorum` appears nowhere in
// this module: FR-58's "optional quorum threshold" ships as `response_threshold`, gating nothing.

import { z } from 'zod';

/** The STORED lifecycle status (a PLAIN mutable column — LBD-2). Three values, not five. */
export const SURVEY_STATUSES = ['draft', 'published', 'closed'] as const;
export const SurveyStatus = z.enum(SURVEY_STATUSES);
export type SurveyStatus = z.output<typeof SurveyStatus>;

/**
 * The DERIVED display state (AC2) — a derivation over `status` + the window at a given `now`, NEVER a
 * stored column. Carried on the admin DTO so the console renders and filters on the same five states
 * the domain derives, without re-implementing the boundary conventions client-side.
 */
export const SURVEY_DISPLAY_STATES = ['draft', 'scheduled', 'open', 'expired', 'closed'] as const;
export const SurveyDisplayState = z.enum(SURVEY_DISPLAY_STATES);
export type SurveyDisplayState = z.output<typeof SurveyDisplayState>;

/**
 * The audience-scope tuple. Shares its VALUES with `banner_audience_scope` / `news_audience_scope`
 * but is a separate DB type (independently-evolving tables must not share one `CREATE TYPE`).
 *
 * ── ⚠ `public` RESOLVES **FALSE** HERE — THE OPPOSITE OF THE BANNER PREDICATE (LBD-7) ─────────
 * A public BANNER widens who else may see it. A survey has NO unauthenticated surface and responding
 * requires a member session by definition, so `public` is rejected at the domain WRITE path with a
 * typed 422 and denies at read time. It stays in the tuple only so the vocabulary reads beside its
 * siblings — see `SURVEY_TARGETABLE_AUDIENCE_SCOPES` below, which deliberately omits it.
 *
 * `role`/`cohort` are a DIFFERENT disposition again: there is NO member `role` or `cohort` attribute
 * at any layer and no story owns one (Decision `2026-08-13-103`, D8).
 */
export const SURVEY_AUDIENCE_SCOPES = ['public', 'members-all', 'state', 'role', 'cohort'] as const;
export const SurveyAudienceScope = z.enum(SURVEY_AUDIENCE_SCOPES);
export type SurveyAudienceScope = z.output<typeof SurveyAudienceScope>;

/**
 * The audience scopes that resolve to a real survey audience today — the browser mirror of
 * `@twt/domain`'s `SURVEY_TARGETABLE_AUDIENCE_SCOPES`, read by the admin console's "not yet
 * targetable" indicator.
 *
 * ⚠ Pinned to the domain list by an ORDER-SENSITIVE `toEqual` sync-guard: both must change in the
 * SAME POSITION or the guard fails on ordering.
 * ⚠ ⭐ NOTE THE ABSENCE OF `'public'` — `BANNER_TARGETABLE_AUDIENCE_SCOPES` contains it and this must
 * not. That is the LBD-7 inversion surfacing in the console.
 */
export const SURVEY_TARGETABLE_AUDIENCE_SCOPES: readonly SurveyAudienceScope[] = ['members-all', 'state'];

/**
 * The BOUNDED question vocabulary (LBD-4). EXACTLY THREE TYPES.
 *
 * ⛔ FORBIDDEN in v1 and forbidden as "just a small addition": branching / skip logic, conditional
 * visibility, scoring, weights, ranking, matrix/grid, file upload, "other (please specify)" hybrids,
 * computed questions. A fourth type is a code change and a review — that is the feature, not the
 * limitation. ⛔ NEVER an expression language (the 10.12 custom-fields doctrine).
 */
export const SURVEY_QUESTION_TYPES = ['single_choice', 'multi_choice', 'free_text'] as const;
export const SurveyQuestionType = z.enum(SURVEY_QUESTION_TYPES);
export type SurveyQuestionType = z.output<typeof SurveyQuestionType>;

// ── The questionnaire caps (LBD-4) — mirrors of `@twt/domain`'s `surveys/limits.ts` ────────────
// Re-declared, not imported (the bundle boundary), and pinned by the same sync-guard. The DTOs below
// enforce them structurally so a malformed payload is refused at the edge, while the domain's own
// validator is what produces the TYPED 422 NAMING the violated bound (AC3) — Zod refusal is the
// coarse floor, the domain error is the actionable one.

export const MAX_QUESTIONS_PER_SURVEY = 20;
export const MAX_OPTIONS_PER_QUESTION = 10;
export const MIN_OPTIONS_PER_CHOICE_QUESTION = 2;
export const MAX_QUESTION_TEXT = 300;
export const MAX_OPTION_TEXT = 120;
export const MAX_FREE_TEXT_ANSWER = 1000;
