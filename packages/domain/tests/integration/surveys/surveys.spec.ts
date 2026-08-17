// surveys + survey_responses accessors — live-DB (Story 10.15, Task 4/11; AC1–AC7).
//
// Exercises the mutable-status workflow (LBD-2): create/update/publish/close with the pre-write
// legality guard, the tone-review gate at publish, ⭐ the LBD-5 post-publish FREEZE (the 409s and the
// one permitted extension), ⭐ the LBD-6 one-response-per-member 409 (an INSERT, never an upsert),
// the read-time window boundary at EXACTLY `valid_from` and EXACTLY `valid_until`, the DB CHECK
// teeth, RLS tenant isolation, ⭐ the LBD-3 member-id-free aggregate + free-text projections, and the
// AC8 audience resolution through the shared predicate.
//
// RLS-in-tests (Story 1.6): seed as the Docker superuser (RLS bypassed), then `enterAppScope`
// (SET LOCAL ROLE twt_app + scope) to exercise the accessors under tenant scope. afterEach ROLLBACK.
//
// ⚠ Every instant here is PINNED and every window is seeded RELATIVE to those pinned instants — a
// test pinning a query instant against a clock-defaulted seed fails on a future DATE, and a baseline
// comparison can never see it ([[project_known_livedb_test_failures]] #12).

import { describe, expect, it } from 'vitest';

import { hasDatabase, getTx, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedMember, seedMemberPosting } from '../_helpers.js';
import { createGeoTreeVersion, loadGeoTree } from '../../../src/geo-tree/index.js';
import type { GeoTreeNodeJson } from '../../../src/schema/geo_tree_versions.js';
import { memberId as toMemberId, surveyId as toSurveyId, type PariwarId, type UserId } from '../../../src/ids/index.js';
import { ToneReviewRequiredError } from '../../../src/tone-review/errors.js';
import {
  SurveyAlreadyRespondedError,
  SurveyAudienceUnsupportedError,
  SurveyBilingualRequiredError,
  SurveyFrozenFieldError,
  SurveyNotFoundError,
  SurveyQuestionnaireInvalidError,
  SurveyStateError,
  SurveyWindowInvalidError,
} from '../../../src/surveys/errors.js';
import type { CreateSurveyDraftInput, UpdateSurveyPatch } from '../../../src/surveys/write.js';
import type { SurveyQuestion } from '../../../src/surveys/types.js';
import {
  close,
  createDraft,
  getSurvey,
  getSurveyAggregate,
  listFreeTextAnswers,
  listOpenSurveysForMember,
  listSurveysForPariwar,
  publish,
  recordResponse,
  resolveSurveyAudienceMemberIds,
  updateSurvey,
} from '../../../src/surveys/index.js';

/**
 * Which DB constraint did this write violate? Drizzle WRAPS the pg error ("Failed query: …"), so the
 * constraint name lives on `err.cause`, not on `err.message`. Asserting on the NAME (not merely "it
 * threw") is what makes these the revert-sanity teeth for the CHECKs: drop one from migration 0109
 * and the write succeeds, so the assertion fails rather than passing on some unrelated error.
 */
function violatedConstraint(err: unknown): string | undefined {
  return (err as { cause?: { constraint?: string } } | undefined)?.cause?.constraint;
}

// Bihar ⊃ {Patna}; UP ⊃ {Lucknow}. Two states so "reaches the right member" is a real discrimination,
// not merely "reaches everyone in the only state there is" (Story 1.19).
const GEO_TREE: GeoTreeNodeJson[] = [
  { dimension: 'state', value: 'Bihar', parent_dimension: null, parent_value: null },
  { dimension: 'state', value: 'UP', parent_dimension: null, parent_value: null },
  { dimension: 'district', value: 'Patna', parent_dimension: 'state', parent_value: 'Bihar' },
  { dimension: 'district', value: 'Lucknow', parent_dimension: 'state', parent_value: 'UP' },
];

const AUTHOR = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' as UserId;
const OTHER_ADMIN = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' as UserId;

