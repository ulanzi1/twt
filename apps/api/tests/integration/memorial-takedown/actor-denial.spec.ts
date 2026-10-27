// Story 11b.4a — WHO may take a family memorial down (Task 7.3; AC6, AC11; `2026-10-27-412` MP6). `memorial.takedown` is held by
// `helpline_operator` (+ derived `super_admin`) ONLY: the Trustee Panel, a `pariwar_admin`, an operator of ANOTHER Pariwar, a
// member bearer and an anonymous caller are refused on EVERY route — and nothing is written.
// Live DB only — skips when DATABASE_URL is unset.

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

  beforeAll(async () => {
    h = await createReviewHarness();
    t = h.t;
    w = await seedMemorialWorld(t);
    await handover(t, w);
    const r = await send(t, w, sendFields({ body: 'माँ।' }));
    const panel = await h.staff(w.pariwarId, 'trustee_panel');
    await panel.inject({ method: 'POST', url: `/api/v1/p/${w.pariwarId}/memorial-reviews/${r.body.submissionId as string}/decision`, payload: { action: 'approved' } });
    const op = await h.staff(w.pariwarId, 'helpline_operator', 'Helpline Operator');
    const rec = await op.inject({
      method: 'POST',
      url: `/api/v1/p/${w.pariwarId}/memorial-takedowns/drives/${w.poolId}/requests`,
      payload: { calledBack: true, firstContactAt: new Date(Date.now() - 60_000).toISOString() },
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
      { method: 'POST' as const, url: `${b}/drives/${w.poolId}/requests`, payload: { calledBack: true, firstContactAt: new Date().toISOString() } },
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
});
