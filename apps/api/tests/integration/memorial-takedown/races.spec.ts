// Story 11b.4a — the take-down RACES, proven live (Task 7.3; AC7; `2026-10-27-412` MP8 — every writer takes `lockMemorialPool`
// first). The memorial race spec's method: a third connection holds the pool's advisory lock, the first writer is started and
// waited for until it is parked on the lock, then the second, then both are released together — the order is the queue's, ⛔ not the
// scheduler's. Each leg runs BOTH orders where the outcome differs, and asserts the chain the database ends with.
// Live DB only — skips when DATABASE_URL is unset.

import { MEMORIAL_TAKEDOWN_STEP_UP_CONTEXT } from '@twt/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { hasDatabase, type TestApp } from '../_setup.js';
import {
  createReviewHarness,
  handover,
  holdPoolLock,
  memberInject,
  rows,
  seedMemorialWorld,
  send,
  sendFields,
  type Json,
  type MemorialWorld,
  type ReviewHarness,
  type StaffClient,
} from '../memorial/_fixture.js';

type Reply = { status: number; body: Json };

const BODY = 'माँ हमेशा मुस्कुराती थीं। एक कठोर वाक्य। वे सबकी मदद करती थीं।';
const CUT = 'एक कठोर वाक्य।';

describe.skipIf(!hasDatabase)('Story 11b.4a — take-down races at the pool lock (live DB)', () => {
  let h: ReviewHarness;
  let t: TestApp;
  beforeAll(async () => {
    h = await createReviewHarness();
    t = h.t;
  });
  afterAll(async () => {
    await h.close();
  });

  const reply = async (p: Promise<{ statusCode: number; json: () => unknown }>): Promise<Reply> => {
    const r = await p;
    return { status: r.statusCode, body: r.json() as Json };
  };
  const code = (r: Reply): unknown => (r.body.error as { code?: unknown } | undefined)?.code;

  interface World {
    readonly w: MemorialWorld;
    readonly v1: string;
    readonly panel: StaffClient;
    readonly op: StaffClient;
    readonly requestId: string | null;
  }

  /** v1 approved WITH a part left out (so the family may send again), an elevated operator, and (optionally) a recorded request. */
  async function world(opts: { request?: boolean } = {}): Promise<World> {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    const r = await send(t, w, sendFields({ body: BODY }));
    expect(r.status).toBe(201);
    const v1 = r.body.submissionId as string;
    const panel = await h.staff(w.pariwarId, 'trustee_panel');
    const start = BODY.indexOf(CUT);
    const d = await panel.inject({
      method: 'POST',
      url: `/api/v1/p/${w.pariwarId}/memorial-reviews/${v1}/decision`,
      payload: { action: 'approved_with_omissions', omissions: [{ field: 'body', start, end: start + CUT.length, reason: 'against_the_law' }] },
    });
    expect(d.statusCode, d.body).toBe(200);
    const op = await h.staff(w.pariwarId, 'helpline_operator', 'Helpline Operator');
    const req = await op.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: MEMORIAL_TAKEDOWN_STEP_UP_CONTEXT } });
    expect(req.statusCode).toBe(200);
    expect((await op.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: t.adminStepUpDelivery.last?.code as string } })).statusCode).toBe(200);
    let requestId: string | null = null;
    if (opts.request !== false) {
      const rec = await recordRequest(op, w, v1)();
      expect(rec.status, JSON.stringify(rec.body)).toBe(201);
      requestId = rec.body.requestId as string;
    }
    return { w, v1, panel, op, requestId };
  }

  /** The call-back recorded against `shown` — the version the operator was LOOKING AT (R1). */
  const recordRequest = (op: StaffClient, w: MemorialWorld, shown: string) => () =>
    reply(
      op.inject({
        method: 'POST',
        url: `/api/v1/p/${w.pariwarId}/memorial-takedowns/drives/${w.poolId}/requests`,
        payload: { calledBack: true, firstContactAt: new Date(Date.now() - 60_000).toISOString(), shownSubmissionId: shown },
      }),
    );
  const takeDown = (x: World) => () =>
    reply(x.op.inject({ method: 'POST', url: `/api/v1/p/${x.w.pariwarId}/memorial-takedowns/requests/${x.requestId!}/outcome`, payload: { outcome: 'taken_down' } }));
  const familySend = (x: World, body: string) => () => send(t, x.w, sendFields({ body }));
  const familyWithdraw = (x: World, id: string) => async (): Promise<Reply> => {
    const r = await memberInject(t, 'POST', `/api/v1/member/memorial/submissions/${id}/withdraw`, { payload: {}, token: x.w.token });
    return { status: r.status, body: r.body };
  };
  const decide = (x: World, id: string) => () =>
    reply(x.panel.inject({ method: 'POST', url: `/api/v1/p/${x.w.pariwarId}/memorial-reviews/${id}/decision`, payload: { action: 'approved' } }));
  const trustWithdraw = (x: World, id: string) => () =>
    reply(x.panel.inject({ method: 'POST', url: `/api/v1/p/${x.w.pariwarId}/memorial-reviews/${id}/withdraw-approval`, payload: { reasonCode: 'against_the_law' } }));

  async function race(w: MemorialWorld, first: () => Promise<Reply>, second: () => Promise<Reply>): Promise<{ first: Reply; second: Reply }> {
    const lock = await holdPoolLock(t, w.poolId);
    try {
      const a = first();
      await lock.waitForWaiters(1);
      const b = second();
      await lock.waitForWaiters(2);
      await lock.release();
      const [ra, rb] = await Promise.all([a, b]);
      return { first: ra, second: rb };
    } finally {
      await lock.abort();
    }
  }

  /** The chain as the database ends it: oldest first, each version's decision and withdrawal actor. */
  async function chain(w: MemorialWorld) {
    return rows<{ submission_id: string; action: string | null; withdrawn_by: string | null }>(
      t,
      `SELECT s.submission_id, d.action, wd.withdrawn_by::text AS withdrawn_by
         FROM memorial_submissions s
         LEFT JOIN memorial_review_decisions d ON d.submission_id = s.submission_id
         LEFT JOIN memorial_withdrawals wd ON wd.submission_id = s.submission_id
        WHERE s.pariwar_id = $1 ORDER BY s.created_at, s.submission_id`,
      [w.pariwarId],
    );
  }
  const familyState = async (w: MemorialWorld) =>
    ((await memberInject(t, 'GET', '/api/v1/member/memorial', { token: w.token })).body.memorial as Json).memorialState;

  /** Send v2 (pending) before the race. */
  async function withPending(x: World): Promise<string> {
    await handover(t, x.w);
    const r = await send(t, x.w, sendFields({ body: 'दूसरा संस्करण।' }));
    expect(r.status).toBe(201);
    return r.body.submissionId as string;
  }

  // ── take-down × Send ─────────────────────────────────────────────────────────────────────────────────────────────────

  it('take-down × Send — the TAKE-DOWN first: 200, then the Send (allowed after a take-down) 201; the new version is with the Trust, ⛔ not shown', async () => {
    const x = await world();
    await handover(t, x.w);
    const r = await race(x.w, takeDown(x), familySend(x, 'after the take-down'));
    expect(r.first.status, JSON.stringify(r.first.body)).toBe(200);
    expect(r.second.status, JSON.stringify(r.second.body)).toBe(201);
    const links = await chain(x.w);
    expect(links.map((l) => l.withdrawn_by)).toEqual(['helpline', null]);
    expect(await familyState(x.w)).toBe('with_the_trust');
  });

  it('take-down × Send — the SEND first: 201, then the take-down withdraws BOTH versions (⛔ no pending one survives it)', async () => {
    const x = await world();
    await handover(t, x.w);
    const r = await race(x.w, familySend(x, 'just before the take-down'), takeDown(x));
    expect(r.first.status, JSON.stringify(r.first.body)).toBe(201);
    expect(r.second.status, JSON.stringify(r.second.body)).toBe(200);
    expect((await chain(x.w)).map((l) => l.withdrawn_by)).toEqual(['helpline', 'helpline']);
    expect(await familyState(x.w)).toBe('taken_down');
  });

  // ── take-down × the family's withdraw ────────────────────────────────────────────────────────────────────────────────

  it('take-down × family Withdraw — the WITHDRAW first: 200, then the take-down withdraws only v1; the family reads `taken_down`', async () => {
    const x = await world();
    const v2 = await withPending(x);
    const r = await race(x.w, familyWithdraw(x, v2), takeDown(x));
    expect(r.first.status, JSON.stringify(r.first.body)).toBe(200);
    expect(r.second.status, JSON.stringify(r.second.body)).toBe(200);
    expect((await chain(x.w)).map((l) => l.withdrawn_by)).toEqual(['helpline', 'family']);
    expect(await familyState(x.w)).toBe('taken_down');
  });

  it('take-down × family Withdraw — the TAKE-DOWN first: 200, then the Withdraw is 409 not_withdrawable; ⛔ never "taken down AND withdrawn by the family"', async () => {
    const x = await world();
    const v2 = await withPending(x);
    const r = await race(x.w, takeDown(x), familyWithdraw(x, v2));
    expect(r.first.status, JSON.stringify(r.first.body)).toBe(200);
    expect(r.second.status).toBe(409);
    expect(code(r.second)).toBe('memorial.not_withdrawable');
    expect((await chain(x.w)).map((l) => l.withdrawn_by)).toEqual(['helpline', 'helpline']);
  });

  // ── take-down × the Trust's decision on a newer version ──────────────────────────────────────────────────────────────

  it('take-down × review decision — the DECISION first (v2 approved — the page now shows v2): the take-down is 409 shown_changed; ⛔ no withdrawal written', async () => {
    const x = await world();
    const v2 = await withPending(x);
    const r = await race(x.w, decide(x, v2), takeDown(x));
    expect(r.first.status, JSON.stringify(r.first.body)).toBe(200);
    expect(r.second.status).toBe(409);
    expect(code(r.second)).toBe('memorial_takedown.shown_changed');
    expect((await chain(x.w)).map((l) => l.withdrawn_by)).toEqual([null, null]);
  });

  it('take-down × review decision — the TAKE-DOWN first: 200 (v2 withdrawn too), then the decision is the neutral 404; ⛔ no decision on a taken-down version', async () => {
    const x = await world();
    const v2 = await withPending(x);
    const r = await race(x.w, takeDown(x), decide(x, v2));
    expect(r.first.status, JSON.stringify(r.first.body)).toBe(200);
    expect(r.second.status).toBe(404);
    expect(code(r.second)).toBe('memorial_review.not_found');
    expect((await chain(x.w)).map((l) => [l.action, l.withdrawn_by])).toEqual([
      ['approved_with_omissions', 'helpline'],
      [null, 'helpline'],
    ]);
  });

  // ── take-down × the Trust withdrawing its own approval ───────────────────────────────────────────────────────────────

  it('take-down × Trust withdraw-approval — the TRUST first: 200, then the take-down is 409 shown_changed (⛔ nothing is shown); ONE Trust withdrawal', async () => {
    const x = await world();
    const r = await race(x.w, trustWithdraw(x, x.v1), takeDown(x));
    expect(r.first.status, JSON.stringify(r.first.body)).toBe(200);
    expect(r.second.status).toBe(409);
    expect(code(r.second)).toBe('memorial_takedown.shown_changed');
    expect((await chain(x.w)).map((l) => l.withdrawn_by)).toEqual(['trust']);
  });

  it('take-down × Trust withdraw-approval — the TAKE-DOWN first: 200, then the Trust\'s withdraw is the neutral 404; ONE helpline withdrawal', async () => {
    const x = await world();
    const r = await race(x.w, takeDown(x), trustWithdraw(x, x.v1));
    expect(r.first.status, JSON.stringify(r.first.body)).toBe(200);
    expect(r.second.status).toBe(404);
    expect(code(r.second)).toBe('memorial_review.not_found');
    expect((await chain(x.w)).map((l) => l.withdrawn_by)).toEqual(['helpline']);
  });

  // ── two request records ──────────────────────────────────────────────────────────────────────────────────────────────

  it('two request records for one drive, queued together — 201 then 409 request_open; ONE request', async () => {
    const x = await world({ request: false });
    const r = await race(x.w, recordRequest(x.op, x.w, x.v1), recordRequest(x.op, x.w, x.v1));
    expect(r.first.status, JSON.stringify(r.first.body)).toBe(201);
    expect(r.second.status).toBe(409);
    expect(code(r.second)).toBe('memorial_takedown.request_open');
    const n = await rows<{ n: string }>(t, `SELECT count(*)::text AS n FROM memorial_takedown_requests WHERE pool_id = $1`, [x.w.poolId]);
    expect(n[0]!.n).toBe('1');
  });

  // ── request record × the Trust's decision on a newer version (R1 — the call-back is bound to the version the operator SAW) ──

  const requestRows = (x: World) =>
    rows<{ submission_id: string }>(t, `SELECT submission_id FROM memorial_takedown_requests WHERE pool_id = $1`, [x.w.poolId]);

  it('request record × review decision — the DECISION first (v2 approved while the operator was looking at v1): the record is 409 shown_changed; ⛔ no request written', async () => {
    const x = await world({ request: false });
    const v2 = await withPending(x);
    const r = await race(x.w, decide(x, v2), recordRequest(x.op, x.w, x.v1));
    expect(r.first.status, JSON.stringify(r.first.body)).toBe(200);
    expect(r.second.status, JSON.stringify(r.second.body)).toBe(409);
    expect(code(r.second)).toBe('memorial_takedown.shown_changed');
    expect(await requestRows(x)).toEqual([]);
  });

  it('request record × review decision — the RECORD first: 201 against v1 (still the one on the page), then the decision lands; the request keeps v1, ⛔ v2', async () => {
    const x = await world({ request: false });
    const v2 = await withPending(x);
    const r = await race(x.w, recordRequest(x.op, x.w, x.v1), decide(x, v2));
    expect(r.first.status, JSON.stringify(r.first.body)).toBe(201);
    expect(r.second.status, JSON.stringify(r.second.body)).toBe(200);
    expect(await requestRows(x)).toEqual([{ submission_id: x.v1 }]);
  });

  // ── an Idempotency-Key still IN PROGRESS ─────────────────────────────────────────────────────────────────────────────

  it('an `Idempotency-Key` still IN PROGRESS (its first request parked on the pool lock) answers the second 409 idempotency_in_progress; ONE outcome once the first finishes', async () => {
    const x = await world();
    const url = `/api/v1/p/${x.w.pariwarId}/memorial-takedowns/requests/${x.requestId!}/outcome`;
    const keep = () => reply(x.op.inject({ method: 'POST', url, payload: { outcome: 'kept' }, headers: { 'idempotency-key': `inflight-${x.requestId!}` } }));
    const lock = await holdPoolLock(t, x.w.poolId);
    try {
      const first = keep();
      // The first has CLAIMED its key before it takes the lock — so a request parked on the lock is an in-flight one.
      await lock.waitForWaiters(1);
      const second = await keep();
      expect(second.status, JSON.stringify(second.body)).toBe(409);
      expect(code(second)).toBe('memorial_takedown.idempotency_in_progress');
      await lock.release();
      expect((await first).status).toBe(200);
    } finally {
      await lock.abort();
    }
    const n = await rows<{ n: string }>(t, `SELECT count(*)::text AS n FROM memorial_takedown_outcomes WHERE request_id = $1`, [x.requestId]);
    expect(n[0]!.n).toBe('1');
  });
});
