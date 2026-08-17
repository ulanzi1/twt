// validateQuestionnaire + validateAnswers — Story 10.15 (AC3, AC6). Pure, DB-free.
//
// Every rejection asserts the CLOSED-VOCABULARY `violation`, not just "it threw". AC3 requires a
// typed 422 NAMING the violated bound; a test that only checks `toThrow()` would pass against a
// generic error, which is the exact failure the AC forbids.

import { describe, expect, it } from 'vitest';

import {
  SurveyAnswerInvalidError,
  SurveyQuestionnaireInvalidError,
} from '../../src/surveys/errors.js';
import {
  MAX_FREE_TEXT_ANSWER,
  MAX_OPTIONS_PER_QUESTION,
  MAX_OPTION_TEXT,
  MAX_QUESTIONS_PER_SURVEY,
  MAX_QUESTION_TEXT,
} from '../../src/surveys/limits.js';
import type { SurveyAnswer, SurveyQuestion } from '../../src/surveys/types.js';
import { validateAnswers, validateQuestionnaire } from '../../src/surveys/validate.js';

function choice(id: string, optionIds: string[] = ['o1', 'o2'], type: 'single_choice' | 'multi_choice' = 'single_choice'): SurveyQuestion {
  return {
    question_id: id,
    question_text: `Q ${id}`,
    question_text_hi: `प्रश्न ${id}`,
    type,
    options: optionIds.map((o) => ({ option_id: o, option_text: `Opt ${o}`, option_text_hi: `विकल्प ${o}` })),
  };
}

function freeText(id: string): SurveyQuestion {
  return { question_id: id, question_text: `Q ${id}`, question_text_hi: `प्रश्न ${id}`, type: 'free_text' };
}

/** Assert the thrown error's closed-vocabulary violation, not merely that something threw. */
function expectViolation(fn: () => void, violation: string, questionId?: string): void {
  try {
    fn();
    throw new Error(`expected a violation '${violation}' but nothing was thrown`);
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
    const e = err as SurveyQuestionnaireInvalidError | SurveyAnswerInvalidError;
    expect(e.violation).toBe(violation);
    if (questionId !== undefined) expect(e.questionId).toBe(questionId);
  }
}

describe('validateQuestionnaire', () => {
  it('accepts the three permitted types', () => {
    expect(() =>
      validateQuestionnaire([choice('q1'), choice('q2', ['a', 'b', 'c'], 'multi_choice'), freeText('q3')]),
    ).not.toThrow();
  });

  it('accepts an EMPTY questionnaire on a draft — that is what a draft is', () => {
    expect(() => validateQuestionnaire([])).not.toThrow();
  });

  it('rejects an empty questionnaire at PUBLISH', () => {
    expectViolation(() => validateQuestionnaire([], true), 'no_questions_to_publish');
  });

  it('rejects more than MAX_QUESTIONS_PER_SURVEY, naming the bound', () => {
    const many = Array.from({ length: MAX_QUESTIONS_PER_SURVEY + 1 }, (_, i) => freeText(`q${i}`));
    try {
      validateQuestionnaire(many);
      throw new Error('expected a throw');
    } catch (err) {
      const e = err as SurveyQuestionnaireInvalidError;
      expect(e.violation).toBe('too_many_questions');
      expect(e.bound).toBe(MAX_QUESTIONS_PER_SURVEY);
    }
  });

  it('rejects a duplicate question_id', () => {
    expectViolation(() => validateQuestionnaire([freeText('q1'), freeText('q1')]), 'duplicate_question_id', 'q1');
  });

  // ⭐ AC3: an unknown type is REJECTED, never ignored. Silently dropping it would publish a survey
  // missing a question its author believed they had asked.
  it('REJECTS an unknown question type rather than ignoring it', () => {
    const rogue = { ...freeText('q1'), type: 'ranking' } as unknown as SurveyQuestion;
    expectViolation(() => validateQuestionnaire([rogue]), 'unknown_question_type', 'q1');
  });

  it('rejects a question missing either language', () => {
    expectViolation(
      () => validateQuestionnaire([{ ...freeText('q1'), question_text_hi: '' }]),
      'question_text_missing',
      'q1',
    );
    expectViolation(
      () => validateQuestionnaire([{ ...freeText('q1'), question_text: '   ' }]),
      'question_text_missing',
      'q1',
    );
  });

  it('rejects question text over the cap in EITHER language', () => {
    const long = 'x'.repeat(MAX_QUESTION_TEXT + 1);
    expectViolation(() => validateQuestionnaire([{ ...freeText('q1'), question_text: long }]), 'question_text_too_long', 'q1');
    expectViolation(
      () => validateQuestionnaire([{ ...freeText('q1'), question_text_hi: long }]),
      'question_text_too_long',
      'q1',
    );
  });

  // ⛔ The LBD-4 "no 'other (please specify)' hybrid" forbidding, where it actually bites.
  it('rejects a free_text question carrying options', () => {
    const hybrid = { ...freeText('q1'), options: [{ option_id: 'o1', option_text: 'Other', option_text_hi: 'अन्य' }] };
    expectViolation(() => validateQuestionnaire([hybrid]), 'free_text_must_not_have_options', 'q1');
  });

  it('rejects a choice question with no options at all', () => {
    const bare = { ...choice('q1'), options: undefined };
    expectViolation(() => validateQuestionnaire([bare]), 'choice_must_have_options', 'q1');
  });

  it('rejects a choice question with fewer than 2 options — distinct from the max violation', () => {
    expectViolation(() => validateQuestionnaire([choice('q1', ['only'])]), 'too_few_options', 'q1');
    expectViolation(() => validateQuestionnaire([choice('q1', [])]), 'too_few_options', 'q1');
  });

  it('rejects more than MAX_OPTIONS_PER_QUESTION', () => {
    const ids = Array.from({ length: MAX_OPTIONS_PER_QUESTION + 1 }, (_, i) => `o${i}`);
    expectViolation(() => validateQuestionnaire([choice('q1', ids)]), 'too_many_options', 'q1');
  });

  it('rejects a duplicate option_id within a question', () => {
    expectViolation(() => validateQuestionnaire([choice('q1', ['a', 'a'])]), 'duplicate_option_id', 'q1');
  });

  it('rejects an option missing either language, and one over the cap', () => {
    const q = choice('q1');
    q.options![0]!.option_text_hi = '';
    expectViolation(() => validateQuestionnaire([q]), 'option_text_missing', 'q1');

    const q2 = choice('q2');
    q2.options![1]!.option_text = 'x'.repeat(MAX_OPTION_TEXT + 1);
    expectViolation(() => validateQuestionnaire([q2]), 'option_text_too_long', 'q2');
  });
});

