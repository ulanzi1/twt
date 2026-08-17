// Pure response aggregation — Story 10.15 (Task 3; AC7, Load-Bearing Decisions 1 + 3).
//
// ── ⛔ THIS IS THE PII SHIELD, AND IT IS A PROJECTION, NOT A FILTER (LBD-3) ───────────────────
// `survey_responses` stores `member_id` in its PRIMARY KEY — it must, or "one response per member"
// is unenforceable and a poll is ballot-stuffable. The anonymity lives HERE, at the read boundary:
// this function takes rows that carry member ids and returns a shape that has NOWHERE TO PUT ONE.
// That is stronger than remembering not to select the column — the output type is structurally
// incapable of carrying an identifier, so a future edit cannot leak one without changing `types.ts`
// and failing the AC7 shape test.
//
// ⚠ This is the MIRROR IMAGE of the 8.5 convention, and the contrast is the point. There
// ([[project_anonymous_diagnostic_log_convention]]) "anonymous" logs stayed member-ATTRIBUTED and the
// anonymity lived in the ACTION NAME. Here the storage is attributed and the anonymity lives in the
// PROJECTION. Same discipline — NAME WHAT IS ACTUALLY ANONYMOUS — opposite mechanism. ⛔ Do not copy
// 8.5's shape across; copy its honesty.
//
// ── ⚠ `threshold_met` IS INFORMATIONAL. IT GATES NOTHING (LBD-1) ─────────────────────────────
// This boolean is the ONLY consumer of `response_threshold` anywhere in the story. It changes no
// status, blocks no read, triggers no job and authorises nothing. FR-58 calls the field a "quorum
// threshold"; that word is not used here because in this project `quorum` is a Deed term binding the
// TRUSTEE quorum (trust-deed.md:227, Cl. 19), members hold no governance vote, and a survey that
// reached a "quorum" and thereby decided something would be a member vote the Deed does not create.
// ⚠ The first request for a survey result that gates, binds or self-executes anything is a Trustee
// Panel routing note and a Deed question — not a change to this function.

import type { SurveyAggregate, SurveyAnswer, SurveyQuestion, SurveyQuestionAggregate } from './types.js';

/**
 * One stored response, reduced to what the aggregate may see.
 *
 * ⛔ Note what this input type does NOT have: a `member_id`. The caller (`getSurveyAggregate`) does
 * not select the column, and this signature is what makes that not merely a convention — passing a
 * row with a member id in would be a type error at the call site.
 */
export interface SurveyResponseAnswers {
  answers: readonly SurveyAnswer[];
}

/**
 * PURE: fold a survey's responses into per-question option counts (AC7).
 *
 * ⭐ EVERY declared option appears in the output, INCLUDING at `count: 0`. A reader must be able to
 * tell "nobody chose this" apart from "this option does not exist" — an aggregate that omits
 * zero-vote options silently rewrites the question that was asked.
 *
 * `answered_count` is per question and may be less than `response_count`: a stored row need not cover
 * every question (see the note in `validateAnswers` — a validator gates new writes, it is not a proof
 * about stored data).
 *
 * An unknown `question_id` in a stored answer, or an unknown `option_id`, is SKIPPED rather than
 * thrown on. This function reads history, and history can contain rows written before a validator
 * existed; throwing would make one bad legacy row take down the whole results screen. The validator
 * is where bad input is refused — at the WRITE.
 */
export function aggregateResponses(
  questions: readonly SurveyQuestion[],
  responses: readonly SurveyResponseAnswers[],
  responseThreshold: number | null = null,
): SurveyAggregate {
  const counters = new Map<string, { question: SurveyQuestion; counts: Map<string, number>; answered: number }>();
  for (const question of questions) {
    const counts = new Map<string, number>();
    // Seed every declared option at zero — see the doc block above.
    for (const option of question.options ?? []) counts.set(option.option_id, 0);
    counters.set(question.question_id, { question, counts, answered: 0 });
  }

  for (const response of responses) {
    for (const answer of response.answers) {
      const entry = counters.get(answer.question_id);
      if (entry === undefined) continue; // a question that no longer exists — see the doc block.
      entry.answered += 1;
      for (const optionId of answer.selected_option_ids ?? []) {
        const current = entry.counts.get(optionId);
        if (current === undefined) continue; // an option that no longer exists — likewise.
        entry.counts.set(optionId, current + 1);
      }
    }
  }

  const questionAggregates: SurveyQuestionAggregate[] = questions.map((question) => {
    const entry = counters.get(question.question_id)!;
    return {
      question_id: question.question_id,
      type: question.type,
      // Emitted in the question's OWN option order, not insertion or count order: the results screen
      // must read in the same order the member saw, or an admin comparing the two is comparing
      // different things.
      option_counts: (question.options ?? []).map((option) => ({
        option_id: option.option_id,
        count: entry.counts.get(option.option_id) ?? 0,
      })),
      answered_count: entry.answered,
    };
  });

  const responseCount = responses.length;

  return {
    response_count: responseCount,
    response_threshold: responseThreshold,
    // ⚠ TRI-STATE, deliberately. `null` means "no threshold was authored" and must NOT collapse to
    // `false`: rendering "threshold not met" for a survey whose author never set one would report a
    // failure that was never a goal — and under LBD-1 it is not a failure of anything even when a
    // threshold WAS set, since the threshold gates nothing.
    threshold_met: responseThreshold === null ? null : responseCount >= responseThreshold,
    questions: questionAggregates,
  };
}
