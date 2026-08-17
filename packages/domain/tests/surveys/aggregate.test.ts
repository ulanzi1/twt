// aggregateResponses + surveyContentHash + the pure write guards — Story 10.15 (AC4, AC5, AC7).
// Pure, DB-free.
//
// The AC7 cases named explicitly: zero responses, a member who skipped a question, an option with
// zero votes still present at 0, and `threshold_met` null / false / true.

import { describe, expect, it } from 'vitest';

import {
  SurveyAudienceUnsupportedError,
  SurveyAudienceValueRequiredError,
  SurveyBilingualRequiredError,
  SurveyWindowInvalidError,
} from '../../src/surveys/errors.js';
import { aggregateResponses } from '../../src/surveys/aggregate.js';
import { missingSurveyCopyFields, surveyContentHash, surveyResourceLocator } from '../../src/surveys/content-hash.js';
import type { SurveyQuestion } from '../../src/surveys/types.js';
import {
  assertAudienceAuthorable,
  assertSurveyCopyComplete,
  assertWindowValid,
} from '../../src/surveys/write.js';

const QUESTIONS: SurveyQuestion[] = [
  {
    question_id: 'q1',
    question_text: 'Which day?',
    question_text_hi: 'कौन सा दिन?',
    type: 'single_choice',
    options: [
      { option_id: 'sat', option_text: 'Saturday', option_text_hi: 'शनिवार' },
      { option_id: 'sun', option_text: 'Sunday', option_text_hi: 'रविवार' },
      { option_id: 'mon', option_text: 'Monday', option_text_hi: 'सोमवार' },
    ],
  },
  { question_id: 'q2', question_text: 'Anything else?', question_text_hi: 'और कुछ?', type: 'free_text' },
];

describe('aggregateResponses', () => {
  it('handles zero responses — every option present at 0, counts at 0', () => {
    const agg = aggregateResponses(QUESTIONS, []);
    expect(agg.response_count).toBe(0);
    expect(agg.questions[0]?.option_counts).toEqual([
      { option_id: 'sat', count: 0 },
      { option_id: 'sun', count: 0 },
      { option_id: 'mon', count: 0 },
    ]);
    expect(agg.questions[0]?.answered_count).toBe(0);
  });

  it('counts selections per option', () => {
    const agg = aggregateResponses(QUESTIONS, [
      { answers: [{ question_id: 'q1', selected_option_ids: ['sat'] }] },
      { answers: [{ question_id: 'q1', selected_option_ids: ['sat'] }] },
      { answers: [{ question_id: 'q1', selected_option_ids: ['sun'] }] },
    ]);
    expect(agg.response_count).toBe(3);
    expect(agg.questions[0]?.option_counts).toEqual([
      { option_id: 'sat', count: 2 },
      { option_id: 'sun', count: 1 },
      // ⭐ A reader must be able to tell "nobody chose this" apart from "this option does not exist".
      { option_id: 'mon', count: 0 },
    ]);
  });

  it('handles a member who SKIPPED a question — answered_count trails response_count', () => {
    const agg = aggregateResponses(QUESTIONS, [
      { answers: [{ question_id: 'q1', selected_option_ids: ['sat'] }, { question_id: 'q2', answer_text: 'yes' }] },
      { answers: [{ question_id: 'q1', selected_option_ids: ['sun'] }] },
    ]);
    expect(agg.response_count).toBe(2);
    expect(agg.questions[0]?.answered_count).toBe(2);
    expect(agg.questions[1]?.answered_count).toBe(1);
  });

  it('counts each selected option on a multi_choice', () => {
    const multi: SurveyQuestion[] = [{ ...QUESTIONS[0]!, type: 'multi_choice' }];
    const agg = aggregateResponses(multi, [{ answers: [{ question_id: 'q1', selected_option_ids: ['sat', 'mon'] }] }]);
    expect(agg.questions[0]?.option_counts).toEqual([
      { option_id: 'sat', count: 1 },
      { option_id: 'sun', count: 0 },
      { option_id: 'mon', count: 1 },
    ]);
  });

  // This function reads HISTORY, and history can hold rows written before a validator existed.
  // Throwing would make one bad legacy row take down the whole results screen.
  it('skips an unknown question_id or option_id rather than throwing', () => {
    const agg = aggregateResponses(QUESTIONS, [
      { answers: [{ question_id: 'gone', selected_option_ids: ['x'] }, { question_id: 'q1', selected_option_ids: ['deleted'] }] },
    ]);
    expect(agg.response_count).toBe(1);
    expect(agg.questions[0]?.answered_count).toBe(1);
    expect(agg.questions[0]?.option_counts.every((c) => c.count === 0)).toBe(true);
  });

  it('emits option_counts in the QUESTION\'s option order, not count order', () => {
    const agg = aggregateResponses(QUESTIONS, [
      { answers: [{ question_id: 'q1', selected_option_ids: ['mon'] }] },
      { answers: [{ question_id: 'q1', selected_option_ids: ['mon'] }] },
    ]);
    expect(agg.questions[0]?.option_counts.map((c) => c.option_id)).toEqual(['sat', 'sun', 'mon']);
  });

  describe('threshold_met (LBD-1 — INFORMATIONAL; it gates nothing)', () => {
    // ⚠ TRI-STATE. `null` must NOT collapse to `false`: rendering "threshold not met" for a survey
    // whose author never set one reports a failure that was never a goal.
    it('is null when no threshold was authored', () => {
      const agg = aggregateResponses(QUESTIONS, [{ answers: [] }], null);
      expect(agg.threshold_met).toBeNull();
      expect(agg.response_threshold).toBeNull();
    });

    it('is false below the threshold', () => {
      const agg = aggregateResponses(QUESTIONS, [{ answers: [] }, { answers: [] }], 3);
      expect(agg.threshold_met).toBe(false);
    });

    it('is true at exactly the threshold (>=, not >)', () => {
      const agg = aggregateResponses(QUESTIONS, [{ answers: [] }, { answers: [] }, { answers: [] }], 3);
      expect(agg.threshold_met).toBe(true);
    });
  });

  // ⛔ LBD-3: the shield is the PROJECTION. Asserted on the returned SHAPE, not by inspection.
  it('returns a shape with NO member identifier anywhere in it', () => {
    const agg = aggregateResponses(QUESTIONS, [{ answers: [{ question_id: 'q1', selected_option_ids: ['sat'] }] }]);
    const serialized = JSON.stringify(agg);
    expect(serialized).not.toContain('member');
    expect(Object.keys(agg).sort()).toEqual(['questions', 'response_count', 'response_threshold', 'threshold_met']);
    for (const q of agg.questions) {
      expect(Object.keys(q).sort()).toEqual(['answered_count', 'option_counts', 'question_id', 'type']);
    }
  });
});

