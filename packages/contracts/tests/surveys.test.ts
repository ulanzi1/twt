// Survey/Poll contracts — Story 10.15 (Task 5, AC3/AC5/AC7).
//
// FOUR jobs: (1) the test-only sync-guard binding the contract enum tuples AND the five questionnaire
// caps to the @twt/domain sources (contracts cannot import domain in SHIPPED files — the RN bundle
// boundary — so this test, which never ships, is the mechanical drift guard, per
// [[project_contracts_domain_bundle_boundary]]); (2) the BEHAVIOURAL guard binding this package's
// `deriveSurveyDisplayState` to the domain's — two implementations, one asserted behaviour;
// (3) the `.strict()` behaviour + snake_case wire shape of the DTOs, including a camelCase↔snake_case
// ROUND TRIP through the questionnaire structures; (4) the LBD-3 structural proof that no aggregate
// or free-text DTO can carry a member identifier.

import { surveys as surveysDomain, schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  MAX_FREE_TEXT_ANSWER,
  MAX_OPTIONS_PER_QUESTION,
  MAX_OPTION_TEXT,
  MAX_QUESTIONS_PER_SURVEY,
  MAX_QUESTION_TEXT,
  MIN_OPTIONS_PER_CHOICE_QUESTION,
  MemberSurveyResponse,
  SURVEY_AUDIENCE_SCOPES,
  SURVEY_DISPLAY_STATES,
  SURVEY_QUESTION_TYPES,
  SURVEY_STATUSES,
  SURVEY_TARGETABLE_AUDIENCE_SCOPES,
  SubmitSurveyResponseRequest,
  SurveyAggregateResponse,
  SurveyFreeTextAnswer,
  SurveyQuestion,
  SurveyResponse,
  CreateSurveyRequest,
  deriveSurveyDisplayState,
} from '../src/surveys/index.js';

const UUID_A = '11111111-1111-1111-1111-111111111111';
const UUID_B = '22222222-2222-2222-2222-222222222222';
const UUID_C = '33333333-3333-3333-3333-333333333333';

describe('surveys contract ↔ domain sync-guard', () => {
  it('SURVEY_STATUSES matches the domain pgEnum-source tuple — three STORED values, not five', () => {
    expect([...SURVEY_STATUSES]).toEqual([...schema.SURVEY_STATUSES]);
    // `scheduled`/`open`/`expired` are DERIVED (AC2); they must never appear as a stored status.
    for (const derived of ['scheduled', 'open', 'expired']) {
      expect(SURVEY_STATUSES).not.toContain(derived);
    }
  });

  it('SURVEY_AUDIENCE_SCOPES matches the domain pgEnum-source tuple', () => {
    expect([...SURVEY_AUDIENCE_SCOPES]).toEqual([...schema.SURVEY_AUDIENCE_SCOPES]);
  });

  it('SURVEY_QUESTION_TYPES matches the domain pgEnum-source tuple — EXACTLY three (LBD-4)', () => {
    expect([...SURVEY_QUESTION_TYPES]).toEqual([...schema.SURVEY_QUESTION_TYPES]);
    expect(SURVEY_QUESTION_TYPES).toHaveLength(3);
  });

  it('SURVEY_DISPLAY_STATES matches the domain DERIVATION tuple (not a pgEnum — there is no column)', () => {
    expect([...SURVEY_DISPLAY_STATES]).toEqual([...schema.SURVEY_DISPLAY_STATES]);
  });

  // ⭐ ORDER-SENSITIVE. Both lists must change in the SAME POSITION or this fails on ordering.
  it('SURVEY_TARGETABLE_AUDIENCE_SCOPES matches the domain authority, order included', () => {
    expect([...SURVEY_TARGETABLE_AUDIENCE_SCOPES]).toEqual([...surveysDomain.SURVEY_TARGETABLE_AUDIENCE_SCOPES]);
  });

  // ⭐ THE LBD-7 INVERSION, pinned on the contracts side too: the admin console reads this list to
  // render its "not yet targetable" indicator, and `public` must NOT appear (the banner mirror has it).
  it('OMITS public from the targetable scopes — the inversion relative to banners', () => {
    expect(SURVEY_TARGETABLE_AUDIENCE_SCOPES).not.toContain('public');
  });

  it('mirrors all five questionnaire caps from the domain limits module', () => {
    expect(MAX_QUESTIONS_PER_SURVEY).toBe(surveysDomain.MAX_QUESTIONS_PER_SURVEY);
    expect(MAX_OPTIONS_PER_QUESTION).toBe(surveysDomain.MAX_OPTIONS_PER_QUESTION);
    expect(MIN_OPTIONS_PER_CHOICE_QUESTION).toBe(surveysDomain.MIN_OPTIONS_PER_CHOICE_QUESTION);
    expect(MAX_QUESTION_TEXT).toBe(surveysDomain.MAX_QUESTION_TEXT);
    expect(MAX_OPTION_TEXT).toBe(surveysDomain.MAX_OPTION_TEXT);
    expect(MAX_FREE_TEXT_ANSWER).toBe(surveysDomain.MAX_FREE_TEXT_ANSWER);
  });
});