const FROM = new Date('2026-08-01T00:00:00.000Z');
const UNTIL = new Date('2026-08-08T00:00:00.000Z');
const MID = new Date('2026-08-04T12:00:00.000Z');
const BEFORE = new Date('2026-07-01T00:00:00.000Z');
// ⚠ Posting seeds pin `created_at` EXPLICITLY — the default is the REAL wall clock, which would put
// every seeded posting in the FUTURE relative to the pinned query instant and silently empty the geo
// audience. The date-bomb class ([[project_known_livedb_test_failures]] #12).
const POSTED = new Date('2026-07-15T00:00:00.000Z');

const Q_CHOICE = '00000000-0000-4000-8000-000000000001';
const Q_TEXT = '00000000-0000-4000-8000-000000000002';
const OPT_A = '00000000-0000-4000-8000-00000000000a';
const OPT_B = '00000000-0000-4000-8000-00000000000b';
const OPT_C = '00000000-0000-4000-8000-00000000000c';

const QUESTIONS: SurveyQuestion[] = [
  {
    question_id: Q_CHOICE,
    question_text: 'Which day suits the meeting?',
    question_text_hi: 'बैठक के लिए कौन सा दिन ठीक रहेगा?',
    type: 'single_choice',
    options: [
      { option_id: OPT_A, option_text: 'Saturday', option_text_hi: 'शनिवार' },
      { option_id: OPT_B, option_text: 'Sunday', option_text_hi: 'रविवार' },
      { option_id: OPT_C, option_text: 'Monday', option_text_hi: 'सोमवार' },
    ],
  },
  {
    question_id: Q_TEXT,
    question_text: 'Anything else we should know?',
    question_text_hi: 'और कुछ जो हमें जानना चाहिए?',
    type: 'free_text',
  },
];

function draftInput(pariwarId: PariwarId, o: Partial<CreateSurveyDraftInput> = {}): CreateSurveyDraftInput {
  return {
    pariwarId,
    title: 'Meeting day',
    body: 'Tell us which day suits you.',
    titleHi: 'बैठक का दिन',
    bodyHi: 'हमें बताइए कि कौन सा दिन ठीक रहेगा।',
    questions: QUESTIONS,
    audienceScope: 'members-all',
    audienceScopeValue: null,
    validFrom: FROM,
    validUntil: UNTIL,
    responseThreshold: null,
    createdByActorId: AUTHOR,
    ...o,
  };
}

/** Create + publish in one step (publishing needs a NON-author actor — the tone gate). */
async function publishedSurvey(
  tx: Parameters<typeof createDraft>[0],
  pariwarId: PariwarId,
  o: Partial<CreateSurveyDraftInput> = {},
) {
  const draft = await createDraft(tx, draftInput(pariwarId, o));
  const { row } = await publish(tx, pariwarId, draft.surveyId, OTHER_ADMIN, MID);
  return row;
}

function fullAnswers() {
  return [
    { question_id: Q_CHOICE, selected_option_ids: [OPT_A] },
    { question_id: Q_TEXT, answer_text: 'please give more notice' },
  ];
}

