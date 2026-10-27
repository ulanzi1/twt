// Story 11b.4a — WHO may take a family memorial down (Task 7.3; AC6, AC11; `2026-10-27-412` MP6). `memorial.takedown` is held by
// `helpline_operator` (+ derived `super_admin`) ONLY: the Trustee Panel, a `pariwar_admin`, an operator of ANOTHER Pariwar, a
// member bearer and an anonymous caller are refused on EVERY route — and nothing is written. Beyond the role: the `taken_down`
// step-up (expired; an elevation for ANOTHER context — a helpline operator routinely holds `claim_file`) and another Pariwar's ids
// under the caller's OWN `pariwarId` (R28; the sibling `memorial/actor-denial.spec.ts` is the standard).
// Live DB only — skips when DATABASE_URL is unset.

import { MEMORIAL_TAKEDOWN_STEP_UP_CONTEXT } from '@twt/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { hasDatabase, type TestApp } from '../_setup.js';
import {
  createReviewHarness,
  handover,
  memberInject,
  rows,
  seedMemorialWorld,
  send,
  sendFields,
  type MemorialWorld,
  type ReviewHarness,
  type StaffClient,
} from '../memorial/_fixture.js';

describe.skipIf(!hasDatabase)('Story 11b.4a — the take-down routes refuse every actor but the helpline operator (live DB)', () => {
  let h: ReviewHarness;
  let t: TestApp;
  let w: MemorialWorld;
  let requestId: string;
  /** The version the drive shows (the record echoes it — R1). */
  let shownId: string;
  /** Milliseconds the APP clock runs ahead of the real one (the step-up "expired" leg); ALWAYS put back to 0. */
  let skewMs = 0;

  beforeAll(async () => {
    h = await createReviewHarness({ clock: () => new Date(Date.now() + skewMs) });
    t = h.t;
    w = await seedMemorialWorld(t);
    await handover(t, w);
    const r = await send(t, w, sendFields({ body: 'माँ।' }));
    shownId = r.body.submissionId as string;
    const panel = await h.staff(w.pariwarId, 'trustee_panel');
    await panel.inject({ method: 'POST', url: `/api/v1/p/${w.pariwarId}/memorial-reviews/${shownId}/decision`, payload: { action: 'approved' } });
    const op = await h.staff(w.pariwarId, 'helpline_operator', 'Helpline Operator');
    const rec = await op.inject({
      method: 'POST',
      url: `/api/v1/p/${w.pariwarId}/memorial-takedowns/drives/${w.poolId}/requests`,
      payload: { calledBack: true, firstContactAt: new Date(Date.now() - 60_000).toISOString(), shownSubmissionId: shownId },
    });
    expect(rec.statusCode, rec.body).toBe(201);
    requestId = (rec.json() as { requestId: string }).requestId;
  });
  afterAll(async () => {
    await h.close();
  });

  const routes = () => {
    const b = `/api/v1/p/${w.pariwarId}/memorial-takedowns`;
    return [
      { method: 'GET' as const, url: `${b}/members/${w.memberId}/drives` },
      { method: 'GET' as const, url: `${b}/drives/${w.poolId}` },
      { method: 'GET' as const, url: `${b}/requests?open=true` },
      { method: 'POST' as const, url: `${b}/drives/${w.poolId}/requests`, payload: { calledBack: true, firstContactAt: new Date().toISOString(), shownSubmissionId: shownId } },
      { method: 'POST' as const, url: `${b}/requests/${requestId}/outcome`, payload: { outcome: 'kept' } },
    ];
  };

  /** The take-down tables are UNCHANGED (one request, ⛔ no outcome, ⛔ no helpline withdrawal). */
  async function nothingWritten(): Promise<void> {
    const n = await rows<{ r: string; o: string; w: string }>(
      t,
      `SELECT (SELECT count(*) FROM memorial_takedown_requests WHERE pariwar_id = $1)::text AS r,
              (SELECT count(*) FROM memorial_takedown_outcomes WHERE pariwar_id = $1)::text AS o,
              (SELECT count(*) FROM memorial_withdrawals WHERE pariwar_id = $1 AND withdrawn_by::text = 'helpline')::text AS w`,
      [w.pariwarId],
    );
    expect(n[0]).toEqual({ r: '1', o: '0', w: '0' });
  }

  it.each(['trustee_panel', 'pariwar_admin'])('staff holding `%s` (⛔ not `memorial.takedown`) → 403 on ALL FIVE routes; nothing written', async (role) => {
    const c: StaffClient = await h.staff(w.pariwarId, role);
    for (const r of routes()) {
      const res = await c.inject(r);
      expect(res.statusCode, `${role} ${r.method} ${r.url}`).toBe(403);
    }
    await nothingWritten();
  });

  it('a helpline operator of ANOTHER Pariwar → the scope middleware\'s 404 on all five; nothing written', async () => {
    const other = await seedMemorialWorld(t);
    const c = await h.staff(other.pariwarId, 'helpline_operator', 'Elsewhere Operator');
    for (const r of routes()) {
      const res = await c.inject(r);
      expect(res.statusCode, `${r.method} ${r.url}`).toBe(404);
      expect((res.json() as { error: { code: string } }).error.code).toBe('pariwar.not_found');
    }
    await nothingWritten();
  });

  it('a MEMBER bearer (the family\'s own) and an anonymous caller → 401 on all five; nothing written', async () => {
    for (const r of routes()) {
      const asMember = await memberInject(t, r.method, r.url, { token: w.token, ...(r.payload ? { payload: r.payload } : {}) });
      expect(asMember.status, `member ${r.method} ${r.url}`).toBe(401);
      const anon = await t.app.inject(r);
      expect(anon.statusCode, `anon ${r.method} ${r.url}`).toBe(401);
    }
    await nothingWritten();
  });

  // ── the take-down step-up and another Pariwar's ids (R28) ────────────────────────────────────────────────────────────────

  const code = (r: { json: () => unknown }) => (r.json() as { error?: { code?: string } }).error?.code;

  /** A world of its own: an approved memorial, an operator of its Pariwar, and an OPEN request on its drive. */
  async function ownWorld(): Promise<{ w: MemorialWorld; shownId: string; requestId: string; op: StaffClient }> {
    const own = await seedMemorialWorld(t);
    await handover(t, own);
    const sent = await send(t, own, sendFields({ body: 'माँ।' }));
    const shown = sent.body.submissionId as string;
    const panel = await h.staff(own.pariwarId, 'trustee_panel');
    const decision = await panel.inject({ method: 'POST', url: `/api/v1/p/${own.pariwarId}/memorial-reviews/${shown}/decision`, payload: { action: 'approved' } });
    expect(decision.statusCode, decision.body).toBe(200);
    const op = await h.staff(own.pariwarId, 'helpline_operator', 'Helpline Operator');
    const rec = await op.inject({
      method: 'POST',
      url: `/api/v1/p/${own.pariwarId}/memorial-takedowns/drives/${own.poolId}/requests`,
      payload: { calledBack: true, firstContactAt: new Date(Date.now() - 60_000).toISOString(), shownSubmissionId: shown },
    });
    expect(rec.statusCode, rec.body).toBe(201);
    return { w: own, shownId: shown, requestId: (rec.json() as { requestId: string }).requestId, op };
  }

  async function elevate(c: StaffClient, actionContext: string): Promise<void> {
    const req = await c.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext } });
    expect(req.statusCode, req.body).toBe(200);
    const ver = await c.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: t.adminStepUpDelivery.last?.code as string } });
    expect(ver.statusCode, ver.body).toBe(200);
  }

  const takeDown = (c: StaffClient, world: MemorialWorld, id: string) =>
    c.inject({ method: 'POST', url: `/api/v1/p/${world.pariwarId}/memorial-takedowns/requests/${id}/outcome`, payload: { outcome: 'taken_down' } });

  /** One Pariwar's take-down tables: requests, outcomes and `helpline` withdrawals (what a refused take-down must leave alone). */
  async function tables(pariwarId: string) {
    const [n] = await rows<{ requests: string; outcomes: string; withdrawals: string }>(
      t,
      `SELECT (SELECT count(*) FROM memorial_takedown_requests WHERE pariwar_id = $1)::text AS requests,
              (SELECT count(*) FROM memorial_takedown_outcomes WHERE pariwar_id = $1)::text AS outcomes,
              (SELECT count(*) FROM memorial_withdrawals WHERE pariwar_id = $1 AND withdrawn_by::text = 'helpline')::text AS withdrawals`,
      [pariwarId],
    );
    return n!;
  }

  it('⭐ `taken_down` with the step-up EXPIRED → 403 auth.step_up_required, nothing written — and the SAME elevation passes once the clock is back (so it was the clock)', async () => {
    const own = await ownWorld();
    await elevate(own.op, MEMORIAL_TAKEDOWN_STEP_UP_CONTEXT);
    skewMs = t.deps.config.stepUpElevatedMs + 1_000;
    try {
      const r = await takeDown(own.op, own.w, own.requestId);
      expect(r.statusCode, r.body).toBe(403);
      expect(code(r)).toBe('auth.step_up_required');
      expect(await tables(own.w.pariwarId)).toEqual({ requests: '1', outcomes: '0', withdrawals: '0' });
    } finally {
      skewMs = 0;
    }
    const ok = await takeDown(own.op, own.w, own.requestId);
    expect(ok.statusCode, ok.body).toBe(200);
  });

  it('⭐ `taken_down` with a fresh elevation for ANOTHER context (`claim_file`) → 403 auth.step_up_required, nothing written — and the take-down\'s own context then passes', async () => {
    const own = await ownWorld();
    await elevate(own.op, 'claim_file');
    const r = await takeDown(own.op, own.w, own.requestId);
    expect(r.statusCode, r.body).toBe(403);
    expect(code(r)).toBe('auth.step_up_required');
    expect(await tables(own.w.pariwarId)).toEqual({ requests: '1', outcomes: '0', withdrawals: '0' });
    await elevate(own.op, MEMORIAL_TAKEDOWN_STEP_UP_CONTEXT);
    const ok = await takeDown(own.op, own.w, own.requestId);
    expect(ok.statusCode, ok.body).toBe(200);
  });

  it('another Pariwar\'s poolId / requestId / memberId under the caller\'s OWN pariwarId path → the neutral answer (404 memorial_takedown.not_found; the member lookup `{ drives: [] }`); nothing written in EITHER Pariwar', async () => {
    const mine = await ownWorld();
    const theirs = await ownWorld();
    // Elevated, so a `taken_down` REACHES the handler (the step-up hook would otherwise answer first).
    await elevate(mine.op, MEMORIAL_TAKEDOWN_STEP_UP_CONTEXT);
    const b = `/api/v1/p/${mine.w.pariwarId}/memorial-takedowns`;
    const before = [await tables(mine.w.pariwarId), await tables(theirs.w.pariwarId)];

    // The control: those ids ARE real — their own operator reads the drive and finds the member.
    const own = `/api/v1/p/${theirs.w.pariwarId}/memorial-takedowns`;
    expect((await theirs.op.inject({ method: 'GET', url: `${own}/drives/${theirs.w.poolId}` })).statusCode).toBe(200);
    expect((await theirs.op.inject({ method: 'GET', url: `${own}/members/${theirs.w.memberId}/drives` })).json()).toMatchObject({ drives: [{ poolId: theirs.w.poolId }] });

    const view = await mine.op.inject({ method: 'GET', url: `${b}/drives/${theirs.w.poolId}` });
    expect(view.statusCode, view.body).toBe(404);
    expect(code(view)).toBe('memorial_takedown.not_found');
    const record = await mine.op.inject({
      method: 'POST',
      url: `${b}/drives/${theirs.w.poolId}/requests`,
      payload: { calledBack: true, firstContactAt: new Date(Date.now() - 60_000).toISOString(), shownSubmissionId: theirs.shownId },
    });
    expect(record.statusCode, record.body).toBe(404);
    expect(code(record)).toBe('memorial_takedown.not_found');
    for (const outcome of ['kept', 'taken_down', 'superseded']) {
      const decided = await mine.op.inject({ method: 'POST', url: `${b}/requests/${theirs.requestId}/outcome`, payload: { outcome } });
      expect(decided.statusCode, `${outcome}: ${decided.body}`).toBe(404);
      expect(code(decided), outcome).toBe('memorial_takedown.not_found');
    }
    // The member lookup is a LIST — an unknown member is an empty one (the same answer as a member with no shown memorial).
    const lookup = await mine.op.inject({ method: 'GET', url: `${b}/members/${theirs.w.memberId}/drives` });
    expect(lookup.statusCode, lookup.body).toBe(200);
    expect(lookup.json()).toEqual({ drives: [] });

    expect([await tables(mine.w.pariwarId), await tables(theirs.w.pariwarId)]).toEqual(before);
  });
});