// ⭐ TWO IMPLEMENTATIONS, ONE ASSERTED BEHAVIOUR. `deriveSurveyDisplayState` exists in @twt/domain
// (server, Date-typed row) AND in this package (browser, ISO-string DTO). This is the only thing
// keeping them from drifting.
describe('deriveSurveyDisplayState — contracts copy ≡ domain copy', () => {
  const FROM = new Date('2026-09-01T00:00:00.000Z');
  const UNTIL = new Date('2026-09-30T00:00:00.000Z');

  const instants = [
    new Date('2026-08-01T00:00:00.000Z'),
    new Date(FROM.getTime() - 1),
    FROM, // exactly valid_from — INCLUSIVE
    new Date('2026-09-15T00:00:00.000Z'),
    new Date(UNTIL.getTime() - 1),
    UNTIL, // exactly valid_until — EXCLUSIVE
    new Date('2026-10-15T00:00:00.000Z'),
  ];

  it('agrees on every (status, instant) pair including both window boundaries', () => {
    for (const status of SURVEY_STATUSES) {
      for (const now of instants) {
        const wire = deriveSurveyDisplayState(
          { status, valid_from: FROM.toISOString(), valid_until: UNTIL.toISOString() },
          now,
        );
        const domain = surveysDomain.deriveSurveyDisplayState({ status, validFrom: FROM, validUntil: UNTIL }, now);
        expect(wire).toBe(domain);
      }
    }
  });
});

describe('survey DTO wire shape', () => {
  function question(overrides: Record<string, unknown> = {}) {
    return {
      question_id: UUID_A,
      question_text: 'Which day suits the meeting?',
      question_text_hi: 'बैठक के लिए कौन सा दिन ठीक रहेगा?',
      type: 'single_choice',
      options: [
        { option_id: UUID_B, option_text: 'Saturday', option_text_hi: 'शनिवार' },
        { option_id: UUID_C, option_text: 'Sunday', option_text_hi: 'रविवार' },
      ],
      ...overrides,
    };
  }

  // ⭐ THE ROUND TRIP. The questionnaire's inner keys are snake_case on BOTH sides on purpose, so it
  // crosses the boundary unmapped. The moment someone "tidies" the domain types to camelCase, the
  // JSONB column and the wire silently disagree — and this is what catches it.
  it('round-trips a questionnaire through the domain type without any key mapping', () => {
    const parsed = SurveyQuestion.parse(question());
    const asDomainType: surveysDomain.SurveyQuestion = parsed;
    // Re-parsing the domain-typed value must succeed and be identical — proving no key differs.
    expect(SurveyQuestion.parse(asDomainType)).toEqual(parsed);
    expect(Object.keys(parsed).sort()).toEqual(['options', 'question_id', 'question_text', 'question_text_hi', 'type']);
    expect(Object.keys(parsed.options![0]!).sort()).toEqual(['option_id', 'option_text', 'option_text_hi']);
  });

  it('rejects an unknown key on a question — the forbidden constructs cannot ride along in JSONB', () => {
    // LBD-4's forbidden list, refused at the edge rather than surviving in a JSONB column.
    for (const rogue of [{ branch_to: UUID_B }, { weight: 3 }, { allows_other: true }, { required: true }]) {
      expect(() => SurveyQuestion.parse(question(rogue))).toThrow();
    }
  });

  it('enforces the caps structurally', () => {
    expect(() => SurveyQuestion.parse(question({ question_text: 'x'.repeat(MAX_QUESTION_TEXT + 1) }))).toThrow();
    const tooMany = Array.from({ length: MAX_OPTIONS_PER_QUESTION + 1 }, () => ({
      option_id: UUID_B,
      option_text: 'o',
      option_text_hi: 'ओ',
    }));
    expect(() => SurveyQuestion.parse(question({ options: tooMany }))).toThrow();
  });

  it('rejects camelCase drift on the create request', () => {
    const base = {
      audience_scope: 'members-all',
      valid_from: '2026-09-01T00:00:00.000Z',
      valid_until: '2026-09-30T00:00:00.000Z',
    };
    expect(() => CreateSurveyRequest.parse(base)).not.toThrow();
    expect(() => CreateSurveyRequest.parse({ ...base, validFrom: '2026-09-01T00:00:00.000Z' })).toThrow();
    expect(() => CreateSurveyRequest.parse({ ...base, responseThreshold: 10 })).toThrow();
  });

  it('requires audience_scope_value for state and forbids it for members-all', () => {
    const base = { valid_from: '2026-09-01T00:00:00.000Z', valid_until: '2026-09-30T00:00:00.000Z' };
    expect(() => CreateSurveyRequest.parse({ ...base, audience_scope: 'state' })).toThrow();
    expect(() => CreateSurveyRequest.parse({ ...base, audience_scope: 'state', audience_scope_value: 'Bihar' })).not.toThrow();
    expect(() =>
      CreateSurveyRequest.parse({ ...base, audience_scope: 'members-all', audience_scope_value: 'Bihar' }),
    ).toThrow();
  });

  it('caps a free-text answer at MAX_FREE_TEXT_ANSWER', () => {
    const over = { answers: [{ question_id: UUID_A, answer_text: 'x'.repeat(MAX_FREE_TEXT_ANSWER + 1) }] };
    expect(() => SubmitSurveyResponseRequest.parse(over)).toThrow();
  });
});

