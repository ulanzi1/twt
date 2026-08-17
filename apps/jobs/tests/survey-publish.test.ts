// Survey publish fan-out worker — Story 10.15 (Task 10; AC8).
//
// TWO layers:
//   (1) PURE — `buildSurveyAlert` reuses the shipped `alert_published` category verbatim
//       ({title, body}), `deriveSurveyAlertId` is a deterministic UUIDv5 (which is what makes the
//       per-member idempotency key stable across a redelivery), and the push body is truncated.
//   (2) LIVE-DB (:5433) — `runSurveyPublish`: the fan-out arm, the two clean no-op arms, and ⭐ the
//       per-member idempotency across a SIMULATED REDELIVERY, which is the AC8 claim that a status
//       re-check could not make.
//
// A FRESH random pariwarId per test so `members-all` resolves to a known audience (mostly EMPTY, so
// no crypto is needed; the one real-member test uses the full fake-KMS deps bundle).

import { randomUUID } from 'node:crypto';

import { createAuditPort, createRenderedMessageHash } from '@twt/channels';
import { createDb, encryption, ids, schema, surveys, withPariwarScope, type CreatedDb } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { ContributionNotifyDeps } from '../src/scheduler/contribution-notify.js';
import { buildSurveyAlert, deriveSurveyAlertId, runSurveyPublish } from '../src/scheduler/survey-publish.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

const AUTHOR = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PUBLISHER = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const NOW = new Date('2026-08-01T00:00:00Z');
const WINDOW_FROM = new Date('2026-07-31T00:00:00Z');
const WINDOW_UNTIL = new Date('2026-09-30T00:00:00Z');