describe.skipIf(!hasDatabase)('surveys — lifecycle + guards', () => {
  setupLiveDb();

  it('createDraft → getSurvey round-trips at status=draft with the questionnaire intact', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const created = await createDraft(tx, draftInput(PARIWAR_A));
    expect(created.status).toBe('draft');
    expect(created.publishedAt).toBeNull();
    expect(created.closedAt).toBeNull();

    const loaded = await getSurvey(tx, PARIWAR_A, created.surveyId);
    expect(loaded?.surveyId).toBe(created.surveyId);
    expect(loaded?.createdByActorId).toBe(AUTHOR);
    // ⭐ The JSONB round-trip: snake_case inner keys survive the DB with no mapping layer.
    expect(loaded?.questions).toEqual(QUESTIONS);
  });

  it('getSurvey returns null for another tenant’s survey; the write path 404s', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const created = await createDraft(tx, draftInput(PARIWAR_A));

    await enterAppScope(client, PARIWAR_B);
    expect(await getSurvey(tx, PARIWAR_B, created.surveyId)).toBeNull();
    // ⭐ 404, never 403 — a 403 would confirm the row exists (AC6's cross-tenant leg at the accessor).
    await expect(close(tx, PARIWAR_B, created.surveyId, MID)).rejects.toBeInstanceOf(SurveyNotFoundError);
  });

  it('a completely absent survey id is also a 404 — the same shape as a cross-tenant one', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      close(tx, PARIWAR_A, toSurveyId('99999999-9999-4999-8999-999999999999'), MID),
    ).rejects.toBeInstanceOf(SurveyNotFoundError);
  });

  it('publish requires a NON-author sign-off — the author cannot publish their own survey', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const draft = await createDraft(tx, draftInput(PARIWAR_A));
    // ⚠ KNOWN, PO-RATIFIED CONSEQUENCE: a single-admin Pariwar therefore cannot publish. A deferral
    // with precedent (10.5 review, PO 2026-07-30), not a bug.
    await expect(publish(tx, PARIWAR_A, draft.surveyId, AUTHOR, MID)).rejects.toBeInstanceOf(
      ToneReviewRequiredError,
    );
    const after = await getSurvey(tx, PARIWAR_A, draft.surveyId);
    expect(after?.status).toBe('draft'); // ⭐ NO status change on a deny.
  });

  it('publish by a non-author transitions draft → published and records the sign-off hash', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const row = await publishedSurvey(tx, PARIWAR_A);
    expect(row.status).toBe('published');
    expect(row.publishedAt).not.toBeNull();
    expect(row.toneSignoffReviewedBy).toBe(OTHER_ADMIN);
    // ⛔ A HASH, never the copy and never the questions.
    expect(row.toneSignoffContentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('publish refuses a survey missing a copy field (FR-68) or with zero questions', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const noHindi = await createDraft(tx, draftInput(PARIWAR_A, { titleHi: null }));
    await expect(publish(tx, PARIWAR_A, noHindi.surveyId, OTHER_ADMIN, MID)).rejects.toBeInstanceOf(
      SurveyBilingualRequiredError,
    );

    const noQuestions = await createDraft(tx, draftInput(PARIWAR_A, { questions: [] }));
    await expect(publish(tx, PARIWAR_A, noQuestions.surveyId, OTHER_ADMIN, MID)).rejects.toBeInstanceOf(
      SurveyQuestionnaireInvalidError,
    );
  });

  it('closed is TERMINAL — no reopen, and no edit', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const row = await publishedSurvey(tx, PARIWAR_A);
    const closed = await close(tx, PARIWAR_A, row.surveyId, MID);
    expect(closed.status).toBe('closed');
    expect(closed.closedAt).not.toBeNull();

    await expect(publish(tx, PARIWAR_A, row.surveyId, OTHER_ADMIN, MID)).rejects.toBeInstanceOf(SurveyStateError);
    await expect(close(tx, PARIWAR_A, row.surveyId, MID)).rejects.toBeInstanceOf(SurveyStateError);
    await expect(
      updateSurvey(tx, PARIWAR_A, row.surveyId, { title: 'anything' }, MID),
    ).rejects.toBeInstanceOf(SurveyStateError);
  });

  it('a draft may be closed as a DISCARD (never published)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const draft = await createDraft(tx, draftInput(PARIWAR_A));
    const closed = await close(tx, PARIWAR_A, draft.surveyId, MID);
    expect(closed.status).toBe('closed');
    expect(closed.publishedAt).toBeNull();
  });

  it('the DB CHECK teeth: an empty window and a zero threshold are refused at the database', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    // The domain 422 fires first for the window…
    await expect(
      createDraft(tx, draftInput(PARIWAR_A, { validFrom: UNTIL, validUntil: FROM })),
    ).rejects.toBeInstanceOf(SurveyWindowInvalidError);
    // …and the threshold CHECK is the DB's own teeth (no domain guard duplicates it).
    await expect(createDraft(tx, draftInput(PARIWAR_A, { responseThreshold: 0 }))).rejects.toSatisfy(
      (err: unknown) => violatedConstraint(err) === 'surveys_response_threshold_positive',
      'expected the write to violate the surveys_response_threshold_positive CHECK',
    );
  });

  it('the write path REJECTS public — ⚠ the OPPOSITE of banners, deliberately (LBD-7)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(createDraft(tx, draftInput(PARIWAR_A, { audienceScope: 'public' }))).rejects.toBeInstanceOf(
      SurveyAudienceUnsupportedError,
    );
    await expect(createDraft(tx, draftInput(PARIWAR_A, { audienceScope: 'role' }))).rejects.toBeInstanceOf(
      SurveyAudienceUnsupportedError,
    );
  });
});

