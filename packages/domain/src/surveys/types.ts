// The survey question + answer shapes — Story 10.15 (Task 2; AC3, AC6, LBD-4).
//
// ── ⛔ A BOUNDED VOCABULARY, NEVER AN EXPRESSION LANGUAGE ─────────────────────────────────────
// The Story 10.12 `custom-fields/types.ts` doctrine applies here with FULL force, and harder,
// because the author is a TENANT rather than a platform operator:
//
//     NEVER an expression language: no JSONLogic, no eval, no mini-DSL.
//
// A questionnaire is DATA describing which of exactly three controls to render and what to put in
// them. It is not a program. The moment a question can decide whether another question is shown, the
// tenant is authoring behaviour into a JSONB column that no reviewer reads and no test covers.
//
// ⛔ FORBIDDEN in v1, and forbidden as "just a small addition":
//   · branching / skip logic, conditional visibility
//   · scoring, weights, computed questions
//   · ranking questions, matrix/grid questions
//   · file-upload answers
//   · "other (please specify)" hybrid options — a free-text escape hatch welded onto a choice
//     question is exactly the hybrid that makes `aggregateResponses` stop being a count
// A fourth question type is a CODE CHANGE AND A REVIEW. That is the feature, not the limitation.
//
// ── snake_case INNER KEYS, on purpose ────────────────────────────────────────────────────────
// Unlike every other domain type in this package (camelCase — architecture L3663-3677), the keys
// INSIDE these JSONB structures are snake_case, following the `clause_versions` / `cohort_definition`
// / `custom-fields` convention. The reason is narrow and load-bearing: these structures are written
// to JSONB and handed to `@twt/contracts` UNCHANGED, so the wire shape matches byte-for-byte with no
// mapping layer to drift. The camelCase-domain vs snake_case-contracts boundary is this project's
// most repeated bug class ([[feedback_story_validate_footguns]]) — here the boundary is deliberately
// absent, and a contracts round-trip sync-guard test is what keeps that honest.
//
// ⚠ These are STRUCTURAL types only. Every bound in `limits.ts` and every rule in AC3 is enforced by
// `validateQuestionnaire` / `validateAnswers` (validate.ts) — a value satisfying this interface is
// NOT thereby valid. TypeScript cannot express "at least 2 options" or "no options on free_text".

import type { SurveyQuestionType } from '../schema/surveys.js';

/**
 * One selectable option on a `single_choice` / `multi_choice` question.
 *
 * `option_id` is a CLIENT-SUPPLIED UUID, unique within its question. ⛔ Deliberately NOT a positional
 * index: a stored answer references the option it selected, and a positional reference would silently
 * re-point the moment a draft reorders its options — turning every stored answer into an answer to a
 * different option. (Reordering a PUBLISHED survey's options is impossible anyway under LBD-5, but a
 * draft reorders freely and the id must already be stable by then.)
 *
 * Both label fields are required (FR-68 bilingual). ⛔ There is no `is_other` / `allows_text` flag —
 * see the forbidden list in the file header.
 */
export interface SurveyQuestionOption {
  option_id: string;
  option_text: string;
  option_text_hi: string;
}

/**
 * One authored question. `type` is drawn from `SURVEY_QUESTION_TYPES` (schema/surveys.ts — the one
 * spelling authority), and `options` is present for the two choice types and ABSENT for `free_text`:
 * a `free_text` question carrying `options` is a typed 422, not a tolerated extra key, because it
 * means the author believed they were configuring something the renderer will silently ignore.
 *
 * `question_id` is a CLIENT-SUPPLIED UUID, unique within the survey — same reasoning as `option_id`
 * above, and additionally because `answers` is keyed by it: a positional index would break the moment
 * a draft reorders its questions.
 *
 * ⛔ There is no `required` flag in v1. Every question is optional to answer (a member may skip one),
 * which is why `aggregateResponses` must handle a skipped question rather than assume full coverage.
 * A required-question flag is a real feature with real UX consequences (a blocked submit, a per-field
 * error surface) and it is not in FR-58 or the epic AC — adding the FLAG without the SURFACE would
 * ship a bound nothing enforces.
 */
export interface SurveyQuestion {
  question_id: string;
  question_text: string;
  question_text_hi: string;
  type: SurveyQuestionType;
  options?: SurveyQuestionOption[];
}

/**
 * One member's answer to one question, keyed back by `question_id`.
 *
 * Exactly one of `selected_option_ids` / `answer_text` carries the payload, selected by the
 * question's `type` — NOT by which field happens to be present. `validateAnswers` resolves the
 * question first and then requires the matching field: an answer that supplies both, or supplies the
 * wrong one for its question type, is a typed 422 naming the `question_id`.
 *
 * ⚠ `answer_text` is MEMBER-AUTHORED FREE TEXT — PII tier 3 at best (LBD-3). Length-capped on the way
 * in (`MAX_FREE_TEXT_ANSWER`); on the way out it is readable ONLY through `listFreeTextAnswers`,
 * which projects `{answer_text, submitted_at}` and nothing else. ⛔ Never logged, never placed in an
 * audit payload, never exported in v1.
 */
export interface SurveyAnswer {
  question_id: string;
  selected_option_ids?: string[];
  answer_text?: string;
}

/**
 * The aggregate projection of one choice question (AC7). Counts only.
 *
 * ⛔ STRUCTURALLY INCAPABLE of carrying a member identifier — there is no field here that could hold
 * one, and that is the point (LBD-3): the shield is at the READ boundary, not at rest. Every option
 * declared on the question appears here even at `count: 0`, so a reader can tell "nobody chose this"
 * apart from "this option does not exist".
 */
export interface SurveyQuestionAggregate {
  question_id: string;
  type: SurveyQuestionType;
  /** Per-`option_id` selection counts. Empty for `free_text` questions (counted, never tallied). */
  option_counts: { option_id: string; count: number }[];
  /** How many members answered THIS question (≤ the survey's `response_count`; skips are permitted). */
  answered_count: number;
}

/**
 * The whole-survey aggregate (AC7).
 *
 * ⚠ `threshold_met` is the ONLY consumer of `response_threshold` anywhere in this story, and it is
 * INFORMATIONAL (LBD-1 — a survey is ADVISORY and has no governance effect). It gates no status,
 * blocks no read and triggers no job. `null` when no threshold was authored — deliberately tri-state
 * rather than defaulting to `false`, so "no threshold was set" never renders as "the threshold was
 * not met".
 */
export interface SurveyAggregate {
  response_count: number;
  response_threshold: number | null;
  threshold_met: boolean | null;
  questions: SurveyQuestionAggregate[];
}

/**
 * One unattributed free-text answer (AC7, LBD-3).
 *
 * ⛔ These two fields are the WHOLE shape and the absences are load-bearing: no member id, no row id,
 * and no stable per-respondent ordinal that could be joined back to a member or used to correlate one
 * respondent's answers across questions. There is deliberately no `question_id` either — the caller
 * asks for one question's answers and gets exactly those, so echoing the id back would add nothing
 * except a correlation key across a multi-question read.
 */
export interface SurveyFreeTextAnswer {
  answer_text: string;
  submitted_at: Date;
}
