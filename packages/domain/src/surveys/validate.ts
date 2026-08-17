// Pure questionnaire + answer validators — Story 10.15 (Task 3; AC3, AC6).
//
// DB-free, side-effect-free, exhaustively unit-tested. Every rejection is a DISTINCT typed error
// carrying a closed-vocabulary `violation`, the offending `question_id` where one exists, and the
// BOUND that was violated where one applies (AC3: "a typed 422 NAMING THE VIOLATED BOUND, never a
// generic parse error"). A tenant author and a member on a phone are the two audiences, and neither
// can act on "invalid payload".
//
// ── Why this is hand-written rather than a Zod schema ────────────────────────────────────────
// `@twt/contracts` already parses the wire shape with Zod `.strict()`, which is what rejects unknown
// keys and wrong primitive types before anything reaches here. What Zod cannot express legibly is the
// CROSS-FIELD vocabulary: "a free_text question must not carry options", "a choice question needs at
// least two", "an answer's payload field is selected by its question's type, not by which field is
// present". Expressing those as a refinement chain produces exactly the generic error AC3 forbids —
// so the structural parse lives in contracts and the SEMANTIC rules live here, each saying what it is
// good at saying.
//
// ⛔ NEVER an expression language (LBD-4, the 10.12 custom-fields doctrine). Nothing in this file
// evaluates anything: it walks a bounded structure and compares against constants.

import { SURVEY_QUESTION_TYPES } from '../schema/surveys.js';
import {
  SurveyAnswerInvalidError,
  SurveyQuestionnaireInvalidError,
} from './errors.js';
import {
  MAX_FREE_TEXT_ANSWER,
  MAX_OPTIONS_PER_QUESTION,
  MAX_OPTION_TEXT,
  MAX_QUESTIONS_PER_SURVEY,
  MAX_QUESTION_TEXT,
  MIN_OPTIONS_PER_CHOICE_QUESTION,
} from './limits.js';
import type { SurveyAnswer, SurveyQuestion } from './types.js';

const QUESTION_TYPES: ReadonlySet<string> = new Set(SURVEY_QUESTION_TYPES);

/** A text field is "present" only if it is a non-blank string — a whitespace-only label is absent. */
function isBlank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

/**
 * Validate a tenant-authored questionnaire (AC3). Called on EVERY create/update and AGAIN at publish
 * — the second call is not redundant: a draft may be edited by a path that skipped validation in a
 * future refactor, and publish is the irreversible step (LBD-5 freezes the questionnaire).
 *
 * `forPublish` adds exactly ONE rule: a survey with ZERO questions cannot be published. A
 * zero-question DRAFT is a legitimate work-in-progress — that is what a draft is — while a
 * zero-question PUBLISHED survey would collect nothing and mean nothing.
 *
 * Throws `SurveyQuestionnaireInvalidError` on the FIRST violation found, in document order. First-fail
 * rather than collect-all is deliberate: the admin editor highlights one question at a time, and a
 * list of twenty errors on a malformed paste is less actionable than the first one.
 */
