// "Did someone help you register?" — live DB (Story 3.15, Task 2.3; AC2, AC3, AC4).
//
// Drives `GET/POST /api/v1/member/signup/assisted-code` through `app.inject` with a real member session. Field workers are
// registered through the PUBLIC commands (`_field-worker-fixture.ts`) and their codes allocated through Story 13.2's API door,
// in COMMITTED transactions (the route opens its own) — so every leg mints a fresh `randomUUID()` Pariwar and `afterAll` removes
// that Pariwar's rows under `session_replication_role = 'replica'` (the codes table is append-only; 13.2 TR12).
// Every "nothing stored" assertion has a passing control beside it ([[feedback_assertion_after_savepoint_rollback_is_vacuous]]).

import { randomUUID } from 'node:crypto';

import { MemberAssistedCodeResponse } from '@twt/contracts';
import { ids, member as memberDomain } from '@twt/domain';
import type { FastifyRequest } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { signAccessToken, signPariwarSelect, signSignupContinuation } from '../../../src/modules/auth/member/tokens.js';
import { allocateAttributionCodeForRequest } from '../../../src/modules/field-worker/attribution-code-access.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import {
  actTestFieldWorker,
  approveTestFieldWorker,
  registerTestFieldWorker,
  terminateTestFieldWorker,
} from '../_field-worker-fixture.js';
import { waitForBlockedBy } from '../field-worker/_registration-harness.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

const ACCESS_TTL_MS = 15 * 60 * 1000;
const PATH = '/api/v1/member/signup/assisted-code';
type Json = Record<string, unknown>;

const fakeRequest = (pariwarId: string): FastifyRequest =>
  ({ requestContext: { traceId: 't-3-15', pariwarId } }) as unknown as FastifyRequest;

type WorkerState =
  | 'pending_kyc'
  | 'active'
  | 'suspended_under_review'
  | 'suspended_at_worker_request'
  | 'terminated_from_active'
  | 'terminated_from_pending_kyc'
  | 'terminated_from_suspended' // review P6 — `-493`: "ended (from any state)"
  | 'terminated_died'; // review P6 — `-493`: "or died" (an ending whose reason is the date of death)