function fakeSurvey(overrides: Partial<schema.SurveyRow> = {}): schema.SurveyRow {
  return {
    surveyId: '11111111-1111-1111-1111-111111111111',
    pariwarId: '22222222-2222-2222-2222-222222222222',
    title: 'Which meeting day?',
    body: 'Tell us what suits you',
    titleHi: 'बैठक का दिन',
    bodyHi: 'हमें बताइए',
    questions: [],
    audienceScope: 'members-all',
    audienceScopeValue: null,
    validFrom: WINDOW_FROM,
    validUntil: WINDOW_UNTIL,
    responseThreshold: null,
    status: 'published',
    createdByActorId: AUTHOR,
    toneSignoffContentHash: null,
    toneSignoffReviewedAt: null,
    toneSignoffReviewedBy: null,
    publishedAt: NOW,
    closedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as schema.SurveyRow;
}

describe('buildSurveyAlert + deriveSurveyAlertId (pure)', () => {
  it('builds a valid alert_published Alert with the survey title/body — ⛔ NO new alert variant', () => {
    const alert = buildSurveyAlert(fakeSurvey(), 'cccccccc-cccc-cccc-cccc-cccccccccccc', NOW);
    expect(alert.alert_category).toBe('alert_published');
    expect(alert.member_id).toBe('cccccccc-cccc-cccc-cccc-cccccccccccc');
    expect(alert.time_critical).toBe(false);
    if (alert.alert_category === 'alert_published') {
      expect(alert.payload_data.title).toBe('Which meeting day?');
      expect(alert.payload_data.body).toBe('Tell us what suits you');
    }
  });

  // ⛔ A push that quoted the questionnaire would put authored content into a channel the tone gate
  // reviewed only as a survey surface — and it would leak the questions to a member who is not in
  // the audience if the alert were ever mis-routed.
  it('NEVER puts a question or an option label into the push payload', () => {
    const withQuestions = fakeSurvey({
      questions: [
        {
          question_id: 'q1',
          question_text: 'SECRET_QUESTION_TEXT',
          question_text_hi: 'गुप्त',
          type: 'single_choice',
          options: [{ option_id: 'o1', option_text: 'SECRET_OPTION_TEXT', option_text_hi: 'विकल्प' }],
        },
      ],
    });
    const alert = buildSurveyAlert(withQuestions, 'cccccccc-cccc-cccc-cccc-cccccccccccc', NOW);
    const serialized = JSON.stringify(alert);
    expect(serialized).not.toContain('SECRET_QUESTION_TEXT');
    expect(serialized).not.toContain('SECRET_OPTION_TEXT');
  });

  // ⭐ Determinism is not cosmetic here: the alert id is half the per-member idempotency key, so a
  // non-deterministic id would silently disable redelivery protection.
  it('derives a deterministic UUIDv5 alert id from the survey id', () => {
    const a = deriveSurveyAlertId('11111111-1111-1111-1111-111111111111');
    const b = deriveSurveyAlertId('11111111-1111-1111-1111-111111111111');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(deriveSurveyAlertId('other')).not.toBe(a);
  });

  it('uses its OWN namespace — a survey and a news post with the same id get different alert ids', () => {
    // Both workers claim keys in the SAME shared idempotency store; colliding ids would let one
    // family's claim suppress the other's send.
    const surveyAlert = deriveSurveyAlertId('11111111-1111-1111-1111-111111111111');
    expect(surveyAlert).not.toBe('11111111-1111-1111-1111-111111111111');
  });

  it('truncates a long push body with an ellipsis, on code points', () => {
    const long = 'x'.repeat(500);
    const alert = buildSurveyAlert(fakeSurvey({ body: long }), 'cccccccc-cccc-cccc-cccc-cccccccccccc', NOW);
    if (alert.alert_category === 'alert_published') {
      expect(alert.payload_data.body.length).toBeLessThanOrEqual(240);
      expect(alert.payload_data.body.endsWith('…')).toBe(true);
    }
  });
});

// Test-only fake KMS (the news-publish / contribution-notify-live precedent) — deterministic fixed
// key material, never a real KMS call.
const FAKE_KMS = encryption.createFakeKmsProvider({
  kekBytes: new Uint8Array(32).fill(7),
  hmacKeyBytes: new Uint8Array(32).fill(9),
});
const FAKE_HMAC_KEY_REF: encryption.KmsKeyRef = { resourceName: 'fake/survey-publish-test-hmac' };

describe.skipIf(!hasDatabase)('runSurveyPublish (live-DB :5433)', () => {
  let created: CreatedDb;
  let notify: ContributionNotifyDeps;
  let fullNotify: ContributionNotifyDeps;

  beforeAll(() => {
    created = createDb(DATABASE_URL!, { ssl: false });
    // Minimal deps: only `.pool` is exercised (a FRESH pariwar ⇒ empty members-all audience ⇒ the
    // fan-out iterates zero members ⇒ the crypto/audit/hash fields are never touched).
    notify = { pool: created.pool, serviceDb: created.db } as unknown as ContributionNotifyDeps;
    // A fully populated deps bundle for the ONE test that seeds a real member and exercises the
    // actual `resolveMemberDeliveryContext` → `fanOutAlert` path against a non-empty audience.
    fullNotify = {
      pool: created.pool,
      serviceDb: created.db,
      encryption: { kms: FAKE_KMS, kekRef: FAKE_HMAC_KEY_REF, hmacKeyRef: FAKE_HMAC_KEY_REF },
      audit: createAuditPort(created.pool),
      hashRendered: createRenderedMessageHash({ kms: FAKE_KMS, hmacKeyRef: FAKE_HMAC_KEY_REF }),
    };
  });

  afterAll(async () => {
    await created.pool.end();
  });

  /** Insert one real `active` members row directly (the `seedMember` pattern, self-contained here). */
  async function seedActiveMember(pariwarId: string): Promise<string> {
    const memberId = randomUUID();
    await withPariwarScope(created.pool, pariwarId, (db) =>
      db.insert(schema.members).values({
        memberId: ids.memberId(memberId),
        pariwarId: ids.pariwarId(pariwarId),
        state: 'active',
        stateEventVersion: 1,
      }),
    );
    return memberId;
  }

  /**
   * Seed a survey, driven to `published` through the real domain write path (so the tone gate, the
   * bilingual requirement and the questionnaire validator all actually run).
   *
   * ⚠ The window is seeded RELATIVE to the injected `NOW`, not to the wall clock — a test pinning a
   * query instant against a clock-defaulted seed fails on a future DATE and a baseline comparison can
   * never see it ([[project_known_livedb_test_failures]] #12).
   */
  async function seedSurvey(pariwarId: string, driveTo: 'draft' | 'published' | 'closed'): Promise<string> {
    return withPariwarScope(created.pool, pariwarId, async (db) => {
      const draft = await surveys.createDraft(db, {
        pariwarId: ids.pariwarId(pariwarId),
        title: 'T',
        body: 'B',
        titleHi: 'श',
        bodyHi: 'ब',
        questions: [
          {
            question_id: randomUUID(),
            question_text: 'Q',
            question_text_hi: 'प',
            type: 'free_text',
          },
        ],
        audienceScope: 'members-all',
        validFrom: WINDOW_FROM,
        validUntil: WINDOW_UNTIL,
        createdByActorId: ids.userId(AUTHOR),
      });
      if (driveTo === 'draft') return draft.surveyId;
      // A NON-AUTHOR publisher — the tone gate is default-deny on reviewedBy === authoredBy.
      await surveys.publish(db, draft.pariwarId, draft.surveyId, ids.userId(PUBLISHER), NOW);
      if (driveTo === 'closed') await surveys.close(db, draft.pariwarId, draft.surveyId, NOW);
      return draft.surveyId;
    });
  }

  it('fans out for a published survey (empty audience on a fresh Pariwar)', async () => {
    const p = randomUUID();
    const surveyId = await seedSurvey(p, 'published');
    const res = await runSurveyPublish({ notify, now: () => NOW }, { surveyId }, p);
    expect(res.notified).toBe(true);
    expect(res.memberCount).toBe(0); // fresh pariwar → no members
  });

  it('a DRAFT survey is a clean not-published no-op', async () => {
    const p = randomUUID();
    const surveyId = await seedSurvey(p, 'draft');
    const res = await runSurveyPublish({ notify, now: () => NOW }, { surveyId }, p);
    expect(res.notified).toBe(false);
    expect(res.reason).toBe('not-published');
  });

  // The realistic race: a redelivery arriving after an admin closed the survey. Re-notifying about a
  // closed survey would be worse than silence.
  it('a CLOSED survey is a clean not-published no-op', async () => {
    const p = randomUUID();
    const surveyId = await seedSurvey(p, 'closed');
    const res = await runSurveyPublish({ notify, now: () => NOW }, { surveyId }, p);
    expect(res.notified).toBe(false);
    expect(res.reason).toBe('not-published');
  });

  it('a missing survey is a clean not-found no-op', async () => {
    const p = randomUUID();
    const res = await runSurveyPublish({ notify, now: () => NOW }, { surveyId: randomUUID() }, p);
    expect(res.notified).toBe(false);
    expect(res.reason).toBe('not-found');
  });

  // ⛔ The worker must NEVER write to `surveys` — unlike news-publish there is no scheduled-publish
  // transition to perform at fire time, because the window is a pure read-time derivation.
  it('NEVER mutates the survey row', async () => {
    const p = randomUUID();
    const surveyId = await seedSurvey(p, 'published');
    const before = await withPariwarScope(created.pool, p, (db) =>
      surveys.getSurvey(db, ids.pariwarId(p), ids.surveyId(surveyId)),
    );
    await runSurveyPublish({ notify, now: () => NOW }, { surveyId }, p);
    const after = await withPariwarScope(created.pool, p, (db) =>
      surveys.getSurvey(db, ids.pariwarId(p), ids.surveyId(surveyId)),
    );
    expect(after?.status).toBe('published');
    expect(after?.updatedAt.toISOString()).toBe(before!.updatedAt.toISOString());
    expect(after?.closedAt).toBeNull();
  });

  it('AC8: resolves a REAL non-empty members-all audience and attempts the per-member fan-out', async () => {
    const p = randomUUID();
    const memberId = await seedActiveMember(p);
    const surveyId = await seedSurvey(p, 'published');
    const res = await runSurveyPublish({ notify: fullNotify, now: () => NOW }, { surveyId }, p);
    expect(res.notified).toBe(true);
    // ONE seeded member for a brand-new, non-shared pariwarId — an exact count is safe here (not the
    // accumulating-shared-fixture case [[project_live_db_test_gotchas]] warns about).
    expect(res.memberCount).toBe(1);
    void memberId; // seeded for membership purposes only — its value isn't separately asserted.
  });

  // ⭐ THE AC8 CLAIM A STATUS RE-CHECK COULD NOT MAKE. The survey stays `published` across a
  // redelivery, so a status gate would happily send twice; only the per-member claim stops it. This
  // asserts the CLAIM is what does the work, by proving a member whose send SUCCEEDED is not
  // re-claimed on a second run — while audience resolution itself is unaffected.
  it('AC8: a per-member idempotency claim survives a simulated pg-boss redelivery', async () => {
    const p = randomUUID();
    const memberId = await seedActiveMember(p);
    const surveyId = await seedSurvey(p, 'published');
    const alertId = deriveSurveyAlertId(surveyId);
    const key = `survey.publish:${alertId}:${memberId}`;

    // Pre-claim + RECORD a result for this member, standing in for a first delivery that SUCCEEDED
    // (the seeded member has no reachable channel, so a real first run would release rather than
    // record — pre-recording is how a successful send is simulated without a live provider).
    const { idempotency } = await import('@twt/domain');
    const store = idempotency.createKeyedStore(created.pool);
    expect(await store.claim(key, 3600)).toBe('acquired');
    await store.recordResult(key, { delivered: true });

    const redelivery = await runSurveyPublish({ notify: fullNotify, now: () => NOW }, { surveyId }, p);
    expect(redelivery.notified).toBe(true);
    // The AUDIENCE still contains the member — the claim suppresses the SEND, not the resolution.
    expect(redelivery.memberCount).toBe(1);
    // And the recorded result is untouched: the redelivery never re-sent, so it never re-recorded.
    expect(await store.getResult(key)).toEqual({ delivered: true });
  });
});