// ⭐ THE LBD-5 FREEZE. A response is an answer TO A QUESTION — change the question and every stored
// answer silently becomes an answer to something nobody asked.
describe.skipIf(!hasDatabase)('surveys — the post-publish freeze (LBD-5)', () => {
  setupLiveDb();

  it('a DRAFT accepts every edit, re-validated', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const draft = await createDraft(tx, draftInput(PARIWAR_A));
    const edited = await updateSurvey(
      tx,
      PARIWAR_A,
      draft.surveyId,
      { title: 'Changed', questions: [QUESTIONS[1]!], responseThreshold: 5 },
      MID,
    );
    expect(edited.title).toBe('Changed');
    expect(edited.questions).toEqual([QUESTIONS[1]]);
    expect(edited.responseThreshold).toBe(5);
  });

  it('a PUBLISHED survey 409s on every frozen field, NAMING it', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const row = await publishedSurvey(tx, PARIWAR_A);

    const frozenCases: [UpdateSurveyPatch, string][] = [
      [{ questions: [QUESTIONS[1]!] }, 'questions'],
      [{ responseThreshold: 5 }, 'response_threshold'],
      [{ audienceScope: 'state', audienceScopeValue: 'Bihar' }, 'audience_scope'],
      [{ title: 'Rewritten' }, 'title'],
      [{ validFrom: BEFORE }, 'valid_from'],
    ];
    for (const [patch, field] of frozenCases) {
      const err = await updateSurvey(tx, PARIWAR_A, row.surveyId, patch, MID).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(SurveyFrozenFieldError);
      expect((err as SurveyFrozenFieldError).frozenFields).toContain(field);
    }
  });

  it('the ONE permitted post-publish mutation is EXTENDING valid_until', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const row = await publishedSurvey(tx, PARIWAR_A);
    const later = new Date(UNTIL.getTime() + 86_400_000);
    const extended = await updateSurvey(tx, PARIWAR_A, row.surveyId, { validUntil: later }, MID);
    expect(extended.validUntil.toISOString()).toBe(later.toISOString());
  });

  it('SHORTENING valid_until is a 422 pointing at close — not a frozen-field 409', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const row = await publishedSurvey(tx, PARIWAR_A);
    const err = await updateSurvey(
      tx,
      PARIWAR_A,
      row.surveyId,
      { validUntil: new Date(UNTIL.getTime() - 86_400_000) },
      MID,
    ).catch((e: unknown) => e);
    // The DIRECTION of the change is what is wrong, not the field's mutability — so it is the 422
    // sibling, and the message names the remedy that actually exists.
    expect(err).toBeInstanceOf(SurveyWindowInvalidError);
    expect((err as Error).message).toContain('close the survey');
  });
});