describe.skipIf(!hasDatabase)('Story 3.15 — the signup assisted-code routes (live DB)', () => {
  let t: TestApp;
  const pariwars: string[] = [];

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    try {
      if (pariwars.length > 0) {
        const c = await t.pool.connect();
        try {
          await c.query('BEGIN');
          await c.query("SET LOCAL session_replication_role = 'replica'");
          await c.query('DELETE FROM member_attribution WHERE pariwar_id = ANY($1)', [pariwars]);
          await c.query(`DELETE FROM sms_send_deliveries WHERE send_kind = 'fw' AND pariwar_id = ANY($1)`, [pariwars]);
          await c.query('DELETE FROM field_worker_code_sms_sends WHERE pariwar_id = ANY($1)', [pariwars]);
          await c.query('DELETE FROM field_worker_attribution_codes WHERE pariwar_id = ANY($1)', [pariwars]);
          await c.query('DELETE FROM field_workers WHERE pariwar_id = ANY($1)', [pariwars]);
          await c.query('DELETE FROM members WHERE pariwar_id = ANY($1)', [pariwars]);
          await c.query('DELETE FROM events_log WHERE pariwar_id = ANY($1)', [pariwars]);
          await c.query('COMMIT');
        } catch (err) {
          await c.query('ROLLBACK');
          throw err;
        } finally {
          c.release();
        }
      }
    } finally {
      await teardown(t);
    }
  });

  function newPariwar(): string {
    const p = randomUUID();
    pariwars.push(p);
    return p;
  }

  /** A member in `pending-kyc` (`signup`), `pending-fee` (`kyc`) or `lock-in` (`paid`), committed. */
  async function seedMember(pariwarId: string, upTo: 'signup' | 'kyc' | 'paid' = 'kyc'): Promise<string> {
    const memberId = randomUUID();
    const seq: Array<[string, Json]> = [
      ['member.signup_initiated', { from_state: null, to_state: 'pending-kyc', trigger: 'signup', actor: 'member' }],
    ];
    if (upTo !== 'signup') {
      seq.push(['member.kyc_manual_fallback', { from_state: 'pending-kyc', to_state: 'pending-fee', trigger: 'kyc_manual', actor: 'member', reason: 'manual_fallback' }]);
    }
    if (upTo === 'paid') {
      seq.push(['member.vyawastha_shulk_paid', { from_state: 'pending-fee', to_state: 'lock-in', trigger: 'pay', actor: 'member', utr: 'TEST-UTR-0000', amount_inr: 110 }]);
    }
    const scopeTx = await openScopeTx(t.deps, pariwarId);
    let ok = false;
    try {
      for (const [eventType, payload] of seq) {
        await memberDomain.projectMemberState(scopeTx.client, {
          memberId: ids.memberId(memberId),
          pariwarId: ids.pariwarId(pariwarId),
          eventType: eventType as never,
          actorId: memberId,
          payload,
        });
      }
      ok = true;
    } finally {
      await closeScopeTx(scopeTx, ok);
    }
    return memberId;
  }

  /** A field worker in `state`, holding a code allocated at registration (F7) — committed. Returns the code. */
  async function seedWorkerCode(pariwarId: string, state: WorkerState = 'active'): Promise<string> {
    const scopeTx = await openScopeTx(t.deps, pariwarId);
    let ok = false;
    try {
      const w = await registerTestFieldWorker(scopeTx.client, pariwarId);
      const { code } = await allocateAttributionCodeForRequest(fakeRequest(pariwarId), scopeTx, { fieldWorkerId: w });
      if (state !== 'pending_kyc' && state !== 'terminated_from_pending_kyc') await approveTestFieldWorker(scopeTx.client, pariwarId, w);
      if (state === 'suspended_under_review') await actTestFieldWorker(scopeTx.client, pariwarId, w, 'suspend', 'under_review');
      if (state === 'suspended_at_worker_request') await actTestFieldWorker(scopeTx.client, pariwarId, w, 'suspend', 'at_worker_request');
      if (state === 'terminated_from_active' || state === 'terminated_from_pending_kyc') await terminateTestFieldWorker(scopeTx.client, pariwarId, w);
      if (state === 'terminated_from_suspended') {
        await actTestFieldWorker(scopeTx.client, pariwarId, w, 'suspend', 'under_review');
        await terminateTestFieldWorker(scopeTx.client, pariwarId, w);
      }
      if (state === 'terminated_died') await terminateTestFieldWorker(scopeTx.client, pariwarId, w, 'trustee_panel', 'died');
      ok = true;
      return code;
    } finally {
      await closeScopeTx(scopeTx, ok);
    }
  }

  /** The worker's state as the registry's lifecycle table holds it — proves each AC4 seed reached the state it names. */
  async function workerStateOfCode(pariwarId: string, code: string): Promise<{ state: string; reason: string | null }> {
    const r = await t.pool.query<{ state: string; reason: string | null }>(
      `SELECT w.current_state::text AS state, w.state_reason_code::text AS reason
         FROM field_worker_attribution_codes c JOIN field_workers w USING (pariwar_id, field_worker_id)
        WHERE c.pariwar_id = $1 AND c.code = $2`,
      [pariwarId, code],
    );
    return r.rows[0]!;
  }

  /**
   * A worker registered in `pariwarId` whose code row carries the GIVEN digits, dated an hour in the past or the future — inserted
   * on the owner pool under replica mode, because the BEFORE INSERT trigger stamps `allocated_at` from the DB clock otherwise
   * (F7). Lets a leg CONSTRUCT the digits it needs instead of hoping two random draws differ (codes are unique per Pariwar only).
   */
  async function seedWorkerWithCode(pariwarId: string, code: string, when: 'past' | 'future'): Promise<void> {
    const scopeTx = await openScopeTx(t.deps, pariwarId);
    let ok = false;
    let w: string;
    try {
      w = await registerTestFieldWorker(scopeTx.client, pariwarId);
      ok = true;
    } finally {
      await closeScopeTx(scopeTx, ok);
    }
    const c = await t.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query("SET LOCAL session_replication_role = 'replica'");
      await c.query(
        `INSERT INTO field_worker_attribution_codes (pariwar_id, field_worker_id, code, allocation_attempts, allocated_at)
         VALUES ($1, $2, $3, 1, now() + CASE WHEN $4 = 'future' THEN interval '1 hour' ELSE interval '-1 hour' END)`,
        [pariwarId, w!, code, when],
      );
      await c.query('COMMIT');
    } catch (err) {
      await c.query('ROLLBACK');
      throw err;
    } finally {
      c.release();
    }
  }

  function token(memberId: string, pariwarId: string): string {
    return signAccessToken(t.app, { memberId, pariwarId, deviceId: 'test-device' }, ACCESS_TTL_MS);
  }

  async function call(method: 'GET' | 'POST', tok: string | null, payload?: Json): Promise<{ status: number; raw: string; body: Json }> {
    const res = await t.app.inject({
      method,
      url: PATH,
      payload,
      headers: { origin: 'http://localhost:3001', ...(tok ? { authorization: `Bearer ${tok}` } : {}) },
    });
    let body: Json = {};
    try {
      body = res.json();
    } catch {
      body = {};
    }
    return { status: res.statusCode, raw: res.body, body };
  }

  /** The `ErrorResponse` envelope's code (`{ error: { code, … } }`). */
  function errorCode(body: Json): unknown {
    return (body.error as { code?: unknown } | undefined)?.code;
  }

  async function capturesOf(memberId: string): Promise<string[]> {
    const r = await t.pool.query<{ s: string }>('SELECT attribution_source AS s FROM member_attribution WHERE member_id = $1', [memberId]);
    return r.rows.map((x) => x.s);
  }

  /** A 6-digit code ⛔ in `taken`. */
  function unheldCode(taken: string[]): string {
    for (let n = 100000; ; n += 7919) {
      const c = String(n % 900000 + 100000);
      if (!taken.includes(c)) return c;
    }
  }

  // ── AC2 ──────────────────────────────────────────────────────────────────────────────────────────────

  it('AC2 — a held code ⇒ 201 `{ recorded: true }` and ONE row; the GET flips false → true; the same code again ⇒ 200, still one row', async () => {
    const P = newPariwar();
    const code = await seedWorkerCode(P);
    const m = await seedMember(P);
    const tok = token(m, P);

    expect(await call('GET', tok)).toMatchObject({ status: 200, body: { recorded: false } });
    const first = await call('POST', tok, { code });
    expect(first.status).toBe(201);
    expect(first.body).toEqual({ recorded: true });
    // ⛔ worker field — exactly the strict response schema (N2, DL3).
    expect(MemberAssistedCodeResponse.safeParse(first.body).success).toBe(true);
    expect(await capturesOf(m)).toEqual([code]);
    expect(await call('GET', tok)).toMatchObject({ status: 200, body: { recorded: true } });

    const again = await call('POST', tok, { code });
    expect(again.status).toBe(200);
    expect(again.body).toEqual({ recorded: true });
    expect(await capturesOf(m)).toEqual([code]);
  });

  it('AC2 — a DIFFERENT code after one is recorded ⇒ 409 attribution.already_recorded; the row is unchanged', async () => {
    const P = newPariwar();
    const a = await seedWorkerCode(P);
    const b = await seedWorkerCode(P);
    const m = await seedMember(P);
    const tok = token(m, P);
    expect((await call('POST', tok, { code: a })).status).toBe(201);
    const res = await call('POST', tok, { code: b });
    expect(res.status).toBe(409);
    expect(errorCode(res.body)).toBe('attribution.already_recorded');
    expect(await capturesOf(m)).toEqual([a]);
  });

  it('AC2 — a code nobody holds ⇒ 422 attribution.code_not_found and ⛔ row; CONTROL — the same member then records a held code (201, one row)', async () => {
    const P = newPariwar();
    const held = await seedWorkerCode(P);
    const m = await seedMember(P);
    const tok = token(m, P);
    const res = await call('POST', tok, { code: unheldCode([held]) });
    expect(res.status).toBe(422);
    expect(errorCode(res.body)).toBe('attribution.code_not_found');
    expect(await capturesOf(m)).toEqual([]);
    expect(await call('GET', tok)).toMatchObject({ body: { recorded: false } });

    const control = await call('POST', tok, { code: held });
    expect(control.status).toBe(201);
    expect(await capturesOf(m)).toEqual([held]);
  });

  it('AC2 — shape: "12ab", 5 digits, 7 digits and an extra key ⇒ 400, ⛔ row; a `pending-kyc` member may record (201)', async () => {
    const P = newPariwar();
    const code = await seedWorkerCode(P);
    const m = await seedMember(P, 'signup');
    const tok = token(m, P);
    for (const payload of [{ code: '12ab' }, { code: '12345' }, { code: '1234567' }, { code, pariwarId: P }, {}]) {
      expect((await call('POST', tok, payload)).status).toBe(400);
    }
    expect(await capturesOf(m)).toEqual([]);
    expect((await call('POST', tok, { code })).status).toBe(201);
  });

  it('AC2 — a member in lock-in ⇒ 409 attribution.not_signing_up and ⛔ row; ⛔ session ⇒ 401 on both routes', async () => {
    const P = newPariwar();
    const code = await seedWorkerCode(P);
    const m = await seedMember(P, 'paid');
    const res = await call('POST', token(m, P), { code });
    expect(res.status).toBe(409);
    expect(errorCode(res.body)).toBe('attribution.not_signing_up');
    expect(await capturesOf(m)).toEqual([]);

    expect((await call('GET', null)).status).toBe(401);
    expect((await call('POST', null, { code })).status).toBe(401);
  });

  it('R4 / family 3 — tampered, wrong-kind, non-member and other-Pariwar bearers cannot record a code; CONTROL — the member’s own token records it (201)', async () => {
    const P = newPariwar();
    const code = await seedWorkerCode(P);
    const m = await seedMember(P);
    const victim = await seedMember(P);
    const tok = token(m, P);
    // The signature kept, the subject swapped for ANOTHER signing-up member of the same Pariwar: JWT verification must fail.
    const [header, encoded, signature] = tok.split('.');
    const claims = JSON.parse(Buffer.from(encoded!, 'base64url').toString('utf8')) as Json;
    const tampered = `${header}.${Buffer.from(JSON.stringify({ ...claims, sub: victim })).toString('base64url')}.${signature}`;
    const wrongKinds = [
      signSignupContinuation(t.app, { mobileBlindIndex: `idx-${randomUUID()}`, jti: randomUUID() }, ACCESS_TTL_MS),
      signPariwarSelect(t.app, { mobileBlindIndex: `idx-${randomUUID()}`, deviceId: 'test-device', jti: randomUUID() }, ACCESS_TTL_MS),
      // Validly signed, outside MemberJwtClaims, naming the real member and Pariwar: the guard must refuse it on `typ` alone.
      t.app.jwt.sign({ typ: 'system', sub: m, pariwar_id: P, device_id: 'test-device' } as never, { expiresIn: 60 }),
    ];
    const audited = () => t.auditSink.events.filter((e) => e.type === 'member_attribution.captured').length;
    const auditBefore = audited();
    for (const bearer of [tampered, ...wrongKinds]) {
      for (const method of ['POST', 'GET'] as const) {
        const r = await call(method, bearer, method === 'POST' ? { code } : undefined);
        expect([method, r.status, errorCode(r.body)]).toEqual([method, 401, 'auth.session_required']);
      }
    }
    // A valid access token for a principal with ⛔ member row in that Pariwar — a ghost, or the real member under another
    // Pariwar's claim — is ⛔ signing up there: 409, nothing stored.
    for (const bearer of [token(randomUUID(), P), token(m, randomUUID())]) {
      const r = await call('POST', bearer, { code });
      expect([r.status, errorCode(r.body)]).toEqual([409, 'attribution.not_signing_up']);
    }
    expect(await capturesOf(m)).toEqual([]);
    expect(await capturesOf(victim)).toEqual([]);
    expect(audited()).toBe(auditBefore);

    const control = await call('POST', tok, { code });
    expect(control.status).toBe(201);
    expect(await capturesOf(m)).toEqual([code]);
    expect(await capturesOf(victim)).toEqual([]);
    expect(audited()).toBe(auditBefore + 1);
  });

  it('AC2 — two concurrent POSTs of one code ⇒ ONE row, both answered (one 201, one 200)', async () => {
    const P = newPariwar();
    const code = await seedWorkerCode(P);
    const m = await seedMember(P);
    const tok = token(m, P);
    const [x, y] = await Promise.all([call('POST', tok, { code }), call('POST', tok, { code })]);
    expect([x.status, y.status].sort()).toEqual([200, 201]);
    expect(x.body).toEqual({ recorded: true });
    expect(y.body).toEqual({ recorded: true });
    expect(await capturesOf(m)).toEqual([code]);
  });

  it.each([
    ['the SAME code ⇒ 200', 'same', 200, null],
    ['a DIFFERENT code ⇒ 409', 'other', 409, 'attribution.already_recorded'],
  ] as const)(
    'AC2 — the race made certain (%s): a POST blocked behind another tap’s uncommitted capture gets 23505, re-reads in a fresh tx and answers as the existing-capture case',
    async (_label, which, status, errCode) => {
      const P = newPariwar();
      const code = await seedWorkerCode(P);
      const other = await seedWorkerCode(P);
      const m = await seedMember(P);
      // The "other tap": its capture inserted and NOT committed, so the request sees ⛔ row at step (2) and its INSERT waits on
      // `member_attribution_member_uq` until this commits — then raises 23505, which aborts the request's transaction.
      const holder = await t.pool.connect();
      try {
        await holder.query('BEGIN');
        const pid = (await holder.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
        await holder.query('INSERT INTO member_attribution (member_id, pariwar_id, attribution_source) VALUES ($1, $2, $3)', [
          m,
          P,
          which === 'same' ? code : other,
        ]);
        const pending = call('POST', token(m, P), { code });
        await waitForBlockedBy(t.pool, pid);
        await holder.query('COMMIT');
        const res = await pending;
        expect(res.status).toBe(status);
        if (errCode === null) expect(res.body).toEqual({ recorded: true });
        else expect(errorCode(res.body)).toBe(errCode);
      } finally {
        await holder.query('ROLLBACK').catch(() => undefined);
        holder.release();
      }
      expect(await capturesOf(m)).toEqual([which === 'same' ? code : other]);
    },
  );

  // ── AC3 ──────────────────────────────────────────────────────────────────────────────────────────────

  it('AC3 — a code held only in ANOTHER Pariwar ⇒ 422 (the Pariwar is the session’s); CONTROLS — it records in its own Pariwar (201), and this Pariwar’s code ⇒ 201', async () => {
    const P = newPariwar();
    const Q = newPariwar();
    const ours = await seedWorkerCode(P);
    // R5: Q's digits are CONSTRUCTED to differ from P's — codes are unique per Pariwar only, so two random draws may legally match.
    const theirs = unheldCode([ours]);
    await seedWorkerWithCode(Q, theirs, 'past');
    const m = await seedMember(P);
    const tok = token(m, P);
    const res = await call('POST', tok, { code: theirs });
    expect(res.status).toBe(422);
    expect(errorCode(res.body)).toBe('attribution.code_not_found');
    expect(await capturesOf(m)).toEqual([]);
    // The refusal is about the Pariwar, ⛔ the fixture: a member of Q records the same code.
    const q = await seedMember(Q);
    expect((await call('POST', token(q, Q), { code: theirs })).status).toBe(201);
    expect(await capturesOf(q)).toEqual([theirs]);
    expect((await call('POST', tok, { code: ours })).status).toBe(201);
    expect(await capturesOf(m)).toEqual([ours]);
  });

  it('AC3 — the SAME digits held in two Pariwars is legal: a member of each records them (201 + 201, one row each)', async () => {
    const P = newPariwar();
    const Q = newPariwar();
    const shared = await seedWorkerCode(P);
    await seedWorkerWithCode(Q, shared, 'past');
    const p = await seedMember(P);
    const q = await seedMember(Q);
    expect((await call('POST', token(p, P), { code: shared })).status).toBe(201);
    expect((await call('POST', token(q, Q), { code: shared })).status).toBe(201);
    expect(await capturesOf(p)).toEqual([shared]);
    expect(await capturesOf(q)).toEqual([shared]);
  });

  it('AC3 — a code allocated AFTER the capture instant cannot match it (13.2 AT4 (c)) ⇒ 422; CONTROL — a code allocated in the past ⇒ 201', async () => {
    const P = newPariwar();
    const past = await seedWorkerCode(P);
    // A second worker whose code row is dated an hour ahead (owner pool, replica mode — F7).
    const future = unheldCode([past]);
    await seedWorkerWithCode(P, future, 'future');
    const stamped = await t.pool.query<{ ahead: boolean }>(
      'SELECT allocated_at > now() AS ahead FROM field_worker_attribution_codes WHERE pariwar_id = $1 AND code = $2',
      [P, future],
    );
    expect(stamped.rows[0]?.ahead).toBe(true);

    const m = await seedMember(P);
    const tok = token(m, P);
    const res = await call('POST', tok, { code: future });
    expect(res.status).toBe(422);
    expect(await capturesOf(m)).toEqual([]);
    expect((await call('POST', tok, { code: past })).status).toBe(201);
  });

  it('AC3 — the GET answers for the session’s member only', async () => {
    const P = newPariwar();
    const code = await seedWorkerCode(P);
    const x = await seedMember(P);
    const y = await seedMember(P);
    expect((await call('POST', token(x, P), { code })).status).toBe(201);
    expect(await call('GET', token(x, P))).toMatchObject({ body: { recorded: true } });
    expect(await call('GET', token(y, P))).toMatchObject({ body: { recorded: false } });
  });

  // ── AC4 ──────────────────────────────────────────────────────────────────────────────────────────────

  it('AC4 — the POST answers byte-identically (status + body) for a worker in each of eight states (Decision 2026-11-22-493 A; the last two added at review P6: "ended from any state, or died")', async () => {
    const P = newPariwar();
    const states: WorkerState[] = [
      'pending_kyc',
      'active',
      'suspended_under_review',
      'suspended_at_worker_request',
      'terminated_from_active',
      'terminated_from_pending_kyc',
      'terminated_from_suspended',
      'terminated_died',
    ];
    const expected: Record<WorkerState, { state: string; reason: string | null }> = {
      pending_kyc: { state: 'pending_kyc', reason: null },
      active: { state: 'active', reason: null },
      suspended_under_review: { state: 'suspended', reason: 'under_review' },
      suspended_at_worker_request: { state: 'suspended', reason: 'at_worker_request' },
      terminated_from_active: { state: 'terminated', reason: 'inactive' },
      terminated_from_pending_kyc: { state: 'terminated', reason: 'inactive' },
      terminated_from_suspended: { state: 'terminated', reason: 'inactive' },
      terminated_died: { state: 'terminated', reason: 'died' },
    };
    const answers: Array<{ status: number; raw: string }> = [];
    for (const s of states) {
      const code = await seedWorkerCode(P, s);
      // The seed reached the state it names (else the equality below proves nothing).
      expect(await workerStateOfCode(P, code)).toEqual(expected[s]);
      const m = await seedMember(P);
      const res = await call('POST', token(m, P), { code });
      answers.push({ status: res.status, raw: res.raw });
      expect(await capturesOf(m)).toEqual([code]);
    }
    expect(answers[0]).toEqual({ status: 201, raw: JSON.stringify({ recorded: true }) });
    for (const a of answers) expect(a).toEqual(answers[0]);
    expect(answers).toHaveLength(states.length);
  });

  // ── DL1 / DL13 — the per-member limit is the ONLY bound on the 201-vs-422 "is this code held" oracle (review P4) ───────────────────

  it('the POST is rate-limited PER MEMBER: misses count, the N+1th POST is 429 and stores nothing; another member in the Pariwar is untouched', async () => {
    // The `member-language.spec.ts` shape: a LOW ceiling by env override on its own app; `perMemberKey` + `hook: 'preHandler'` ⇒ the
    // bucket is the member's actor id, ⛔ the shared IP. The two misses show the limit is what bounds PROBING (a 422 stores nothing, so
    // the one-code-per-member rule never bites a miss); the third POST carries the HELD code and is refused before the handler.
    const t2 = await createTestApp({ env: { WRITE_RATE_MAX: '2' } });
    try {
      const P = newPariwar();
      const held = await seedWorkerCode(P);
      const m = await seedMember(P);
      const other = await seedMember(P);
      const post = async (memberId: string, code: string): Promise<number> =>
        (
          await t2.app.inject({
            method: 'POST',
            url: PATH,
            payload: { code },
            headers: {
              origin: 'http://localhost:3001',
              authorization: `Bearer ${signAccessToken(t2.app, { memberId, pariwarId: P, deviceId: 'test-device' }, ACCESS_TTL_MS)}`,
            },
          })
        ).statusCode;
      const miss = unheldCode([held]);
      expect([await post(m, miss), await post(m, miss), await post(m, held)]).toEqual([422, 422, 429]);
      expect(await capturesOf(m)).toEqual([]); // the held code was refused by the limiter, not recorded
      // CONTROL — another member in the same Pariwar is on their own bucket and records the same code.
      expect(await post(other, held)).toBe(201);
      expect(await capturesOf(other)).toEqual([held]);
      expect(t2.auditSink.ofType('rate_limit.exceeded').length).toBeGreaterThanOrEqual(1);
    } finally {
      await teardown(t2);
    }
  });
});