describe('surveyContentHash', () => {
  const copy = { title: 'T', body: 'B', titleHi: 'ट', bodyHi: 'ब' };

  it('is stable regardless of key order (canonical JSON)', () => {
    const a = surveyContentHash(copy, QUESTIONS);
    const b = surveyContentHash({ bodyHi: 'ब', titleHi: 'ट', body: 'B', title: 'T' }, QUESTIONS);
    expect(a).toBe(b);
  });

  // ⭐ THE QUESTIONNAIRE IS IN THE HASH — a tone reviewer reviews the QUESTIONS as much as the title
  // ("do you support the trustees' decision?" is a leading question). A hash over copy alone would let
  // the questions change between review and publish while the sign-off still verified.
  it('CHANGES when a question changes, not only when the copy changes', () => {
    const base = surveyContentHash(copy, QUESTIONS);
    const edited: SurveyQuestion[] = [{ ...QUESTIONS[0]!, question_text: 'Which day, really?' }, QUESTIONS[1]!];
    expect(surveyContentHash(copy, edited)).not.toBe(base);
    expect(surveyContentHash({ ...copy, title: 'T2' }, QUESTIONS)).not.toBe(base);
  });

  it('binds the sign-off to survey:<id>', () => {
    expect(surveyResourceLocator('abc')).toBe('survey:abc');
  });

  it('reports every missing copy field by its WIRE name', () => {
    expect(missingSurveyCopyFields({ title: null, body: '  ', titleHi: 'ट', bodyHi: null })).toEqual([
      'title',
      'body',
      'body_hi',
    ]);
  });
});

describe('the pure write guards', () => {
  it('rejects a zero or inverted window', () => {
    const t = new Date('2026-09-01T00:00:00.000Z');
    expect(() => assertWindowValid(null, t, t)).toThrow(SurveyWindowInvalidError);
    expect(() => assertWindowValid(null, t, new Date(t.getTime() - 1))).toThrow(SurveyWindowInvalidError);
    expect(() => assertWindowValid(null, t, new Date(t.getTime() + 1))).not.toThrow();
  });

  it('requires all four copy fields at publish (FR-68)', () => {
    expect(() => assertSurveyCopyComplete('s1', { title: 'T', body: 'B', titleHi: null, bodyHi: 'ब' })).toThrow(
      SurveyBilingualRequiredError,
    );
    expect(() => assertSurveyCopyComplete('s1', { title: 'T', body: 'B', titleHi: 'ट', bodyHi: 'ब' })).not.toThrow();
  });

  describe('assertAudienceAuthorable (AC5)', () => {
    // ⭐ The write-path half of the LBD-7 inversion. A scope that can be AUTHORED but never RESOLVE is
    // a trap: the admin publishes, the fan-out reaches nobody, and no error is raised anywhere.
    it('REJECTS public at the write path — asserted, because 10.9 permits it', () => {
      expect(() => assertAudienceAuthorable('public', null)).toThrow(SurveyAudienceUnsupportedError);
    });

    it('rejects role and cohort', () => {
      expect(() => assertAudienceAuthorable('role', 'trustee')).toThrow(SurveyAudienceUnsupportedError);
      expect(() => assertAudienceAuthorable('cohort', 'x')).toThrow(SurveyAudienceUnsupportedError);
    });

    it('accepts members-all, and state WITH a value', () => {
      expect(() => assertAudienceAuthorable('members-all', null)).not.toThrow();
      expect(() => assertAudienceAuthorable('state', 'Bihar')).not.toThrow();
    });

    it('rejects state without a value', () => {
      expect(() => assertAudienceAuthorable('state', null)).toThrow(SurveyAudienceValueRequiredError);
      expect(() => assertAudienceAuthorable('state', '  ')).toThrow(SurveyAudienceValueRequiredError);
    });
  });
});