export function validateQuestionnaire(questions: readonly SurveyQuestion[], forPublish = false): void {
  if (forPublish && questions.length === 0) {
    throw new SurveyQuestionnaireInvalidError(
      'no_questions_to_publish',
      'a survey must have at least one question before it can be published',
    );
  }
  if (questions.length > MAX_QUESTIONS_PER_SURVEY) {
    throw new SurveyQuestionnaireInvalidError(
      'too_many_questions',
      `a survey may have at most ${MAX_QUESTIONS_PER_SURVEY} questions (got ${questions.length})`,
      null,
      MAX_QUESTIONS_PER_SURVEY,
    );
  }

  const seenQuestionIds = new Set<string>();
  for (const question of questions) {
    const qid = question.question_id;

    if (seenQuestionIds.has(qid)) {
      throw new SurveyQuestionnaireInvalidError(
        'duplicate_question_id',
        `question_id '${qid}' appears more than once; ids must be unique within a survey`,
        qid,
      );
    }
    seenQuestionIds.add(qid);

    // ⭐ An UNKNOWN type is REJECTED, never ignored (AC3). Silently dropping an unrecognised question
    // would publish a survey missing a question its author believed they had asked.
    if (!QUESTION_TYPES.has(question.type)) {
      throw new SurveyQuestionnaireInvalidError(
        'unknown_question_type',
        `question '${qid}' has unknown type '${String(question.type)}'; permitted types are ${SURVEY_QUESTION_TYPES.join(', ')}`,
        qid,
      );
    }

    // FR-68 bilingual, at the QUESTION level (the survey's own chrome copy is checked separately by
    // `assertSurveyCopyComplete`, so a missing `title_hi` names the survey and a missing
    // `question_text_hi` names the question).
    if (isBlank(question.question_text) || isBlank(question.question_text_hi)) {
      throw new SurveyQuestionnaireInvalidError(
        'question_text_missing',
        `question '${qid}' requires both question_text and question_text_hi`,
        qid,
      );
    }
    if (question.question_text.length > MAX_QUESTION_TEXT || question.question_text_hi.length > MAX_QUESTION_TEXT) {
      throw new SurveyQuestionnaireInvalidError(
        'question_text_too_long',
        `question '${qid}' text exceeds ${MAX_QUESTION_TEXT} characters`,
        qid,
        MAX_QUESTION_TEXT,
      );
    }

    if (question.type === 'free_text') {
      // ⛔ Options on a free_text question are a 422, NOT a tolerated extra key: they mean the author
      // believed they were configuring something the renderer will silently ignore. (An "other
      // (please specify)" hybrid is forbidden by LBD-4 — this is where that forbidding bites.)
      if (question.options !== undefined) {
        throw new SurveyQuestionnaireInvalidError(
          'free_text_must_not_have_options',
          `question '${qid}' is free_text and must not carry options`,
          qid,
        );
      }
      continue;
    }

    // Both choice types from here down.
    const options = question.options;
    if (options === undefined) {
      throw new SurveyQuestionnaireInvalidError(
        'choice_must_have_options',
        `question '${qid}' is a choice question and requires options`,
        qid,
      );
    }
    if (options.length < MIN_OPTIONS_PER_CHOICE_QUESTION) {
      // A separate violation from `too_many_options` on purpose: the two failures mean opposite
      // things to the author, and a choice question with fewer than two options cannot collect a
      // preference — it collects assent to the only thing on offer.
      throw new SurveyQuestionnaireInvalidError(
        'too_few_options',
        `question '${qid}' needs at least ${MIN_OPTIONS_PER_CHOICE_QUESTION} options (got ${options.length})`,
        qid,
        MIN_OPTIONS_PER_CHOICE_QUESTION,
      );
    }
    if (options.length > MAX_OPTIONS_PER_QUESTION) {
      throw new SurveyQuestionnaireInvalidError(
        'too_many_options',
        `question '${qid}' may have at most ${MAX_OPTIONS_PER_QUESTION} options (got ${options.length})`,
        qid,
        MAX_OPTIONS_PER_QUESTION,
      );
    }

    const seenOptionIds = new Set<string>();
    for (const option of options) {
      if (seenOptionIds.has(option.option_id)) {
        throw new SurveyQuestionnaireInvalidError(
          'duplicate_option_id',
          `question '${qid}' has a duplicate option_id '${option.option_id}'`,
          qid,
        );
      }
      seenOptionIds.add(option.option_id);

      if (isBlank(option.option_text) || isBlank(option.option_text_hi)) {
        throw new SurveyQuestionnaireInvalidError(
          'option_text_missing',
          `option '${option.option_id}' on question '${qid}' requires both option_text and option_text_hi`,
          qid,
        );
      }
      if (option.option_text.length > MAX_OPTION_TEXT || option.option_text_hi.length > MAX_OPTION_TEXT) {
        throw new SurveyQuestionnaireInvalidError(
          'option_text_too_long',
          `option '${option.option_id}' on question '${qid}' exceeds ${MAX_OPTION_TEXT} characters`,
          qid,
          MAX_OPTION_TEXT,
        );
      }
    }
  }
}