describe.skipIf(!hasDatabase)('surveys — the read-time window (AC2)', () => {
  setupLiveDb();

  it('accepts a response at EXACTLY valid_from (INCLUSIVE)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const row = await publishedSurvey(tx, PARIWAR_A);
    const memberId = await toMemberId(await seedMember(tx, PARIWAR_A, { state: 'active' }));
    const written = await recordResponse(tx, {
      pariwarId: PARIWAR_A,
      surveyId: row.surveyId,
      memberId,
      answers: fullAnswers(),
      now: FROM,
    });
    expect(written.surveyId).toBe(row.surveyId);
  });

  it('REFUSES a response at EXACTLY valid_until (EXCLUSIVE) — expiry is enforced on the WRITE', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const row = await publishedSurvey(tx, PARIWAR_A);
    const memberId = await toMemberId(await seedMember(tx, PARIWAR_A, { state: 'active' }));
    await expect(
      recordResponse(tx, { pariwarId: PARIWAR_A, surveyId: row.surveyId, memberId, answers: fullAnswers(), now: UNTIL }),
    ).rejects.toBeInstanceOf(SurveyStateError);
    // …and one millisecond earlier it is still open.
    const ok = await recordResponse(tx, {
      pariwarId: PARIWAR_A,
      surveyId: row.surveyId,
      memberId,
      answers: fullAnswers(),
      now: new Date(UNTIL.getTime() - 1),
    });
    expect(ok.surveyId).toBe(row.surveyId);
  });

  // [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): a draft is not yet visible to a
  // member (AC6) — it must read as 404, identically to a cross-tenant survey, never as a state-
  // revealing 409 that confirms the row exists. `closed` WAS published and visible, so it stays a 409.
  it('REFUSES a response to a survey that is still a draft — 404, not a state conflict (AC6)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const memberId = await toMemberId(await seedMember(tx, PARIWAR_A, { state: 'active' }));

    const draft = await createDraft(tx, draftInput(PARIWAR_A));
    await expect(
      recordResponse(tx, { pariwarId: PARIWAR_A, surveyId: draft.surveyId, memberId, answers: fullAnswers(), now: MID }),
    ).rejects.toBeInstanceOf(SurveyNotFoundError);
  });

  it('REFUSES a response to an already-closed survey — a state conflict, not a 404', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const memberId = await toMemberId(await seedMember(tx, PARIWAR_A, { state: 'active' }));

    const published = await publishedSurvey(tx, PARIWAR_A);
    await close(tx, PARIWAR_A, published.surveyId, MID);
    await expect(
      recordResponse(tx, { pariwarId: PARIWAR_A, surveyId: published.surveyId, memberId, answers: fullAnswers(), now: MID }),
    ).rejects.toBeInstanceOf(SurveyStateError);
  });
});

// ⭐ LBD-6 — the composite PK IS the invariant, and the migration additionally withholds UPDATE on
// this table from twt_app, so the forbidden "convenience upsert" is unavailable, not merely
// discouraged.
describe.skipIf(!hasDatabase)('survey_responses — one per member, final (LBD-6)', () => {
  setupLiveDb();

  it('a SECOND response from the same member is a 409 — an INSERT, never an upsert', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const row = await publishedSurvey(tx, PARIWAR_A);
    const memberId = await toMemberId(await seedMember(tx, PARIWAR_A, { state: 'active' }));
    const first = await recordResponse(tx, {
      pariwarId: PARIWAR_A,
      surveyId: row.surveyId,
      memberId,
      answers: [{ question_id: Q_CHOICE, selected_option_ids: [OPT_A] }, { question_id: Q_TEXT, answer_text: 'first' }],
      now: MID,
    });

    await expect(
      recordResponse(tx, {
        pariwarId: PARIWAR_A,
        surveyId: row.surveyId,
        memberId,
        answers: [{ question_id: Q_CHOICE, selected_option_ids: [OPT_B] }, { question_id: Q_TEXT, answer_text: 'second' }],
        now: MID,
      }),
    ).rejects.toBeInstanceOf(SurveyAlreadyRespondedError);

    // ⭐ AND THE ORIGINAL IS UNCHANGED — an upsert would have silently overwritten it, which is what
    // makes this the load-bearing half of the assertion rather than just "it threw".
    const stored = await getSurveyAggregate(tx, PARIWAR_A, row.surveyId);
    expect(stored.response_count).toBe(1);
    expect(stored.questions[0]?.option_counts).toEqual([
      { option_id: OPT_A, count: 1 },
      { option_id: OPT_B, count: 0 },
      { option_id: OPT_C, count: 0 },
    ]);
    void first;
  });

  it('two DIFFERENT members may each answer once', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const row = await publishedSurvey(tx, PARIWAR_A);
    const m1 = await toMemberId(await seedMember(tx, PARIWAR_A, { state: 'active' }));
    const m2 = await toMemberId(await seedMember(tx, PARIWAR_A, { state: 'active' }));
    for (const memberId of [m1, m2]) {
      await recordResponse(tx, { pariwarId: PARIWAR_A, surveyId: row.surveyId, memberId, answers: fullAnswers(), now: MID });
    }
    const agg = await getSurveyAggregate(tx, PARIWAR_A, row.surveyId);
    expect(agg.response_count).toBe(2);
  });
});

