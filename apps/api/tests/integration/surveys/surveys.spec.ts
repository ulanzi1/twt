// Survey/Poll admin + member surfaces — E2E (Story 10.15; AC1/AC2/AC4/AC5/AC6/AC7/AC9). (:5433)
//
// Proves both surfaces against real Postgres:
//   · AC9 RBAC revert-sanity PAIR — pariwar_admin (holds survey.manage) → 200 on the list; an auditor
//     (Pariwar grant, NO key) → fail-closed 403; district_admin → 403 (DEFERRED, never granted).
//   · AC1 workflow — create (201) → publish (200) → close (200); an illegal transition (re-publish a
//     published survey, act on a closed one) → typed 409 BEFORE any write (a no-op never 200s).
//   · AC4 tone gate — publish BY the survey's own author → 409 with the status unchanged; publish by
//     a NON-author → 200. A missing Hindi field → 422 at publish. ⭐ The LBD-5 FREEZE: a post-publish
//     edit of a frozen field → 409 NAMING it; extending `valid_until` → 200; shortening → 422.
//   · AC5 — `public` is rejected at the write path with a 422 (⚠ the OPPOSITE of banners).
//   · AC6 member surface — the open-survey read, ⭐ the one-response-per-member 409, the
//     `Idempotency-Key` REPLAY returning the original 201 (a DIFFERENT outcome from the 409), and
//     404-not-403 on a foreign `:pariwarId`.
//   · AC7 — the aggregate carries no member id, and the free-text read is unattributed.
//
// ⚠ Own-committing seed writes; a fresh random pariwarId per test; users/role_grants cleaned in
// afterAll. Assert MEMBERSHIP, not counts ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import * as service from '../../../src/modules/auth/admin/admin-auth.service.js';
import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { createTestApp, hasDatabase, makeClient, teardown, type TestApp } from '../_setup.js';
import { FakeWebAuthnProvider } from '../_webauthn-fake.js';

type Client = ReturnType<typeof makeClient>;
type Json = Record<string, unknown>;

const ACCESS_TTL_MS = 15 * 60 * 1000;

// A window comfortably OPEN at real wall-clock `now` — the handlers inject `deps.clock()`, which is
// the real clock in the test app, so the fixture window must straddle it rather than pin an instant.
const OPEN_FROM = new Date(Date.now() - 60 * 60 * 1000).toISOString();
const OPEN_UNTIL = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
const LATER_UNTIL = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
const EARLIER_UNTIL = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
// A window that has not started yet — used for the `scheduled` derived state.
const FUTURE_FROM = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const FUTURE_UNTIL = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

const Q_CHOICE = '00000000-0000-4000-8000-0000000000c1';
const Q_TEXT = '00000000-0000-4000-8000-0000000000f1';
const OPT_A = '00000000-0000-4000-8000-00000000000a';
const OPT_B = '00000000-0000-4000-8000-00000000000b';

