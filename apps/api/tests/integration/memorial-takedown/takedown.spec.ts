// Story 11b.4a — the helpline's TAKE-DOWN at the nominee's request, through the real HTTP stack (Task 7.3; AC6, AC7, AC8, AC12,
// AC13; `2026-10-27-412` MP6–MP9, MP12, MP14; `-395` item 3 / `-411` item 1 — only the nominee who sent it).
// Every memorial goes in through the REAL Send and the REAL review; the operator is a real `helpline_operator` session; the
// take-down passes the real admin step-up `memorial_takedown`.
// Live DB only — skips when DATABASE_URL is unset. A fresh Pariwar per world.

import { MEMORIAL_TAKEDOWN_STEP_UP_CONTEXT } from '@twt/contracts';
import { ids, member as memberDomain } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { hasDatabase, type TestApp } from '../_setup.js';
import {
  createReviewHarness,
  handover,
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

const BODY = 'माँ हमेशा मुस्कुराती थीं। रमेश ने उन्हें धोखा दिया। वे सबकी मदद करती थीं।';
const LEFT_OUT = 'रमेश ने उन्हें धोखा दिया।';

describe.skipIf(!hasDatabase)('Story 11b.4a — the helpline take-down (live DB)', () => {
  let h: ReviewHarness;
  let t: TestApp;
  beforeAll(async () => {
    h = await createReviewHarness();
    t = h.t;
  });
  afterAll(async () => {
    await h.close();
  });

  const base = (w: MemorialWorld) => `/api/v1/p/${w.pariwarId}/memorial-takedowns`;
  const code = (r: { json: () => unknown }) => (r.json() as { error?: { code?: string } }).error?.code;

  async function approved(opts: { omit?: boolean } = {}): Promise<{ w: MemorialWorld; id: string; panel: StaffClient }> {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    const r = await send(t, w, sendFields({ body: BODY }));
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    const id = r.body.submissionId as string;
    const panel = await h.staff(w.pariwarId, 'trustee_panel');
    const start = BODY.indexOf(LEFT_OUT);
    const payload = opts.omit
      ? { action: 'approved_with_omissions', omissions: [{ field: 'body', start, end: start + LEFT_OUT.length, reason: 'attacks_someone_named' }] }
      : { action: 'approved' };
    const d = await panel.inject({ method: 'POST', url: `/api/v1/p/${w.pariwarId}/memorial-reviews/${id}/decision`, payload });
    expect(d.statusCode, d.body).toBe(200);
    return { w, id, panel };
  }

  async function elevate(c: StaffClient): Promise<void> {
    const req = await c.inject({ method: 'POST', url: '/api/v1/auth/step-up/request', payload: { actionContext: MEMORIAL_TAKEDOWN_STEP_UP_CONTEXT } });
    expect(req.statusCode, req.body).toBe(200);
    const ver = await c.inject({ method: 'POST', url: '/api/v1/auth/step-up/verify', payload: { otp: t.adminStepUpDelivery.last?.code as string } });
    expect(ver.statusCode, ver.body).toBe(200);
  }

  const record = (c: StaffClient, w: MemorialWorld, payload: object = { calledBack: true, firstContactAt: new Date(Date.now() - 3600_000).toISOString() }) =>
    c.inject({ method: 'POST', url: `${base(w)}/drives/${w.poolId}/requests`, payload });
  const decide = (c: StaffClient, w: MemorialWorld, requestId: string, outcome: string) =>
    c.inject({ method: 'POST', url: `${base(w)}/requests/${requestId}/outcome`, payload: { outcome } });

  it('⭐⭐ AC6 / AC7 / AC8 / AC12 — find the drive, see the nominee to call back, record the request, take it down (step-up), and every reader agrees afterwards', async () => {
    const { w, id, panel } = await approved({ omit: true });
    const op = await h.staff(w.pariwarId, 'helpline_operator', 'Helpline Operator');

    // MP12 — the deceased's drives with a SHOWN memorial.
    const drives = await op.inject({ method: 'GET', url: `${base(w)}/members/${w.memberId}/drives` });
    expect(drives.statusCode, drives.body).toBe(200);
    expect(drives.json()).toEqual({ drives: [{ poolId: w.poolId, poolCanonicalIdentifier: expect.any(String), hasOpenRequest: false }] });

    // AC6 — the drive view: the words AS THE PAGE SHOWS THEM (joined, ⛔ no marker), the nominee to call back, the branch.
    const before = t.auditSink.events.length;
    const view = await op.inject({ method: 'GET', url: `${base(w)}/drives/${w.poolId}` });
    expect(view.statusCode, view.body).toBe(200);
    const v = view.json() as Json & { shown: Json; nomineeToCallBack: Json; currentNominee: Json };
    expect(v.memorialState).toBe('approved_with_omissions');
    expect(v.shown.words).toEqual(['माँ हमेशा मुस्कुराती थीं। वे सबकी मदद करती थीं।']);
    expect(view.body).not.toContain('धोखा');
    expect(v.nomineeToCallBack.name).toBe('Asha Devi');
    expect(String(v.nomineeToCallBack.mobile)).toContain('98765');
    expect(v.smallerFix).toBe('send_now');
    expect(v.currentNominee).toEqual({ name: 'Asha Devi', isNomineeToCallBack: true });
    const reads = t.auditSink.events.slice(before).filter((e) => e.type === 'memorial.takedown.read');
    expect(reads).toHaveLength(1);
    expect(JSON.stringify(reads[0])).not.toContain('Asha');

    // AC6 — the request: `calledBack` must be true; the first contact within the last 7 days, ⛔ not in the future.
    expect((await record(op, w, { calledBack: false, firstContactAt: new Date().toISOString() })).statusCode).toBe(400);
    const future = await record(op, w, { calledBack: true, firstContactAt: new Date(Date.now() + 3600_000).toISOString() });
    expect(future.statusCode).toBe(400);
    expect(code(future)).toBe('memorial_takedown.first_contact_out_of_range');
    expect((await record(op, w, { calledBack: true, firstContactAt: new Date(Date.now() - 8 * 86_400_000).toISOString() })).statusCode).toBe(400);
    expect((await record(op, w, { calledBack: true, firstContactAt: new Date().toISOString(), note: 'why they asked' })).statusCode).toBe(400);
    const first = new Date(Date.now() - 2 * 3600_000);
    const rec = await record(op, w, { calledBack: true, firstContactAt: first.toISOString() });
    expect(rec.statusCode, rec.body).toBe(201);
    const requestId = (rec.json() as { requestId: string }).requestId;
    expect(new Date((rec.json() as { dueAt: string }).dueAt).getTime() - first.getTime()).toBe(7 * 86_400_000);
    const second = await record(op, w);
    expect(second.statusCode).toBe(409);
    expect(code(second)).toBe('memorial_takedown.request_open');
    const [row] = await rows<{ verified_by: string; submission_id: string; actor_display: string }>(
      t,
      `SELECT verified_by, submission_id, actor_display FROM memorial_takedown_requests WHERE request_id = $1`,
      [requestId],
    );
    expect(row).toEqual({ verified_by: 'called_back', submission_id: id, actor_display: 'Helpline Operator' });

    // AC10 — the open list.
    const open = await op.inject({ method: 'GET', url: `${base(w)}/requests?open=true` });
    expect((open.json() as { requests: Json[] }).requests).toEqual([expect.objectContaining({ requestId, poolId: w.poolId, overdue: false })]);

    // AC7 — the take-down needs the step-up; `kept`/`superseded` do ⛔ not.
    const noStepUp = await decide(op, w, requestId, 'taken_down');
    expect(noStepUp.statusCode).toBe(403);
    expect(code(noStepUp)).toBe('auth.step_up_required');
    await elevate(op);
    const down = await decide(op, w, requestId, 'taken_down');
    expect(down.statusCode, down.body).toBe(200);
    expect(down.json()).toMatchObject({ requestId, outcome: 'taken_down' });
    const again = await decide(op, w, requestId, 'kept');
    expect(again.statusCode).toBe(409);
    expect(code(again)).toBe('memorial_takedown.already_decided');
    const audits = await rows<{ action: string }>(t, `SELECT action FROM audit_log_entries WHERE pariwar_id = $1 AND action LIKE 'memorial.takedown.%' ORDER BY action`, [w.pariwarId]);
    // ⚠ A SET: each refused attempt (409 request_open, 409 already_decided) leaves its intent line AND its `_rolled_back` line
    // (ADR-0030's compensating protocol) — the successful writes are the two intents without a rollback of their own.
    expect([...new Set(audits.map((a) => a.action))].sort()).toEqual([
      'memorial.takedown.decide',
      'memorial.takedown.decide_rolled_back',
      'memorial.takedown.request_record',
      'memorial.takedown.request_record_rolled_back',
    ]);

    // ⭐ The public page carries ⛔ no memorial.
    const [pool] = await rows<{ public_token: string }>(t, `SELECT public_token FROM pools WHERE pool_id = $1`, [w.poolId]);
    const page = await t.app.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/public-pages/sahyog-vivran/${pool!.public_token}` });
    expect((page.json() as { drive: { familyMemorial: unknown } }).drive.familyMemorial).toBeNull();

    // ⭐ AC8 — the family reads `taken_down`; ⛔ no Trust reason rides beside it; they may write again.
    const mine = (await memberInject(t, 'GET', '/api/v1/member/memorial', { token: w.token })).body.memorial as Json;
    expect(mine).toMatchObject({ memorialState: 'taken_down', canSend: true, canWithdraw: false, reasonCode: null, earlierApprovalWithdrawn: null, earlierApprovalStands: false });

    // ⭐ AC12 — the review detail tells the truth; withdraw-approval on the taken-down version is the neutral 404.
    const detail = await panel.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/memorial-reviews/${id}` });
    const d = detail.json() as { memorialState: string; chain: { withdrawal: { withdrawnBy: string; reasonCode: unknown; actorDisplay: string } | null }[] };
    expect(d.memorialState).toBe('taken_down');
    expect(d.chain[0]!.withdrawal).toMatchObject({ withdrawnBy: 'helpline', reasonCode: null, actorDisplay: 'Helpline Operator' });
    const wa = await panel.inject({ method: 'POST', url: `/api/v1/p/${w.pariwarId}/memorial-reviews/${id}/withdraw-approval`, payload: { reasonCode: 'against_the_law' } });
    expect(wa.statusCode).toBe(404);
    expect(code(wa)).toBe('memorial_review.not_found');

    // The drive leaves the lookup, but its history stays readable.
    expect((await op.inject({ method: 'GET', url: `${base(w)}/members/${w.memberId}/drives` })).json()).toEqual({ drives: [] });
    const after = (await op.inject({ method: 'GET', url: `${base(w)}/drives/${w.poolId}` })).json() as Json & { requests: Json[] };
    expect(after.shown).toBeNull();
    expect(after.requests[0]).toMatchObject({ requestId, outcome: { outcome: 'taken_down', decidedAfterDue: false } });

    // ⭐ AC8 — a new Send after `taken_down` works exactly as after `approval_withdrawn`.
    await handover(t, w);
    const resend = await send(t, w, sendFields({ body: 'एक नया संस्करण।' }));
    expect(resend.status, JSON.stringify(resend.body)).toBe(201);
    const now = (await memberInject(t, 'GET', '/api/v1/member/memorial', { token: w.token })).body.memorial as Json;
    expect(now.memorialState).toBe('with_the_trust');
  });

  it('MP8 (b) — a clean `approved` memorial: the smaller fix needs the take-down first (`take_down_first`)', async () => {
    const { w } = await approved();
    const op = await h.staff(w.pariwarId, 'helpline_operator', 'Helpline Operator');
    const v = (await op.inject({ method: 'GET', url: `${base(w)}/drives/${w.poolId}` })).json() as Json;
    expect(v.memorialState).toBe('approved');
    expect(v.smallerFix).toBe('take_down_first');
  });

  it('MP8 (c) — the shown version changed between request and outcome: `taken_down` is 409 shown_changed, `superseded` closes it; `superseded` on an unchanged one is 409 shown_unchanged', async () => {
    const { w, panel } = await approved({ omit: true });
    const op = await h.staff(w.pariwarId, 'helpline_operator', 'Helpline Operator');
    const requestId = ((await record(op, w)).json() as { requestId: string }).requestId;
    const unchanged = await decide(op, w, requestId, 'superseded');
    expect(unchanged.statusCode).toBe(409);
    expect(code(unchanged)).toBe('memorial_takedown.shown_unchanged');
    // The (current) nominee sends a new version, and the Trust approves it — the page now shows v2.
    await handover(t, w);
    const v2 = await send(t, w, sendFields({ body: 'दूसरा संस्करण।' }));
    expect(v2.status).toBe(201);
    expect((await panel.inject({ method: 'POST', url: `/api/v1/p/${w.pariwarId}/memorial-reviews/${v2.body.submissionId as string}/decision`, payload: { action: 'approved' } })).statusCode).toBe(200);
    await elevate(op);
    const changed = await decide(op, w, requestId, 'taken_down');
    expect(changed.statusCode).toBe(409);
    expect(code(changed)).toBe('memorial_takedown.shown_changed');
    expect((await decide(op, w, requestId, 'superseded')).statusCode).toBe(200);
  });

  it('AC7 — an outcome after `due_at` is accepted, and the drive screen shows it as decided after the due date; the open list marked it overdue', async () => {
    const { w, id } = await approved({ omit: true });
    const op = await h.staff(w.pariwarId, 'helpline_operator', 'Helpline Operator');
    // As the superuser: a request recorded 8 days ago, first contact 9 days ago ⇒ due 2 days ago.
    const [r] = await rows<{ request_id: string }>(
      t,
      `INSERT INTO memorial_takedown_requests (pariwar_id, pool_id, submission_id, handover_nominee_ref, verified_by, first_contact_at, received_at, due_at, actor_id, actor_display)
       SELECT pariwar_id, pool_id, submission_id, handover_nominee_ref, 'called_back', now() - interval '9 days', now() - interval '8 days',
              now() - interval '9 days' + interval '168 hours', $2, 'Helpline Operator'
         FROM memorial_submissions WHERE submission_id = $1
       RETURNING request_id`,
      [id, w.memberId],
    );
    const open = (await op.inject({ method: 'GET', url: `${base(w)}/requests?open=true` })).json() as { requests: Json[] };
    expect(open.requests[0]).toMatchObject({ requestId: r!.request_id, overdue: true });
    expect((await decide(op, w, r!.request_id, 'kept')).statusCode).toBe(200);
    const view = (await op.inject({ method: 'GET', url: `${base(w)}/drives/${w.poolId}` })).json() as { requests: Json[] };
    expect(view.requests[0]).toMatchObject({ outcome: { outcome: 'kept', decidedAfterDue: true }, overdue: false });
  });

  it('AC6 — `[A(T)]` (the Trust withdrew its approval — nothing shown) is the neutral 404 at the request; an unknown request is 404 at the outcome', async () => {
    const { w, id, panel } = await approved();
    expect((await panel.inject({ method: 'POST', url: `/api/v1/p/${w.pariwarId}/memorial-reviews/${id}/withdraw-approval`, payload: { reasonCode: 'against_the_law' } })).statusCode).toBe(200);
    const op = await h.staff(w.pariwarId, 'helpline_operator', 'Helpline Operator');
    const r = await record(op, w);
    expect(r.statusCode).toBe(404);
    expect(code(r)).toBe('memorial_takedown.not_found');
    const unknown = await decide(op, w, '00000000-0000-4000-8000-000000000000', 'kept');
    expect(unknown.statusCode).toBe(404);
    expect(code(unknown)).toBe('memorial_takedown.not_found');
  });

  it('⭐ AC13 / Trap 4 — an ERASED member\'s memorial is ⛔ not listed, its drive view and its request are the neutral 404', async () => {
    const { w } = await approved();
    const op = await h.staff(w.pariwarId, 'helpline_operator', 'Helpline Operator');
    expect((await op.inject({ method: 'GET', url: `${base(w)}/drives/${w.poolId}` })).statusCode).toBe(200);
    const scopeTx = await openScopeTx(t.deps, w.pariwarId);
    let ok = false;
    try {
      await memberDomain.anonymizeMember(scopeTx.tx, t.deps.encryption, { memberId: ids.memberId(w.memberId), pariwarId: ids.pariwarId(w.pariwarId) });
      await memberDomain.projectMemberState(scopeTx.client, {
        memberId: ids.memberId(w.memberId),
        pariwarId: ids.pariwarId(w.pariwarId),
        eventType: 'member.rtbf_anonymized',
        actorId: w.memberId,
        payload: { from_state: 'pending-fee', to_state: 'anonymized', trigger: 'rtbf_request', actor: 'member' },
      });
      ok = true;
    } finally {
      await closeScopeTx(scopeTx, ok);
    }
    expect((await op.inject({ method: 'GET', url: `${base(w)}/members/${w.memberId}/drives` })).json()).toEqual({ drives: [] });
    const view = await op.inject({ method: 'GET', url: `${base(w)}/drives/${w.poolId}` });
    expect(view.statusCode).toBe(404);
    expect(code(view)).toBe('memorial_takedown.not_found');
    expect((await record(op, w)).statusCode).toBe(404);
  });

  it('the `Idempotency-Key` replays a request record (⛔ no second request, ⛔ no 409)', async () => {
    const { w } = await approved();
    const op = await h.staff(w.pariwarId, 'helpline_operator', 'Helpline Operator');
    const payload = { calledBack: true, firstContactAt: new Date(Date.now() - 60_000).toISOString() };
    const headers = { 'idempotency-key': `rec-${w.poolId}` };
    const a = await op.inject({ method: 'POST', url: `${base(w)}/drives/${w.poolId}/requests`, payload, headers });
    const b = await op.inject({ method: 'POST', url: `${base(w)}/drives/${w.poolId}/requests`, payload, headers });
    expect(a.statusCode, a.body).toBe(201);
    expect(b.statusCode, b.body).toBe(201);
    expect(b.json()).toEqual(a.json());
    const n = await rows<{ n: string }>(t, `SELECT count(*)::text AS n FROM memorial_takedown_requests WHERE pool_id = $1`, [w.poolId]);
    expect(n[0]!.n).toBe('1');
  });
});