describe('validateAnswers', () => {
  const questions = [choice('q1'), choice('q2', ['a', 'b', 'c'], 'multi_choice'), freeText('q3')];

  function fullAnswers(): SurveyAnswer[] {
    return [
      { question_id: 'q1', selected_option_ids: ['o1'] },
      { question_id: 'q2', selected_option_ids: ['a', 'c'] },
      { question_id: 'q3', answer_text: 'a considered opinion' },
    ];
  }

  it('accepts a complete, well-formed answer set', () => {
    expect(() => validateAnswers(questions, fullAnswers())).not.toThrow();
  });

  it('rejects an unknown question_id', () => {
    const answers = [...fullAnswers(), { question_id: 'ghost', answer_text: 'hi' }];
    expectViolation(() => validateAnswers(questions, answers), 'unknown_question_id', 'ghost');
  });

  it('rejects a missing answer for a question the survey asks', () => {
    const answers = fullAnswers().slice(0, 2);
    expectViolation(() => validateAnswers(questions, answers), 'missing_answer', 'q3');
  });

  it('rejects the same question answered twice in one submission', () => {
    const answers = [...fullAnswers(), { question_id: 'q1', selected_option_ids: ['o2'] }];
    expectViolation(() => validateAnswers(questions, answers), 'duplicate_answer', 'q1');
  });

  it('rejects an unknown option_id', () => {
    const answers = fullAnswers();
    answers[0] = { question_id: 'q1', selected_option_ids: ['nope'] };
    expectViolation(() => validateAnswers(questions, answers), 'unknown_option_id', 'q1');
  });

  it('rejects more than one option on a single_choice', () => {
    const answers = fullAnswers();
    answers[0] = { question_id: 'q1', selected_option_ids: ['o1', 'o2'] };
    expectViolation(() => validateAnswers(questions, answers), 'multiple_options_on_single_choice', 'q1');
  });

  it('rejects zero options on any choice answer', () => {
    const answers = fullAnswers();
    answers[1] = { question_id: 'q2', selected_option_ids: [] };
    expectViolation(() => validateAnswers(questions, answers), 'no_options_selected', 'q2');
  });

  // A repeated option would inflate one member's contribution to that count twice. Rejected rather
  // than de-duplicated — de-duplication hides a client bug behind a correct-looking aggregate.
  it('rejects the same option selected twice on a multi_choice', () => {
    const answers = fullAnswers();
    answers[1] = { question_id: 'q2', selected_option_ids: ['a', 'a'] };
    expectViolation(() => validateAnswers(questions, answers), 'duplicate_answer', 'q2');
  });

  it('rejects options supplied for a free_text question', () => {
    const answers = fullAnswers();
    answers[2] = { question_id: 'q3', selected_option_ids: ['x'] };
    expectViolation(() => validateAnswers(questions, answers), 'options_on_free_text_question', 'q3');
  });

  it('rejects blank free text', () => {
    const answers = fullAnswers();
    answers[2] = { question_id: 'q3', answer_text: '   ' };
    expectViolation(() => validateAnswers(questions, answers), 'free_text_missing', 'q3');
  });

  it('rejects free text over the cap', () => {
    const answers = fullAnswers();
    answers[2] = { question_id: 'q3', answer_text: 'x'.repeat(MAX_FREE_TEXT_ANSWER + 1) };
    expectViolation(() => validateAnswers(questions, answers), 'free_text_too_long', 'q3');
  });

  // ⛔ LBD-3: free text is PII tier 3. An error response is a log line and a client breadcrumb.
  it('NEVER echoes the answer text into the error message or its details', () => {
    const secret = 'my private grievance '.repeat(60);
    const answers = fullAnswers();
    answers[2] = { question_id: 'q3', answer_text: secret };
    try {
      validateAnswers(questions, answers);
      throw new Error('expected a throw');
    } catch (err) {
      const e = err as SurveyAnswerInvalidError;
      expect(e.message).not.toContain('grievance');
      expect(JSON.stringify(e.toErrorResponse('req-1'))).not.toContain('grievance');
      expect(e.bound).toBe(MAX_FREE_TEXT_ANSWER);
    }
  });
});