// ⛔ LBD-3 — the PII shield, asserted STRUCTURALLY. Not "the server does not populate a member id":
// there is no field, and `.strict()` means one cannot be added at runtime either.
describe('the aggregate + free-text shapes cannot carry a member identifier', () => {
  const aggregate = {
    survey_id: UUID_A,
    response_count: 3,
    response_threshold: null,
    threshold_met: null,
    questions: [{ question_id: UUID_B, type: 'single_choice' as const, option_counts: [{ option_id: UUID_C, count: 2 }], answered_count: 3 }],
  };

  it('parses a clean aggregate', () => {
    expect(() => SurveyAggregateResponse.parse(aggregate)).not.toThrow();
  });

  it('REFUSES an aggregate carrying a member_id at any level', () => {
    expect(() => SurveyAggregateResponse.parse({ ...aggregate, member_id: UUID_C })).toThrow();
    expect(() =>
      SurveyAggregateResponse.parse({
        ...aggregate,
        questions: [{ ...aggregate.questions[0]!, member_ids: [UUID_C] }],
      }),
    ).toThrow();
  });

  it('free text is exactly {answer_text, submitted_at} — no id, no ordinal, no question echo', () => {
    const answer = { answer_text: 'more notice next time', submitted_at: '2026-09-10T00:00:00.000Z' };
    expect(Object.keys(SurveyFreeTextAnswer.parse(answer)).sort()).toEqual(['answer_text', 'submitted_at']);
    // Each absence, refused individually — a reviewer must see WHICH re-identification vector each
    // key would open, not just that extras are rejected.
    expect(() => SurveyFreeTextAnswer.parse({ ...answer, member_id: UUID_C })).toThrow();
    expect(() => SurveyFreeTextAnswer.parse({ ...answer, response_id: UUID_C })).toThrow();
    expect(() => SurveyFreeTextAnswer.parse({ ...answer, ordinal: 4 })).toThrow();
    expect(() => SurveyFreeTextAnswer.parse({ ...answer, question_id: UUID_B })).toThrow();
  });
});

// ⚠ LBD-1 in DTO form: the member never sees the threshold, because a target count invites the member
// to read a survey as a vote that passes or fails — which is precisely what a survey is not.
describe('the member DTO withholds the admin-only fields', () => {
  const member = {
    survey_id: UUID_A,
    title: 'Meeting day',
    body: 'Tell us what suits you',
    title_hi: 'बैठक का दिन',
    body_hi: 'हमें बताइए',
    questions: [],
    valid_until: '2026-09-30T00:00:00.000Z',
    answered: false,
  };

  it('parses the member shape', () => {
    expect(() => MemberSurveyResponse.parse(member)).not.toThrow();
  });

  it('REFUSES response_threshold, status, actor ids, tone-signoff fields and the audience selector', () => {
    for (const rogue of [
      { response_threshold: 25 },
      { threshold_met: false },
      { status: 'published' },
      { created_by_actor_id: UUID_B },
      { tone_signoff_reviewed_by: UUID_B },
      { audience_scope: 'members-all' },
      { audience_scope_value: 'Bihar' },
    ]) {
      expect(() => MemberSurveyResponse.parse({ ...member, ...rogue })).toThrow();
    }
  });

  it('the ADMIN shape does carry them — the split is deliberate, not an omission', () => {
    const admin = {
      survey_id: UUID_A,
      pariwar_id: UUID_B,
      title: 'T',
      body: 'B',
      title_hi: 'ट',
      body_hi: 'ब',
      questions: [],
      audience_scope: 'members-all' as const,
      audience_scope_value: null,
      valid_from: '2026-09-01T00:00:00.000Z',
      valid_until: '2026-09-30T00:00:00.000Z',
      response_threshold: 25,
      status: 'published' as const,
      display_state: 'open' as const,
      created_by_actor_id: UUID_C,
      tone_signoff_content_hash: 'abc',
      tone_signoff_reviewed_at: '2026-08-31T00:00:00.000Z',
      tone_signoff_reviewed_by: UUID_B,
      published_at: '2026-08-31T00:00:00.000Z',
      closed_at: null,
      created_at: '2026-08-30T00:00:00.000Z',
      updated_at: '2026-08-31T00:00:00.000Z',
    };
    expect(() => SurveyResponse.parse(admin)).not.toThrow();
  });
});