// ⛔ LBD-3 — the shield is the PROJECTION. Asserted on the returned SHAPE, not by inspection.
describe.skipIf(!hasDatabase)('surveys — the aggregate + free-text PII shield (AC7, LBD-3)', () => {
  setupLiveDb();

  it('the aggregate carries NO member identifier at any level', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const row = await publishedSurvey(tx, PARIWAR_A, { responseThreshold: 2 });
    const m1 = await toMemberId(await seedMember(tx, PARIWAR_A, { state: 'active' }));
    const m2 = await toMemberId(await seedMember(tx, PARIWAR_A, { state: 'active' }));
    await recordResponse(tx, { pariwarId: PARIWAR_A, surveyId: row.surveyId, memberId: m1, answers: fullAnswers(), now: MID });
    await recordResponse(tx, {
      pariwarId: PARIWAR_A,
      surveyId: row.surveyId,
      memberId: m2,
      answers: [{ question_id: Q_CHOICE, selected_option_ids: [OPT_B] }, { question_id: Q_TEXT, answer_text: 'ok' }],
      now: MID,
    });

    const agg = await getSurveyAggregate(tx, PARIWAR_A, row.surveyId);
    const serialized = JSON.stringify(agg);
    expect(serialized).not.toContain(m1);
    expect(serialized).not.toContain(m2);
    expect(Object.keys(agg).sort()).toEqual(['questions', 'response_count', 'response_threshold', 'threshold_met']);
    // ⚠ INFORMATIONAL only — it gates nothing (LBD-1).
    expect(agg.threshold_met).toBe(true);
  });

  it('threshold_met is NULL when no threshold was authored — it must not read as "not met"', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const row = await publishedSurvey(tx, PARIWAR_A);
    const agg = await getSurveyAggregate(tx, PARIWAR_A, row.surveyId);
    expect(agg.response_threshold).toBeNull();
    expect(agg.threshold_met).toBeNull();
  });

  it('free text is UNATTRIBUTED — exactly {answer_text, submitted_at}, and it is the real content', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const row = await publishedSurvey(tx, PARIWAR_A);
    const m1 = await toMemberId(await seedMember(tx, PARIWAR_A, { state: 'active' }));
    await recordResponse(tx, {
      pariwarId: PARIWAR_A,
      surveyId: row.surveyId,
      memberId: m1,
      answers: [{ question_id: Q_CHOICE, selected_option_ids: [OPT_A] }, { question_id: Q_TEXT, answer_text: 'MY_ANSWER' }],
      now: MID,
    });

    const answers = await listFreeTextAnswers(tx, PARIWAR_A, row.surveyId, Q_TEXT);
    // Assert MEMBERSHIP, not counts ([[project_live_db_test_gotchas]]).
    expect(answers.map((a) => a.answer_text)).toContain('MY_ANSWER');
    for (const a of answers) {
      // Every absence is deliberate: no member id, no row id, no ordinal, no question echo.
      expect(Object.keys(a).sort()).toEqual(['answer_text', 'submitted_at']);
    }
    expect(JSON.stringify(answers)).not.toContain(m1);
  });

  it('a member who answered a CHOICE question contributes no free-text row', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const row = await publishedSurvey(tx, PARIWAR_A);
    const m1 = await toMemberId(await seedMember(tx, PARIWAR_A, { state: 'active' }));
    await recordResponse(tx, {
      pariwarId: PARIWAR_A,
      surveyId: row.surveyId,
      memberId: m1,
      answers: [{ question_id: Q_CHOICE, selected_option_ids: [OPT_A] }, { question_id: Q_TEXT, answer_text: 'x' }],
      now: MID,
    });
    // Asking for the CHOICE question's free text yields nothing — a choice answer has no text.
    expect(await listFreeTextAnswers(tx, PARIWAR_A, row.surveyId, Q_CHOICE)).toEqual([]);
  });
});