/**
 * Validate one member's answer set against the survey's questions (AC6). Throws
 * `SurveyAnswerInvalidError` naming the offending `question_id`.
 *
 * ── ⚠ WHAT "MISSING ANSWER" MEANS HERE ────────────────────────────────────────────────────────
 * AC6 lists "a missing answer for a question" as a rejection. It is enforced as: the answer set must
 * cover EVERY question the survey asks. There is no `required` flag in the v1 vocabulary
 * (`types.ts`), so "optional per question" is not expressible — the honest reading of the AC is that
 * a submission answers the whole questionnaire.
 * ⚠ `aggregateResponses` STILL handles a question with no answer, and that is not dead code: rows
 * predating a validator change, and the `answered_count` column existing at all, both depend on the
 * aggregate not assuming full coverage. A validator is a gate on new writes, never a proof about
 * stored data ([[feedback_gate_scope_semantic_coverage]]).
 *
 * ⛔ NEVER echoes `answer_text` into an error message or its details — a free-text failure reports
 * the LENGTH and the BOUND (LBD-3: free text is PII tier 3, and an error response is a log line).
 */
export function validateAnswers(questions: readonly SurveyQuestion[], answers: readonly SurveyAnswer[]): void {
  const byId = new Map(questions.map((q) => [q.question_id, q]));
  const answered = new Set<string>();

  for (const answer of answers) {
    const qid = answer.question_id;
    const question = byId.get(qid);
    if (question === undefined) {
      throw new SurveyAnswerInvalidError(
        'unknown_question_id',
        `this survey has no question '${qid}'`,
        qid,
      );
    }
    if (answered.has(qid)) {
      throw new SurveyAnswerInvalidError(
        'duplicate_answer',
        `question '${qid}' was answered more than once in this submission`,
        qid,
      );
    }
    answered.add(qid);

    if (question.type === 'free_text') {
      // ⭐ The payload field is selected by the QUESTION'S TYPE, not by which field happens to be
      // present. An answer that supplies the wrong one is a 422 rather than a silent coercion —
      // otherwise a client bug becomes a stored answer to a question the member did not answer.
      if (answer.selected_option_ids !== undefined) {
        throw new SurveyAnswerInvalidError(
          'options_on_free_text_question',
          `question '${qid}' is free_text; selected_option_ids is not a valid answer for it`,
          qid,
        );
      }
      if (isBlank(answer.answer_text)) {
        throw new SurveyAnswerInvalidError('free_text_missing', `question '${qid}' requires answer_text`, qid);
      }
      // Length only — ⛔ never the content.
      if ((answer.answer_text as string).length > MAX_FREE_TEXT_ANSWER) {
        throw new SurveyAnswerInvalidError(
          'free_text_too_long',
          `the answer to question '${qid}' exceeds ${MAX_FREE_TEXT_ANSWER} characters`,
          qid,
          MAX_FREE_TEXT_ANSWER,
        );
      }
      continue;
    }

    const selected = answer.selected_option_ids;
    if (selected === undefined || selected.length === 0) {
      throw new SurveyAnswerInvalidError(
        'no_options_selected',
        `question '${qid}' requires at least one selected option`,
        qid,
      );
    }
    if (question.type === 'single_choice' && selected.length > 1) {
      throw new SurveyAnswerInvalidError(
        'multiple_options_on_single_choice',
        `question '${qid}' accepts exactly one option (got ${selected.length})`,
        qid,
        1,
      );
    }
    const validOptionIds = new Set((question.options ?? []).map((o) => o.option_id));
    for (const optionId of selected) {
      if (!validOptionIds.has(optionId)) {
        throw new SurveyAnswerInvalidError(
          'unknown_option_id',
          `question '${qid}' has no option '${optionId}'`,
          qid,
        );
      }
    }
    // A repeated option id on a multi_choice would inflate that option's count by one member twice,
    // so it is caught here rather than de-duplicated silently — de-duplication would hide a client bug
    // behind a correct-looking aggregate.
    if (new Set(selected).size !== selected.length) {
      throw new SurveyAnswerInvalidError(
        'duplicate_answer',
        `question '${qid}' selects the same option more than once`,
        qid,
      );
    }
  }

  for (const question of questions) {
    if (!answered.has(question.question_id)) {
      throw new SurveyAnswerInvalidError(
        'missing_answer',
        `question '${question.question_id}' was not answered`,
        question.question_id,
      );
    }
  }
}