describe.skipIf(!hasDatabase)('survey/poll admin + member surfaces — E2E (:5433)', () => {
  let t: TestApp;
  let deps: AppDeps;
  let fakeWebauthn: FakeWebAuthnProvider;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    fakeWebauthn = new FakeWebAuthnProvider();
    t = await createTestApp({ webauthn: fakeWebauthn });
    deps = t.deps;
  });

  afterAll(async () => {
    const c = await t.pool.connect();
    try {
      if (createdUserIds.length > 0) {
        await c.query(`DELETE FROM admin_sessions WHERE sess ->> 'userId' = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [createdUserIds]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [createdUserIds]);
      }
    } finally {
      c.release();
    }
    await teardown(t);
  });

  async function authenticate(displayName: string): Promise<{ client: Client; userId: string }> {
    const email = `survey-${randomUUID()}@example.test`;
    const password = 'CorrectHorseBatteryStaple9';
    const userId = await service.createAdminAccount(deps, { email, password, displayName });
    createdUserIds.push(userId);
    const credentialId = `cred-${userId}`;
    fakeWebauthn.nextRegistration = { verified: true, credential: { id: credentialId, publicKey: 'pk', counter: 0 } };
    fakeWebauthn.nextAuthentication = { verified: true, newCounter: 1 };
    const client = makeClient(t.app);
    const enroll = service.mintEnrollmentToken(deps, userId);
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/options', payload: { enrollmentToken: enroll } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/register/verify', payload: { response: { id: 'b' }, enrollmentToken: enroll } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/options', payload: {} });
    const verify = await client.inject({ method: 'POST', url: '/api/v1/auth/passkey/authenticate/verify', payload: { response: { id: credentialId } } });
    expect(verify.statusCode).toBe(200);
    return { client, userId };
  }

  async function grant(userId: string, pariwarId: string, role: string, dimension = 'pariwar'): Promise<void> {
    const c = await t.pool.connect();
    try {
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value) VALUES ($1, $2, $3, $4, $5)`,
        [userId, pariwarId, role, dimension, dimension === 'pariwar' ? pariwarId : 'Patna'],
      );
    } finally {
      c.release();
    }
  }

  /** Two DISTINCT pariwar_admins in one tenant — the tone gate needs a non-author publisher. */
  async function twoAdmins(pariwarId: string): Promise<{ author: Client; reviewer: Client }> {
    const a = await authenticate('Survey Author');
    const b = await authenticate('Survey Reviewer');
    await grant(a.userId, pariwarId, 'pariwar_admin');
    await grant(b.userId, pariwarId, 'pariwar_admin');
    return { author: a.client, reviewer: b.client };
  }

  async function seedMember(pariwarId: string): Promise<string> {
    const memberId = randomUUID();
    const c = await t.pool.connect();
    try {
      await c.query(
        `INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`,
        [memberId, pariwarId],
      );
    } finally {
      c.release();
    }
    return memberId;
  }

  function surveyBody(overrides: Partial<Json> = {}): Json {
    return {
      title: 'Meeting day',
      body: 'Tell us which day suits you.',
      title_hi: 'बैठक का दिन',
      body_hi: 'हमें बताइए कि कौन सा दिन ठीक रहेगा।',
      questions: [
        {
          question_id: Q_CHOICE,
          question_text: 'Which day suits the meeting?',
          question_text_hi: 'बैठक के लिए कौन सा दिन ठीक रहेगा?',
          type: 'single_choice',
          options: [
            { option_id: OPT_A, option_text: 'Saturday', option_text_hi: 'शनिवार' },
            { option_id: OPT_B, option_text: 'Sunday', option_text_hi: 'रविवार' },
          ],
        },
        { question_id: Q_TEXT, question_text: 'Anything else?', question_text_hi: 'और कुछ?', type: 'free_text' },
      ],
      audience_scope: 'members-all',
      valid_from: OPEN_FROM,
      valid_until: OPEN_UNTIL,
      ...overrides,
    };
  }

  async function createSurvey(client: Client, p: string, overrides: Partial<Json> = {}): Promise<string> {
    const res = await client.inject({ method: 'POST', url: `/api/v1/p/${p}/surveys`, payload: surveyBody(overrides) });
    expect(res.statusCode).toBe(201);
    return (res.json() as { survey_id: string }).survey_id;
  }

  /** Create as the author, publish as the reviewer (the non-author the tone gate requires). */
  async function publishedSurvey(
    admins: { author: Client; reviewer: Client },
    p: string,
    overrides: Partial<Json> = {},
  ): Promise<string> {
    const id = await createSurvey(admins.author, p, overrides);
    const res = await admins.reviewer.inject({ method: 'POST', url: `/api/v1/p/${p}/surveys/${id}/publish`, payload: {} });
    expect(res.statusCode).toBe(200);
    return id;
  }

  function memberToken(memberId: string, pariwarId: string): string {
    return signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
  }

  function safeJson(res: { json: () => unknown }): Json {
    try {
      return res.json() as Json;
    } catch {
      return {};
    }
  }

  async function memberSurveys(tok: string, p: string): Promise<{ status: number; body: Json }> {
    const res = await t.app.inject({
      method: 'GET',
      url: `/api/v1/p/${p}/member/surveys`,
      headers: { authorization: `Bearer ${tok}`, origin: 'http://localhost:3001' },
    });
    return { status: res.statusCode, body: safeJson(res) };
  }

  const FULL_ANSWERS = [
    { question_id: Q_CHOICE, selected_option_ids: [OPT_A] },
    { question_id: Q_TEXT, answer_text: 'please give more notice' },
  ];

  async function submit(
    tok: string,
    p: string,
    surveyId: string,
    idempotencyKey: string,
    answers: unknown = FULL_ANSWERS,
  ): Promise<{ status: number; body: Json }> {
    const res = await t.app.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/member/surveys/${surveyId}/responses`,
      payload: { answers },
      headers: {
        authorization: `Bearer ${tok}`,
        origin: 'http://localhost:3001',
        'x-turnstile-token': 'test-token',
        'idempotency-key': idempotencyKey,
      },
    });
    return { status: res.statusCode, body: safeJson(res) };
  }

  // ── AC9: the RBAC revert-sanity PAIR ────────────────────────────────────────
  describe('AC9 — survey.manage gates the admin surface', () => {
    it('pariwar_admin (holds survey.manage) → 200; auditor (Pariwar grant, NO key) → 403', async () => {
      const p = randomUUID();
      const admin = await authenticate('Survey Admin');
      await grant(admin.userId, p, 'pariwar_admin');
      const auditor = await authenticate('Survey Auditor');
      await grant(auditor.userId, p, 'auditor');

      const ok = await admin.client.inject({ method: 'GET', url: `/api/v1/p/${p}/surveys` });
      expect(ok.statusCode).toBe(200);
      // Fail-closed: a Pariwar-scoped grant that does not carry the key is denied, not defaulted.
      const denied = await auditor.client.inject({ method: 'GET', url: `/api/v1/p/${p}/surveys` });
      expect(denied.statusCode).toBe(403);
    });

    // ⭐ district_admin is DEFERRED, and this is what makes the deferral REAL rather than a comment: a
    // district-ceiling grant can never satisfy a pariwar-dimension check, so seeding one would be an
    // inert capability ([[project_rbac_geo_scope_containment]]).
    it('district_admin → 403 — the grant is never seeded, and would be inert if it were', async () => {
      const p = randomUUID();
      const da = await authenticate('District Admin');
      await grant(da.userId, p, 'district_admin', 'district');
      const res = await da.client.inject({ method: 'GET', url: `/api/v1/p/${p}/surveys` });
      expect(res.statusCode).toBe(403);
    });
  });

  // ── AC1/AC4: the workflow + the tone gate ───────────────────────────────────
  describe('AC1/AC4 — the workflow, the tone gate, and the legality guard', () => {
    it('create (201) → publish by a NON-author (200) → close (200)', async () => {
      const p = randomUUID();
      const admins = await twoAdmins(p);
      const id = await createSurvey(admins.author, p);

      const published = await admins.reviewer.inject({ method: 'POST', url: `/api/v1/p/${p}/surveys/${id}/publish`, payload: {} });
      expect(published.statusCode).toBe(200);
      expect((published.json() as Json)['status']).toBe('published');
      // The sign-off is a HASH, never the copy or the questions.
      expect(String((published.json() as Json)['tone_signoff_content_hash'])).toMatch(/^[0-9a-f]{64}$/);

      const closed = await admins.reviewer.inject({ method: 'POST', url: `/api/v1/p/${p}/surveys/${id}/close`, payload: {} });
      expect(closed.statusCode).toBe(200);
      expect((closed.json() as Json)['status']).toBe('closed');
    });

    it('publish BY the survey’s own author → 409, with the status UNCHANGED', async () => {
      const p = randomUUID();
      const admins = await twoAdmins(p);
      const id = await createSurvey(admins.author, p);

      const denied = await admins.author.inject({ method: 'POST', url: `/api/v1/p/${p}/surveys/${id}/publish`, payload: {} });
      expect(denied.statusCode).toBe(409);
      // ⭐ A deny must not half-apply: re-read and confirm the survey is still a draft.
      const after = await admins.author.inject({ method: 'GET', url: `/api/v1/p/${p}/surveys/${id}` });
      expect((after.json() as Json)['status']).toBe('draft');
    });

    it('an illegal transition is a typed 409 BEFORE any write', async () => {
      const p = randomUUID();
      const admins = await twoAdmins(p);
      const id = await publishedSurvey(admins, p);

      const rePublish = await admins.reviewer.inject({ method: 'POST', url: `/api/v1/p/${p}/surveys/${id}/publish`, payload: {} });
      expect(rePublish.statusCode).toBe(409);

      await admins.reviewer.inject({ method: 'POST', url: `/api/v1/p/${p}/surveys/${id}/close`, payload: {} });
      // `closed` is TERMINAL — no reopen, and no further close.
      const reClose = await admins.reviewer.inject({ method: 'POST', url: `/api/v1/p/${p}/surveys/${id}/close`, payload: {} });
      expect(reClose.statusCode).toBe(409);
    });

    it('a missing Hindi field is a 422 at publish (FR-68), and a zero-question survey too', async () => {
      const p = randomUUID();
      const admins = await twoAdmins(p);

      const noHindi = await createSurvey(admins.author, p, { title_hi: null });
      const r1 = await admins.reviewer.inject({ method: 'POST', url: `/api/v1/p/${p}/surveys/${noHindi}/publish`, payload: {} });
      expect(r1.statusCode).toBe(422);

      const noQuestions = await createSurvey(admins.author, p, { questions: [] });
      const r2 = await admins.reviewer.inject({ method: 'POST', url: `/api/v1/p/${p}/surveys/${noQuestions}/publish`, payload: {} });
      expect(r2.statusCode).toBe(422);
    });

    it('the derived-display-state filter separates scheduled from open', async () => {
      const p = randomUUID();
      const admins = await twoAdmins(p);
      const open = await publishedSurvey(admins, p);
      const scheduled = await publishedSurvey(admins, p, { valid_from: FUTURE_FROM, valid_until: FUTURE_UNTIL });

      const res = await admins.author.inject({ method: 'GET', url: `/api/v1/p/${p}/surveys?display_state=open` });
      const ids = (res.json() as { items: { survey_id: string }[] }).items.map((s) => s.survey_id);
      expect(ids).toContain(open);
      expect(ids).not.toContain(scheduled);
    });
  });

  // ── AC4: ⭐ the LBD-5 post-publish freeze ───────────────────────────────────
  describe('AC4 — the post-publish freeze', () => {
    it('a frozen field is a 409 NAMING it', async () => {
      const p = randomUUID();
      const admins = await twoAdmins(p);
      const id = await publishedSurvey(admins, p);

      const res = await admins.author.inject({
        method: 'PATCH',
        url: `/api/v1/p/${p}/surveys/${id}`,
        payload: { questions: [] },
      });
      expect(res.statusCode).toBe(409);
      const details = (safeJson(res)['error'] as Json | undefined)?.['details'] as Json | undefined;
      expect(details?.['frozen_fields']).toContain('questions');
    });

    it('EXTENDING valid_until is the one permitted mutation (200); SHORTENING is a 422', async () => {
      const p = randomUUID();
      const admins = await twoAdmins(p);
      const id = await publishedSurvey(admins, p);

      const extended = await admins.author.inject({
        method: 'PATCH',
        url: `/api/v1/p/${p}/surveys/${id}`,
        payload: { valid_until: LATER_UNTIL },
      });
      expect(extended.statusCode).toBe(200);

      // ⭐ 422, not 409 — the DIRECTION is wrong, not the field's mutability; the message points at
      // `close`, the transition that exists for stopping collection.
      const shortened = await admins.author.inject({
        method: 'PATCH',
        url: `/api/v1/p/${p}/surveys/${id}`,
        payload: { valid_until: EARLIER_UNTIL },
      });
      expect(shortened.statusCode).toBe(422);
    });
  });

  // ── AC5: ⭐ the LBD-7 inversion at the write path ───────────────────────────
  it('AC5 — `public` is REJECTED at create with a 422 (⚠ the OPPOSITE of banners)', async () => {
    const p = randomUUID();
    const admin = await authenticate('Survey Admin');
    await grant(admin.userId, p, 'pariwar_admin');
    const res = await admin.client.inject({
      method: 'POST',
      url: `/api/v1/p/${p}/surveys`,
      payload: surveyBody({ audience_scope: 'public' }),
    });
    expect(res.statusCode).toBe(422);
  });

  // ── AC6: the member surface ─────────────────────────────────────────────────
  describe('AC6 — the member surface', () => {
    it('returns the open survey, then flags it answered after a submit', async () => {
      const p = randomUUID();
      const admins = await twoAdmins(p);
      const id = await publishedSurvey(admins, p);
      const memberId = await seedMember(p);
      const tok = memberToken(memberId, p);

      const before = await memberSurveys(tok, p);
      expect(before.status).toBe(200);
      const items = before.body['items'] as { survey_id: string; answered: boolean }[];
      expect(items.find((s) => s.survey_id === id)?.answered).toBe(false);
      // ⛔ The member DTO must never carry the threshold or the status (LBD-1).
      expect(items[0]).not.toHaveProperty('response_threshold');
      expect(items[0]).not.toHaveProperty('status');

      const posted = await submit(tok, p, id, randomUUID());
      expect(posted.status).toBe(201);

      // ⭐ STILL RETURNED, flagged answered — not filtered out.
      const after = await memberSurveys(tok, p);
      const afterItems = after.body['items'] as { survey_id: string; answered: boolean }[];
      expect(afterItems.find((s) => s.survey_id === id)?.answered).toBe(true);
    });

    // ⭐ THE TWO 409-vs-201 OUTCOMES THAT MUST NOT BE COLLAPSED.
    it('a SECOND submission is a 409, while a REPLAY of the same Idempotency-Key returns the original 201', async () => {
      const p = randomUUID();
      const admins = await twoAdmins(p);
      const id = await publishedSurvey(admins, p);
      const memberId = await seedMember(p);
      const tok = memberToken(memberId, p);

      const key = randomUUID();
      const first = await submit(tok, p, id, key);
      expect(first.status).toBe(201);

      // Same key → the ORIGINAL result, not an error. One member submitting once over a flaky network.
      const replay = await submit(tok, p, id, key);
      expect(replay.status).toBe(201);
      expect(replay.body['submitted_at']).toBe(first.body['submitted_at']);

      // A NEW key → a genuine second submission → 409. One member submitting twice.
      const second = await submit(tok, p, id, randomUUID());
      expect(second.status).toBe(409);
    });

    it('a foreign :pariwarId is a 404, NOT a 403', async () => {
      const p = randomUUID();
      const other = randomUUID();
      const admins = await twoAdmins(p);
      await publishedSurvey(admins, p);
      const memberId = await seedMember(p);
      const tok = memberToken(memberId, p);

      // A 403 would confirm the tenant exists — exactly what a cross-tenant probe is looking for.
      const res = await memberSurveys(tok, other);
      expect(res.status).toBe(404);
    });

    it('an invalid answer set is a 422 naming the offending question_id', async () => {
      const p = randomUUID();
      const admins = await twoAdmins(p);
      const id = await publishedSurvey(admins, p);
      const memberId = await seedMember(p);
      const tok = memberToken(memberId, p);

      const res = await submit(tok, p, id, randomUUID(), [
        { question_id: Q_CHOICE, selected_option_ids: [OPT_A] },
        // q3 (the free-text question) is missing entirely.
      ]);
      expect(res.status).toBe(422);
      const details = (res.body['error'] as Json | undefined)?.['details'] as Json | undefined;
      expect(details?.['question_id']).toBe(Q_TEXT);
    });

    it('a missing Idempotency-Key or Turnstile header is a 400', async () => {
      const p = randomUUID();
      const admins = await twoAdmins(p);
      const id = await publishedSurvey(admins, p);
      const memberId = await seedMember(p);
      const tok = memberToken(memberId, p);

      const noKey = await t.app.inject({
        method: 'POST',
        url: `/api/v1/p/${p}/member/surveys/${id}/responses`,
        payload: { answers: FULL_ANSWERS },
        headers: { authorization: `Bearer ${tok}`, origin: 'http://localhost:3001', 'x-turnstile-token': 'tok' },
      });
      expect(noKey.statusCode).toBe(400);

      const noTurnstile = await t.app.inject({
        method: 'POST',
        url: `/api/v1/p/${p}/member/surveys/${id}/responses`,
        payload: { answers: FULL_ANSWERS },
        headers: { authorization: `Bearer ${tok}`, origin: 'http://localhost:3001', 'idempotency-key': randomUUID() },
      });
      expect(noTurnstile.statusCode).toBe(400);
    });
  });

  // ── AC7: ⛔ the PII shield, over the wire ───────────────────────────────────
  describe('AC7 — the aggregate and the free-text read carry no member identity', () => {
    it('the aggregate returns counts and NO member id anywhere in the payload', async () => {
      const p = randomUUID();
      const admins = await twoAdmins(p);
      const id = await publishedSurvey(admins, p, { response_threshold: 1 });
      const memberId = await seedMember(p);
      await submit(memberToken(memberId, p), p, id, randomUUID());

      const res = await admins.author.inject({ method: 'GET', url: `/api/v1/p/${p}/surveys/${id}/aggregate` });
      expect(res.statusCode).toBe(200);
      const raw = res.body;
      expect(raw).not.toContain(memberId);
      const body = res.json() as Json;
      expect(body['response_count']).toBe(1);
      // ⚠ INFORMATIONAL only — it gates nothing (LBD-1).
      expect(body['threshold_met']).toBe(true);
      // Every declared option present, including at zero.
      const q = (body['questions'] as { option_counts: { option_id: string; count: number }[] }[])[0]!;
      expect(q.option_counts.map((o) => o.option_id)).toEqual([OPT_A, OPT_B]);
    });

    it('the free-text read is UNATTRIBUTED — exactly {answer_text, submitted_at}', async () => {
      const p = randomUUID();
      const admins = await twoAdmins(p);
      const id = await publishedSurvey(admins, p);
      const memberId = await seedMember(p);
      await submit(memberToken(memberId, p), p, id, randomUUID());

      const res = await admins.author.inject({
        method: 'GET',
        url: `/api/v1/p/${p}/surveys/${id}/questions/${Q_TEXT}/free-text`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).not.toContain(memberId);
      const items = (res.json() as { items: Json[] }).items;
      expect(items.map((a) => a['answer_text'])).toContain('please give more notice');
      for (const a of items) {
        // No member id, no row id, no ordinal, no question echo — every absence deliberate.
        expect(Object.keys(a).sort()).toEqual(['answer_text', 'submitted_at']);
      }
    });
  });
});