describe.skipIf(!hasDatabase)('surveys — the admin list + the member read', () => {
  setupLiveDb();

  it('listSurveysForPariwar is tenant-isolated (membership, not counts)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const mine = await createDraft(tx, draftInput(PARIWAR_A));
    await enterAppScope(client, PARIWAR_B);
    const theirs = await createDraft(tx, draftInput(PARIWAR_B));

    await enterAppScope(client, PARIWAR_A);
    const rows = await listSurveysForPariwar(tx, PARIWAR_A);
    const ids = rows.map((r) => r.surveyId);
    expect(ids).toContain(mine.surveyId);
    expect(ids).not.toContain(theirs.surveyId);
  });

  it('the member read returns an open members-all survey with answered=false, then true', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const row = await publishedSurvey(tx, PARIWAR_A);
    const memberId = await toMemberId(await seedMember(tx, PARIWAR_A, { state: 'active' }));

    // [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): `listOpenSurveysForMember` now
    // returns `{ candidates, hasMore, consumed }` (member-list pagination), not a bare array.
    const before = await listOpenSurveysForMember(tx, PARIWAR_A, memberId, MID, { info: () => {} });
    expect(before.candidates.find((c) => c.survey.surveyId === row.surveyId)?.answered).toBe(false);

    await recordResponse(tx, { pariwarId: PARIWAR_A, surveyId: row.surveyId, memberId, answers: fullAnswers(), now: MID });

    // ⭐ STILL RETURNED, flagged answered — not filtered out (AC6). A member who answered yesterday
    // must see that they did, not an empty list that reads as "nothing was ever asked".
    const after = await listOpenSurveysForMember(tx, PARIWAR_A, memberId, MID, { info: () => {} });
    expect(after.candidates.find((c) => c.survey.surveyId === row.surveyId)?.answered).toBe(true);
  });

  it('a survey outside its window is not in the member read', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const row = await publishedSurvey(tx, PARIWAR_A);
    const memberId = await toMemberId(await seedMember(tx, PARIWAR_A, { state: 'active' }));
    const scheduled = await listOpenSurveysForMember(tx, PARIWAR_A, memberId, BEFORE, { info: () => {} });
    expect(scheduled.candidates.map((c) => c.survey.surveyId)).not.toContain(row.surveyId);
    const expired = await listOpenSurveysForMember(tx, PARIWAR_A, memberId, UNTIL, { info: () => {} });
    expect(expired.candidates.map((c) => c.survey.surveyId)).not.toContain(row.surveyId);
  });

  it('the member read reports next_offset — pagination added (code review of 10-15-survey-poll, 2026-08-17)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const memberId = await toMemberId(await seedMember(tx, PARIWAR_A, { state: 'active' }));
    await publishedSurvey(tx, PARIWAR_A);
    await publishedSurvey(tx, PARIWAR_A);
    await publishedSurvey(tx, PARIWAR_A);

    const firstPage = await listOpenSurveysForMember(tx, PARIWAR_A, memberId, MID, { info: () => {} }, null, { limit: 2 });
    expect(firstPage.candidates).toHaveLength(2);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.consumed).toBe(2);

    const secondPage = await listOpenSurveysForMember(tx, PARIWAR_A, memberId, MID, { info: () => {} }, null, {
      limit: 2,
      offset: firstPage.consumed,
    });
    expect(secondPage.candidates).toHaveLength(1);
    expect(secondPage.hasMore).toBe(false);

    const firstIds = firstPage.candidates.map((c) => c.survey.surveyId);
    const secondIds = secondPage.candidates.map((c) => c.survey.surveyId);
    expect(firstIds.filter((id) => secondIds.includes(id))).toHaveLength(0); // no overlap across pages
  });
});

