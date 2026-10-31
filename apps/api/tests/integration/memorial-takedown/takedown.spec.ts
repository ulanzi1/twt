// Story 11b.4a — the helpline's TAKE-DOWN at the nominee's request, through the real HTTP stack (Task 7.3; AC6, AC7, AC8, AC12,
// AC13; `2026-10-27-412` MP6–MP9, MP12, MP14; `-395` item 3 / `-411` item 1 — only the nominee who sent it).
// Every memorial goes in through the REAL Send and the REAL review; the operator is a real `helpline_operator` session; the
// take-down passes the real admin step-up `memorial_takedown`.
// Live DB only — skips when DATABASE_URL is unset. A fresh Pariwar per world.

import { MEMORIAL_TAKEDOWN_STEP_UP_CONTEXT } from '@twt/contracts';
import { ids, member as memberDomain } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { hasDatabase, type TestApp } from '../_setup.js';
import {
  createReviewHarness,
  handover,
  jpegWithGps,
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
  /** The APP clock (`null` ⇒ the real one). A boundary leg sets it, relative to the database's, and ALWAYS puts it back. */
  let clockMs: number | null = null;
  beforeAll(async () => {
    h = await createReviewHarness({ clock: () => new Date(clockMs ?? Date.now()) });
    t = h.t;
  });
  afterAll(async () => {
    await h.close();
  });

  const base = (w: MemorialWorld) => `/api/v1/p/${w.pariwarId}/memorial-takedowns`;
  const code = (r: { json: () => unknown }) => (r.json() as { error?: { code?: string } }).error?.code;

  async function approved(opts: { omit?: boolean; intoPariwar?: string } = {}): Promise<{ w: MemorialWorld; id: string; panel: StaffClient }> {
    const w = await seedMemorialWorld(t, opts.intoPariwar === undefined ? {} : { intoPariwar: opts.intoPariwar });
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

  /** The call-back, recorded against the version the operator was LOOKING AT (`shownSubmissionId`, R1); `over` replaces any field. */
  const record = (c: StaffClient, w: MemorialWorld, shownSubmissionId: string, over: object = {}) =>
    c.inject({
      method: 'POST',
      url: `${base(w)}/drives/${w.poolId}/requests`,
      payload: { calledBack: true, firstContactAt: new Date(Date.now() - 3600_000).toISOString(), shownSubmissionId, ...over },
    });
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
    expect((await record(op, w, id, { calledBack: false, firstContactAt: new Date().toISOString() })).statusCode).toBe(400);
    const future = await record(op, w, id, { firstContactAt: new Date(Date.now() + 3600_000).toISOString() });
    expect(future.statusCode).toBe(400);
    expect(code(future)).toBe('memorial_takedown.first_contact_out_of_range');
    expect((await record(op, w, id, { firstContactAt: new Date(Date.now() - 8 * 86_400_000).toISOString() })).statusCode).toBe(400);
    expect((await record(op, w, id, { firstContactAt: new Date().toISOString(), note: 'why they asked' })).statusCode).toBe(400);
    const first = new Date(Date.now() - 2 * 3600_000);
    const rec = await record(op, w, id, { firstContactAt: first.toISOString() });
    expect(rec.statusCode, rec.body).toBe(201);
    const requestId = (rec.json() as { requestId: string }).requestId;
    expect(new Date((rec.json() as { dueAt: string }).dueAt).getTime() - first.getTime()).toBe(7 * 86_400_000);
    const second = await record(op, w, id);
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
    const { w, id, panel } = await approved({ omit: true });
    const op = await h.staff(w.pariwarId, 'helpline_operator', 'Helpline Operator');
    const requestId = ((await record(op, w, id)).json() as { requestId: string }).requestId;
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
    const r = await record(op, w, id);
    expect(r.statusCode).toBe(404);
    expect(code(r)).toBe('memorial_takedown.not_found');
    const unknown = await decide(op, w, '00000000-0000-4000-8000-000000000000', 'kept');
    expect(unknown.statusCode).toBe(404);
    expect(code(unknown)).toBe('memorial_takedown.not_found');
  });

  /** Erase the deceased the way the RTBF path does: the anonymising write AND the `anonymized` state projection (one scope tx). */
  async function erase(w: MemorialWorld): Promise<void> {
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
  }

  it('⭐ AC13 / Trap 4 — an ERASED member\'s memorial is ⛔ not listed, its drive view and its request are the neutral 404', async () => {
    const { w, id } = await approved();
    const op = await h.staff(w.pariwarId, 'helpline_operator', 'Helpline Operator');
    expect((await op.inject({ method: 'GET', url: `${base(w)}/drives/${w.poolId}` })).statusCode).toBe(200);
    await erase(w);
    expect((await op.inject({ method: 'GET', url: `${base(w)}/members/${w.memberId}/drives` })).json()).toEqual({ drives: [] });
    const view = await op.inject({ method: 'GET', url: `${base(w)}/drives/${w.poolId}` });
    expect(view.statusCode).toBe(404);
    expect(code(view)).toBe('memorial_takedown.not_found');
    expect((await record(op, w, id)).statusCode).toBe(404);
  });

  it('⭐ R15 / AC13 — a request OPEN when its deceased is erased leaves the open list (it is moot: the memorial left the page); a live family\'s request beside it stays', async () => {
    const gone = await approved();
    const live = await approved({ intoPariwar: gone.w.pariwarId });
    const op = await h.staff(gone.w.pariwarId, 'helpline_operator', 'Helpline Operator');
    const requestIdOf = async (x: { w: MemorialWorld; id: string }): Promise<string> => {
      const r = await record(op, x.w, x.id);
      expect(r.statusCode, r.body).toBe(201);
      return (r.json() as { requestId: string }).requestId;
    };
    const goneRequest = await requestIdOf(gone);
    const liveRequest = await requestIdOf(live);
    const listed = async (): Promise<string[]> =>
      ((await op.inject({ method: 'GET', url: `${base(gone.w)}/requests?open=true` })).json() as { requests: { requestId: string }[] }).requests.map((r) => r.requestId).sort();
    // The control: BEFORE the erasure both are on the list — so what leaves it below is the erasure's doing.
    expect(await listed()).toEqual([goneRequest, liveRequest].sort());
    await erase(gone.w);
    expect(await listed()).toEqual([liveRequest]);
  });

  it('⭐ R1 / MP8 (c) — the call-back is bound to the version the operator was LOOKING AT: one approved since is 409 shown_changed, ⛔ no row, ⛔ no success audit; the version now shown records', async () => {
    const { w, id, panel } = await approved({ omit: true });
    const op = await h.staff(w.pariwarId, 'helpline_operator', 'Helpline Operator');
    // The drive response CARRIES the value the record echoes back — `shown.submissionId`.
    const view = (await op.inject({ method: 'GET', url: `${base(w)}/drives/${w.poolId}` })).json() as { shown: { submissionId: string } };
    expect(view.shown.submissionId).toBe(id);
    // Before the operator records, the (current) nominee sends v2 and the Trust approves it — the page now shows v2.
    await handover(t, w);
    const v2 = await send(t, w, sendFields({ body: 'दूसरा संस्करण।' }));
    expect(v2.status, JSON.stringify(v2.body)).toBe(201);
    const v2Id = v2.body.submissionId as string;
    expect((await panel.inject({ method: 'POST', url: `/api/v1/p/${w.pariwarId}/memorial-reviews/${v2Id}/decision`, payload: { action: 'approved' } })).statusCode).toBe(200);

    const stale = await record(op, w, view.shown.submissionId);
    expect(stale.statusCode, stale.body).toBe(409);
    expect(code(stale)).toBe('memorial_takedown.shown_changed');
    expect((await rows(t, `SELECT 1 FROM memorial_takedown_requests WHERE pool_id = $1`, [w.poolId]))).toEqual([]);
    // ADR-0030: the refused attempt leaves its intent line AND the compensating `_rolled_back` line — and no line without one (⛔ no success).
    const lines = async () =>
      Object.fromEntries(
        (await rows<{ action: string; n: string }>(t, `SELECT action, count(*)::text AS n FROM audit_log_entries WHERE pariwar_id = $1 AND action LIKE 'memorial.takedown.request_record%' GROUP BY action`, [w.pariwarId])).map((r) => [r.action, r.n]),
      );
    expect(await lines()).toEqual({ 'memorial.takedown.request_record': '1', 'memorial.takedown.request_record_rolled_back': '1' });

    // The body names the version: absent or not a UUID is a 400 (⛔ a quiet pass).
    expect((await record(op, w, v2Id, { shownSubmissionId: undefined })).statusCode).toBe(400);
    expect((await record(op, w, v2Id, { shownSubmissionId: 'not-a-uuid' })).statusCode).toBe(400);

    // Looking at v2 now: recorded against v2 and v2's nominee.
    const ok = await record(op, w, v2Id);
    expect(ok.statusCode, ok.body).toBe(201);
    const [row] = await rows<{ submission_id: string; nominee_matches: boolean }>(
      t,
      `SELECT r.submission_id, (r.handover_nominee_ref = s.handover_nominee_ref) AS nominee_matches
         FROM memorial_takedown_requests r JOIN memorial_submissions s ON s.submission_id = r.submission_id WHERE r.request_id = $1`,
      [(ok.json() as { requestId: string }).requestId],
    );
    expect(row).toEqual({ submission_id: v2Id, nominee_matches: true });
  });

  it('the `Idempotency-Key` replays a request record (⛔ no second request, ⛔ no 409)', async () => {
    const { w, id } = await approved();
    const op = await h.staff(w.pariwarId, 'helpline_operator', 'Helpline Operator');
    const payload = { calledBack: true, firstContactAt: new Date(Date.now() - 60_000).toISOString(), shownSubmissionId: id };
    const headers = { 'idempotency-key': `rec-${w.poolId}` };
    const a = await op.inject({ method: 'POST', url: `${base(w)}/drives/${w.poolId}/requests`, payload, headers });
    const b = await op.inject({ method: 'POST', url: `${base(w)}/drives/${w.poolId}/requests`, payload, headers });
    expect(a.statusCode, a.body).toBe(201);
    expect(b.statusCode, b.body).toBe(201);
    expect(b.json()).toEqual(a.json());
    const n = await rows<{ n: string }>(t, `SELECT count(*)::text AS n FROM memorial_takedown_requests WHERE pool_id = $1`, [w.poolId]);
    expect(n[0]!.n).toBe('1');
  });

  it('the `Idempotency-Key` replays a DECISION (⛔ no second outcome, ⛔ no 409 already_decided, ⛔ a second set of withdrawals) — the same call without the key IS the 409', async () => {
    const { w, id } = await approved({ omit: true });
    const op = await h.staff(w.pariwarId, 'helpline_operator', 'Helpline Operator');
    const requestId = ((await record(op, w, id)).json() as { requestId: string }).requestId;
    await elevate(op);
    const url = `${base(w)}/requests/${requestId}/outcome`;
    const headers = { 'idempotency-key': `dec-${requestId}` };
    const a = await op.inject({ method: 'POST', url, payload: { outcome: 'taken_down' }, headers });
    const b = await op.inject({ method: 'POST', url, payload: { outcome: 'taken_down' }, headers });
    expect(a.statusCode, a.body).toBe(200);
    expect(b.statusCode, b.body).toBe(200);
    expect(b.json()).toEqual(a.json());
    const bare = await decide(op, w, requestId, 'taken_down');
    expect(bare.statusCode).toBe(409);
    expect(code(bare)).toBe('memorial_takedown.already_decided');
    const [n] = await rows<{ outcomes: string; withdrawals: string }>(
      t,
      `SELECT (SELECT count(*) FROM memorial_takedown_outcomes WHERE request_id = $1)::text AS outcomes,
              (SELECT count(*) FROM memorial_withdrawals WHERE takedown_request_id = $1)::text AS withdrawals`,
      [requestId],
    );
    expect(n).toEqual({ outcomes: '1', withdrawals: '1' });
  });

  /** The database's own clock — the app clock below is set RELATIVE to it, so a drifting container clock cannot move a boundary. */
  const dbNow = async (): Promise<number> => (await rows<{ n: Date }>(t, `SELECT clock_timestamp() AS n`, []))[0]!.n.getTime();
  const WEEK_MS = 7 * 86_400_000;
  /** How far the app clock is set from the database's: 0187's CHECK (against the DB clock) is then looser than the handler's bound by this much. */
  const MARGIN_MS = 30_000;

  it('⭐ MP14 (b) — the 7-day window to the MILLISECOND: exactly 7 days ago and exactly now are admitted; one millisecond beyond either is 400 first_contact_out_of_range', async () => {
    const { w, id } = await approved();
    const op = await h.staff(w.pariwarId, 'helpline_operator', 'Helpline Operator');
    const outOfRange = async (at: number): Promise<void> => {
      const r = await record(op, w, id, { firstContactAt: new Date(at).toISOString() });
      expect(r.statusCode, `${at}: ${r.body}`).toBe(400);
      expect(code(r)).toBe('memorial_takedown.first_contact_out_of_range');
      expect(await rows(t, `SELECT 1 FROM memorial_takedown_requests WHERE pool_id = $1 AND first_contact_at = $2`, [w.poolId, new Date(at)])).toEqual([]);
    };
    // Admitted: recorded at exactly `at`, then closed (`kept` — no step-up) so the next leg may record (one open request per drive).
    const admitted = async (at: number): Promise<void> => {
      const r = await record(op, w, id, { firstContactAt: new Date(at).toISOString() });
      expect(r.statusCode, `${at}: ${r.body}`).toBe(201);
      const [row] = await rows<{ first_contact_at: Date }>(t, `SELECT first_contact_at FROM memorial_takedown_requests WHERE request_id = $1`, [(r.json() as { requestId: string }).requestId]);
      expect(row!.first_contact_at.getTime()).toBe(at);
      expect((await decide(op, w, (r.json() as { requestId: string }).requestId, 'kept')).statusCode).toBe(200);
    };
    try {
      // LOWER edge — the app clock LEADS the database's, so the handler's own bound is the one that decides.
      clockMs = (await dbNow()) + MARGIN_MS;
      const lead = clockMs;
      await outOfRange(lead - WEEK_MS - 1);
      await admitted(lead - WEEK_MS);
      await admitted(lead - WEEK_MS + 1);
      // UPPER edge — the app clock LAGS the database's: "exactly now" is then in the past for the CHECK too.
      clockMs = (await dbNow()) - MARGIN_MS;
      const lag = clockMs;
      await admitted(lag);
      await outOfRange(lag + 1);
    } finally {
      clockMs = null;
    }
  });

  it('⭐ R16 — a RETRY (same Idempotency-Key) of a request that was recorded returns the STORED 201 even once its first contact has aged out of the 7 days; without the key the same body is the 400', async () => {
    const { w, id } = await approved();
    const op = await h.staff(w.pariwarId, 'helpline_operator', 'Helpline Operator');
    const url = `${base(w)}/drives/${w.poolId}/requests`;
    try {
      clockMs = (await dbNow()) + MARGIN_MS;
      // 5 s INSIDE the window at the first call…
      const payload = { calledBack: true, firstContactAt: new Date(clockMs - WEEK_MS + 5_000).toISOString(), shownSubmissionId: id };
      const headers = { 'idempotency-key': `aged-${w.poolId}` };
      const first = await op.inject({ method: 'POST', url, payload, headers });
      expect(first.statusCode, first.body).toBe(201);
      // …and 5 s OUTSIDE it by the retry.
      clockMs += 10_000;
      const retry = await op.inject({ method: 'POST', url, payload, headers });
      expect(retry.statusCode, retry.body).toBe(201);
      expect(retry.json()).toEqual(first.json());
      // The control: the window HAS closed on this body — a call that is ⛔ a replay is refused.
      const fresh = await op.inject({ method: 'POST', url, payload });
      expect(fresh.statusCode, fresh.body).toBe(400);
      expect(code(fresh)).toBe('memorial_takedown.first_contact_out_of_range');
    } finally {
      clockMs = null;
    }
    const n = await rows<{ n: string }>(t, `SELECT count(*)::text AS n FROM memorial_takedown_requests WHERE pool_id = $1`, [w.poolId]);
    expect(n[0]!.n).toBe('1');
  });

  // ── R5 — the drive view's PHOTO and ALT branch (AC6) ─────────────────────────────────────────────────────────────────────

  const ALT = 'Maa at the old house, with Ramesh the cheat, in 1990.';
  const ALT_CUT = ' with Ramesh the cheat,';

  /** A version with a PHOTO and its alt text, the Trust's `decision` applied (the photo and an alt-text cut cannot be left out together). */
  async function approvedWithPhoto(decision: (altStart: number) => object): Promise<{ w: MemorialWorld; id: string; photoKey: string }> {
    const w = await seedMemorialWorld(t);
    await handover(t, w);
    const r = await send(t, w, [
      ...sendFields({ body: BODY, altText: ALT }),
      { kind: 'file', name: 'photo', filename: 'maa.jpg', contentType: 'image/jpeg', bytes: jpegWithGps() },
    ]);
    expect(r.status, JSON.stringify(r.body)).toBe(201);
    const id = r.body.submissionId as string;
    const panel = await h.staff(w.pariwarId, 'trustee_panel');
    const d = await panel.inject({ method: 'POST', url: `/api/v1/p/${w.pariwarId}/memorial-reviews/${id}/decision`, payload: decision(ALT.indexOf(ALT_CUT)) });
    expect(d.statusCode, d.body).toBe(200);
    const [row] = await rows<{ photo_object_key: string }>(t, `SELECT photo_object_key FROM memorial_submissions WHERE submission_id = $1`, [id]);
    return { w, id, photoKey: row!.photo_object_key };
  }

  const photoUrlLines = (before: number) => t.auditSink.events.slice(before).filter((e) => e.type === 'memorial.photo.url');

  it('⭐ R5 / AC6 — a photo the Trust KEPT: the 5-minute signed URL for THAT version\'s object, one `memorial.photo.url` line (`viewer: helpline`), and the alt text cut-and-joined like the page\'s', async () => {
    const start = BODY.indexOf(LEFT_OUT);
    const { w, id, photoKey } = await approvedWithPhoto((altStart) => ({
      action: 'approved_with_omissions',
      omissions: [
        { field: 'body', start, end: start + LEFT_OUT.length, reason: 'attacks_someone_named' },
        { field: 'altText', start: altStart, end: altStart + ALT_CUT.length, reason: 'identifies_a_child' },
      ],
    }));
    const op = await h.staff(w.pariwarId, 'helpline_operator', 'Helpline Operator');
    const before = t.auditSink.events.length;
    const view = await op.inject({ method: 'GET', url: `${base(w)}/drives/${w.poolId}` });
    expect(view.statusCode, view.body).toBe(200);
    const shown = (view.json() as { shown: { submissionId: string; words: string[]; hasPhoto: boolean; photoUrl: string | null; altText: string | null; kinship: unknown } }).shown;
    expect(shown.submissionId).toBe(id);
    expect(shown.hasPhoto).toBe(true);
    // The URL is the storage port's for THIS object at the 5-minute TTL (AC6) — ⛔ another version's, ⛔ another lifetime.
    expect(shown.photoUrl).toBe(await t.memorialPhotoStorage.signedReadUrl(photoKey, 300));
    expect(shown.words).toEqual(['माँ हमेशा मुस्कुराती थीं। वे सबकी मदद करती थीं।']);
    // The cut and the join: the removed stretch and the space beside it go, ONE space joins the two sides.
    expect(shown.altText).toBe('Maa at the old house, in 1990.');
    expect(view.body).not.toContain('Ramesh');
    const lines = photoUrlLines(before);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ type: 'memorial.photo.url', context: { submission_id: id, viewer: 'helpline' } });
    expect(t.auditSink.events.slice(before).filter((e) => e.type === 'memorial.takedown.read')).toHaveLength(1);

    // PARITY: the operator reads "the words as the page shows them". The drive view and the page both call `publicMemorialText` (review
    // R5 removed the drive view's own copy), so this checks the WIRING — that each hands it the same body, alt text and cuts — on a cut
    // body AND a cut alt text. It cannot see a drift inside the shared function; that is `memorial-public-text.test.ts`'s.
    const [pool] = await rows<{ public_token: string }>(t, `SELECT public_token FROM pools WHERE pool_id = $1`, [w.poolId]);
    const page = await t.app.inject({ method: 'GET', url: `/api/v1/p/${w.pariwarId}/public-pages/sahyog-vivran/${pool!.public_token}` });
    expect(page.statusCode, page.body).toBe(200);
    expect((page.json() as { drive: { familyMemorial: unknown } }).drive.familyMemorial).toEqual({
      words: shown.words,
      photo: { altText: shown.altText },
      // Story 11b.5a (KL11) — the SAME list rows on both (this version has ⛔ no list).
      kinship: shown.kinship,
    });
    expect(shown.kinship).toEqual([]);
  });

  it('⭐ R5 / AC6 — a photo the Trust LEFT OUT: ⛔ no URL, ⛔ no alt text, ⛔ no storage call, ⛔ no `memorial.photo.url` line; the words and the one read line stay', async () => {
    const { w, id } = await approvedWithPhoto(() => ({ action: 'approved_with_omissions', photoLeftOut: { reason: 'identifies_a_child' } }));
    const op = await h.staff(w.pariwarId, 'helpline_operator', 'Helpline Operator');
    const signed = vi.spyOn(t.memorialPhotoStorage, 'signedReadUrl');
    try {
      const before = t.auditSink.events.length;
      const view = await op.inject({ method: 'GET', url: `${base(w)}/drives/${w.poolId}` });
      expect(view.statusCode, view.body).toBe(200);
      const shown = (view.json() as { shown: { submissionId: string; words: string[]; hasPhoto: boolean; photoUrl: string | null; altText: string | null; kinship: unknown } }).shown;
      expect(shown).toMatchObject({ submissionId: id, words: [BODY], hasPhoto: false, photoUrl: null, altText: null });
      expect(view.body).not.toContain('Ramesh the cheat');
      expect(signed).not.toHaveBeenCalled();
      expect(photoUrlLines(before)).toEqual([]);
      expect(t.auditSink.events.slice(before).filter((e) => e.type === 'memorial.takedown.read')).toHaveLength(1);
    } finally {
      signed.mockRestore();
    }
  });

  it('R5 / AC6 — a storage failure while signing the URL leaves `photoUrl` null (the view still answers) and records NO `memorial.photo.url` line — the audit follows the act', async () => {
    const { w } = await approvedWithPhoto(() => ({ action: 'approved' }));
    const op = await h.staff(w.pariwarId, 'helpline_operator', 'Helpline Operator');
    const signed = vi.spyOn(t.memorialPhotoStorage, 'signedReadUrl').mockRejectedValueOnce(new Error('storage down'));
    try {
      const before = t.auditSink.events.length;
      const view = await op.inject({ method: 'GET', url: `${base(w)}/drives/${w.poolId}` });
      expect(view.statusCode, view.body).toBe(200);
      expect((view.json() as { shown: Json }).shown).toMatchObject({ hasPhoto: true, photoUrl: null, altText: ALT });
      expect(signed).toHaveBeenCalledTimes(1);
      expect(photoUrlLines(before)).toEqual([]);
    } finally {
      signed.mockRestore();
    }
  });

  // ── RT3 — Trap 18's shapes, where a HEAD-ONLY rule gives the wrong answer, through the member GET and the review detail ──────────

  /** v1 approved with a part left out, the elevated operator, and helpers to grow the chain through the REAL Send / review / withdraw. */
  async function chainWorld() {
    const { w, id: v1, panel } = await approved({ omit: true });
    const op = await h.staff(w.pariwarId, 'helpline_operator', 'Helpline Operator');
    await elevate(op);
    const sendNext = async (body: string): Promise<string> => {
      await handover(t, w);
      const r = await send(t, w, sendFields({ body }));
      expect(r.status, JSON.stringify(r.body)).toBe(201);
      return r.body.submissionId as string;
    };
    const approve = async (id: string) =>
      expect((await panel.inject({ method: 'POST', url: `/api/v1/p/${w.pariwarId}/memorial-reviews/${id}/decision`, payload: { action: 'approved' } })).statusCode).toBe(200);
    const trustWithdraw = async (id: string) =>
      expect(
        (await panel.inject({ method: 'POST', url: `/api/v1/p/${w.pariwarId}/memorial-reviews/${id}/withdraw-approval`, payload: { reasonCode: 'against_the_law' } })).statusCode,
      ).toBe(200);
    const takeDown = async () => {
      const rec = await record(op, w, v1);
      expect(rec.statusCode, rec.body).toBe(201);
      const out = await decide(op, w, (rec.json() as { requestId: string }).requestId, 'taken_down');
      expect(out.statusCode, out.body).toBe(200);
    };
    const mine = async () => (await memberInject(t, 'GET', '/api/v1/member/memorial', { token: w.token })).body.memorial as Json;
    return { w, v1, panel, sendNext, approve, trustWithdraw, takeDown, mine };
  }

  it('RT3 / Trap 18 — `[A-omit, A(T)]` → take-down → `[H, T]`: the family reads `taken_down` with ⛔ no Trust reason beside it (the head carries the Trust\'s withdrawal)', async () => {
    const c = await chainWorld();
    const v2 = await c.sendNext('दूसरा संस्करण।');
    await c.approve(v2);
    await c.trustWithdraw(v2);
    await c.takeDown();
    expect(await c.mine()).toMatchObject({ memorialState: 'taken_down', reasonCode: null, earlierApprovalWithdrawn: null, earlierApprovalStands: false });
  });

  it('RT3 / Trap 18 — `[A-omit, A(T), pending]` → take-down → `[H, T, H]`: ⛔ no "an earlier approval was withdrawn" with the Trust\'s reason', async () => {
    const c = await chainWorld();
    const v2 = await c.sendNext('दूसरा संस्करण।');
    await c.approve(v2);
    await c.trustWithdraw(v2);
    await c.sendNext('तीसरा संस्करण।');
    await c.takeDown();
    expect(await c.mine()).toMatchObject({ memorialState: 'taken_down', reasonCode: null, earlierApprovalWithdrawn: null, earlierApprovalStands: false });
  });

  it('RT3 / Task 3.4 — `[A-omit, family-withdrawn]` → take-down → `[H, F]`: the review detail says `taken_down` (a head-only rule says `withdrawn`)', async () => {
    const c = await chainWorld();
    const v2 = await c.sendNext('दूसरा संस्करण।');
    const wd = await memberInject(t, 'POST', `/api/v1/member/memorial/submissions/${v2}/withdraw`, { payload: {}, token: c.w.token });
    expect(wd.status, JSON.stringify(wd.body)).toBe(200);
    await c.takeDown();
    for (const id of [c.v1, v2]) {
      const detail = await c.panel.inject({ method: 'GET', url: `/api/v1/p/${c.w.pariwarId}/memorial-reviews/${id}` });
      expect(detail.statusCode, detail.body).toBe(200);
      expect((detail.json() as { memorialState: string }).memorialState).toBe('taken_down');
    }
    expect((await c.mine()).memorialState).toBe('taken_down');
  });
});