// ⭐ AC8's ONE AUTHORITY: the fan-out audience is resolved by feeding the SAME predicate the read
// uses. This is also the guard against [[project_epic6_drizzle_correlated_subquery_bug]] — a
// correlation collapsed into a tautology would put BOTH members in the audience (or neither), and no
// DB-free unit test could catch it.
describe.skipIf(!hasDatabase)('surveys — the fan-out audience (AC8)', () => {
  setupLiveDb();

  async function seedTree(client: Parameters<typeof enterAppScope>[0], tx: Parameters<typeof createDraft>[0]) {
    await createGeoTreeVersion(tx, { pariwarId: PARIWAR_A, nodes: GEO_TREE, effectiveAt: BEFORE });
    void client;
    return loadGeoTree(tx, PARIWAR_A, MID);
  }

  it('members-all reaches every active member', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const m1 = await toMemberId(await seedMember(tx, PARIWAR_A, { state: 'active' }));
    const m2 = await toMemberId(await seedMember(tx, PARIWAR_A, { state: 'active' }));
    const ids = await resolveSurveyAudienceMemberIds(tx, PARIWAR_A, 'members-all', null, { tree: null, now: MID });
    expect(ids).toContain(m1);
    expect(ids).toContain(m2);
  });

  it('state DISCRIMINATES — the Bihar member is in, the UP member is out', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const bihar = await toMemberId(await seedMember(tx, PARIWAR_A, { state: 'active' }));
    const up = await toMemberId(await seedMember(tx, PARIWAR_A, { state: 'active' }));
    await seedMemberPosting(tx, PARIWAR_A, bihar, 'Patna', { createdAt: POSTED });
    await seedMemberPosting(tx, PARIWAR_A, up, 'Lucknow', { createdAt: POSTED });
    const tree = await seedTree(client, tx);

    const ids = await resolveSurveyAudienceMemberIds(tx, PARIWAR_A, 'state', 'Bihar', { tree, now: MID }, { info: () => {} });
    expect(ids).toContain(bihar);
    expect(ids).not.toContain(up);
  });

  it('a member with NO posting row is in NO state audience — fail-closed, never in all of them', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const nowhere = await toMemberId(await seedMember(tx, PARIWAR_A, { state: 'active' }));
    const tree = await seedTree(client, tx);
    const ids = await resolveSurveyAudienceMemberIds(tx, PARIWAR_A, 'state', 'Bihar', { tree, now: MID }, { info: () => {} });
    expect(ids).not.toContain(nowhere);
  });

  it('a state-scoped survey with NO published tree reaches NOBODY — ⛔ never a members-all fallback', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const m1 = await toMemberId(await seedMember(tx, PARIWAR_A, { state: 'active' }));
    await seedMemberPosting(tx, PARIWAR_A, m1, 'Patna', { createdAt: POSTED });
    const ids = await resolveSurveyAudienceMemberIds(tx, PARIWAR_A, 'state', 'Bihar', { tree: null, now: MID }, { info: () => {} });
    expect(ids).toEqual([]);
  });

  it('public / role / cohort resolve to the EMPTY audience through the predicate', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await toMemberId(await seedMember(tx, PARIWAR_A, { state: 'active' }));
    for (const scope of ['public', 'role', 'cohort'] as const) {
      const ids = await resolveSurveyAudienceMemberIds(tx, PARIWAR_A, scope, 'x', { tree: null, now: MID }, { info: () => {} });
      expect(ids).toEqual([]);
    }
  });
});
